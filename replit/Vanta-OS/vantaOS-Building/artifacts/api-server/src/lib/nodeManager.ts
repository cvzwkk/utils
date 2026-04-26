import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { createConnection } from "node:net";
import { logger } from "./logger";

export type NodeName = "tor" | "i2pd" | "yggdrasil" | "freenet";
export type NodeStatus = "STOPPED" | "STARTING" | "RUNNING" | "FAILED";

interface NodeRecord {
  name: NodeName;
  status: NodeStatus;
  pid: number | null;
  startedAt: number | null;
  exitCode: number | null;
  exitSignal: string | null;
  error: string | null;
  logTail: string[];
  ports: Record<string, number>;
  proc: ChildProcess | null;
}

const ROOT = "/tmp/vanta-nodes";
const MAX_LOG_LINES = 200;

const NODES: Record<NodeName, NodeRecord> = {
  tor: emptyRecord("tor", { socks: 9050, control: 9051 }),
  i2pd: emptyRecord("i2pd", { http: 7070, httpProxy: 4444, socksProxy: 4447 }),
  yggdrasil: emptyRecord("yggdrasil", { admin: 9001 }),
  freenet: emptyRecord("freenet", { web: 8888 }),
};

function emptyRecord(name: NodeName, ports: Record<string, number>): NodeRecord {
  return {
    name,
    status: "STOPPED",
    pid: null,
    startedAt: null,
    exitCode: null,
    exitSignal: null,
    error: null,
    logTail: [],
    ports,
    proc: null,
  };
}

function ensureDir(p: string) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function appendLog(rec: NodeRecord, line: string) {
  const lines = line.split(/\r?\n/).filter(Boolean);
  rec.logTail.push(...lines);
  if (rec.logTail.length > MAX_LOG_LINES) {
    rec.logTail = rec.logTail.slice(-MAX_LOG_LINES);
  }
}

function tcpProbe(port: number, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = createConnection({ host: "127.0.0.1", port });
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      sock.destroy();
      resolve(ok);
    };
    sock.setTimeout(timeoutMs);
    sock.once("connect", () => finish(true));
    sock.once("error", () => finish(false));
    sock.once("timeout", () => finish(false));
  });
}

function writeTorConfig() {
  const dir = `${ROOT}/tor`;
  ensureDir(`${dir}/data`);
  writeFileSync(
    `${dir}/torrc`,
    [
      `SocksPort 127.0.0.1:9050`,
      `ControlPort 127.0.0.1:9051`,
      `CookieAuthentication 1`,
      `DataDirectory ${dir}/data`,
      `Log notice stdout`,
      `AvoidDiskWrites 1`,
      `ClientOnly 1`,
      `ExitRelay 0`,
    ].join("\n"),
  );
  return `${dir}/torrc`;
}

function writeI2pdConfig() {
  const dir = `${ROOT}/i2pd`;
  ensureDir(dir);
  writeFileSync(
    `${dir}/i2pd.conf`,
    [
      `log = stdout`,
      `loglevel = warn`,
      `ipv4 = true`,
      `ipv6 = false`,
      `notransit = true`,
      `floodfill = false`,
      `bandwidth = L`,
      ``,
      `[http]`,
      `enabled = true`,
      `address = 127.0.0.1`,
      `port = 7070`,
      `auth = false`,
      ``,
      `[httpproxy]`,
      `enabled = true`,
      `address = 127.0.0.1`,
      `port = 4444`,
      ``,
      `[socksproxy]`,
      `enabled = true`,
      `address = 127.0.0.1`,
      `port = 4447`,
      ``,
      `[sam]`,
      `enabled = true`,
      `address = 127.0.0.1`,
      `port = 7656`,
    ].join("\n"),
  );
  return `${dir}/i2pd.conf`;
}

function ensureYggdrasilConfig(): string {
  const dir = `${ROOT}/yggdrasil`;
  ensureDir(dir);
  const cfgPath = `${dir}/config.conf`;
  if (!existsSync(cfgPath)) {
    return cfgPath;
  }
  return cfgPath;
}

async function generateYggdrasilConfig(cfgPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("yggdrasil", ["-genconf"]);
    let out = "";
    let err = "";
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("error", reject);
    proc.on("exit", (code) => {
      if (code !== 0) return reject(new Error(err || `yggdrasil -genconf exit ${code}`));
      let cfg = out;
      if (/IfName:/.test(cfg)) {
        cfg = cfg.replace(/IfName:\s*\S+/g, `IfName: none`);
      } else {
        cfg = cfg.replace(/^\{/, `{\n  IfName: none`);
      }
      if (/AdminListen:/.test(cfg)) {
        cfg = cfg.replace(/AdminListen:\s*[^\n]+/g, `AdminListen: tcp://127.0.0.1:9001`);
      } else {
        cfg = cfg.replace(/^\{/, `{\n  AdminListen: tcp://127.0.0.1:9001`);
      }
      writeFileSync(cfgPath, cfg);
      resolve();
    });
  });
}

function ensureFreenetDir() {
  const dir = `${ROOT}/freenet`;
  ensureDir(dir);
  return dir;
}

function attachStreams(rec: NodeRecord, proc: ChildProcess) {
  proc.stdout?.on("data", (d) => appendLog(rec, d.toString()));
  proc.stderr?.on("data", (d) => appendLog(rec, d.toString()));
  proc.on("error", (e) => {
    rec.error = e.message;
    rec.status = "FAILED";
    appendLog(rec, `[error] ${e.message}`);
    logger.error({ name: rec.name, err: e }, "node spawn error");
  });
  proc.on("exit", (code, signal) => {
    rec.exitCode = code;
    rec.exitSignal = signal;
    rec.proc = null;
    rec.pid = null;
    if (rec.status !== "FAILED") {
      rec.status = code === 0 ? "STOPPED" : "FAILED";
    }
    appendLog(rec, `[exit] code=${code} signal=${signal ?? "none"}`);
    logger.info({ name: rec.name, code, signal }, "node exited");
  });
}

async function pollReady(rec: NodeRecord, ports: number[], timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (rec.status === "FAILED" || !rec.proc) return;
    const checks = await Promise.all(ports.map((p) => tcpProbe(p)));
    if (checks.every(Boolean)) {
      rec.status = "RUNNING";
      appendLog(rec, `[ready] ports listening: ${ports.join(",")}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (rec.status === "STARTING" && rec.proc) {
    appendLog(rec, `[warn] ports not yet bound after ${timeoutMs}ms (still booting)`);
  }
}

export async function startNode(name: NodeName): Promise<NodeRecord> {
  const rec = NODES[name];
  if (rec.status === "STARTING" || rec.status === "RUNNING") return publicView(rec);
  ensureDir(ROOT);
  rec.status = "STARTING";
  rec.error = null;
  rec.exitCode = null;
  rec.exitSignal = null;
  rec.logTail = [];
  rec.startedAt = Date.now();

  try {
    let proc: ChildProcess;
    switch (name) {
      case "tor": {
        const cfg = writeTorConfig();
        proc = spawn("tor", ["-f", cfg], { stdio: ["ignore", "pipe", "pipe"] });
        break;
      }
      case "i2pd": {
        const cfg = writeI2pdConfig();
        proc = spawn(
          "i2pd",
          [`--conf=${cfg}`, `--datadir=${ROOT}/i2pd`],
          { stdio: ["ignore", "pipe", "pipe"] },
        );
        break;
      }
      case "yggdrasil": {
        const cfg = ensureYggdrasilConfig();
        if (!existsSync(cfg) || statSync(cfg).size === 0) {
          await generateYggdrasilConfig(cfg);
        }
        proc = spawn("yggdrasil", ["-useconffile", cfg], {
          stdio: ["ignore", "pipe", "pipe"],
        });
        break;
      }
      case "freenet": {
        const dir = ensureFreenetDir();
        proc = spawn("freenet", [], { stdio: ["ignore", "pipe", "pipe"], cwd: dir });
        break;
      }
    }

    rec.proc = proc;
    rec.pid = proc.pid ?? null;
    attachStreams(rec, proc);

    const ports = Object.values(rec.ports);
    pollReady(rec, ports).catch((e) => {
      appendLog(rec, `[poll-error] ${(e as Error).message}`);
    });
  } catch (e) {
    rec.status = "FAILED";
    rec.error = (e as Error).message;
    appendLog(rec, `[error] ${rec.error}`);
  }

  return publicView(rec);
}

export async function stopNode(name: NodeName): Promise<NodeRecord> {
  const rec = NODES[name];
  if (rec.proc) {
    try {
      rec.proc.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, 1500));
      if (rec.proc && !rec.proc.killed) rec.proc.kill("SIGKILL");
    } catch (e) {
      appendLog(rec, `[stop-error] ${(e as Error).message}`);
    }
  }
  rec.proc = null;
  rec.pid = null;
  rec.status = "STOPPED";
  appendLog(rec, `[stop] requested`);
  return publicView(rec);
}

export async function getStatusAll() {
  const result: Record<NodeName, ReturnType<typeof publicView>> = {} as never;
  for (const k of Object.keys(NODES) as NodeName[]) {
    result[k] = publicView(NODES[k]);
  }
  return result;
}

export function publicView(rec: NodeRecord) {
  return {
    name: rec.name,
    status: rec.status,
    pid: rec.pid,
    startedAt: rec.startedAt,
    uptimeMs: rec.startedAt && rec.status === "RUNNING" ? Date.now() - rec.startedAt : 0,
    exitCode: rec.exitCode,
    exitSignal: rec.exitSignal,
    error: rec.error,
    ports: rec.ports,
    logTail: rec.logTail.slice(-40),
  };
}

export function getRecord(name: NodeName) {
  return NODES[name];
}

export async function getDetails(name: NodeName) {
  const rec = NODES[name];
  const base = publicView(rec);
  const portChecks: Record<string, boolean> = {};
  for (const [k, p] of Object.entries(rec.ports)) {
    portChecks[k] = await tcpProbe(p, 400);
  }
  let extra: Record<string, unknown> = {};
  if (name === "tor" && portChecks.control) {
    extra = await readTorBootstrap(rec);
  }
  if (name === "i2pd" && portChecks.http) {
    extra = await readI2pdConsole();
  }
  return { ...base, portChecks, extra };
}

async function readTorBootstrap(rec: NodeRecord): Promise<Record<string, unknown>> {
  try {
    const cookiePath = `${ROOT}/tor/data/control_auth_cookie`;
    if (!existsSync(cookiePath)) return { bootstrap: "no-cookie" };
    const cookieHex = readFileSync(cookiePath).toString("hex").toUpperCase();
    return await new Promise((resolve) => {
      const sock = createConnection({ host: "127.0.0.1", port: 9051 });
      let buf = "";
      sock.setTimeout(2500);
      sock.on("data", (d) => {
        buf += d.toString();
        if (buf.includes("250 OK") && buf.includes("status/bootstrap-phase")) {
          const m = buf.match(/PROGRESS=(\d+)\s+TAG=(\w+)\s+SUMMARY="([^"]+)"/);
          sock.end("QUIT\r\n");
          resolve({
            bootstrapProgress: m ? Number(m[1]) : null,
            bootstrapTag: m?.[2] ?? null,
            bootstrapSummary: m?.[3] ?? null,
          });
        }
      });
      sock.on("error", () => resolve({ bootstrap: "control-error" }));
      sock.on("timeout", () => {
        sock.destroy();
        resolve({ bootstrap: "timeout" });
      });
      sock.on("connect", () => {
        sock.write(`AUTHENTICATE ${cookieHex}\r\nGETINFO status/bootstrap-phase\r\n`);
      });
    });
    void rec;
  } catch (e) {
    return { bootstrap: `error:${(e as Error).message}` };
  }
}

async function readI2pdConsole(): Promise<Record<string, unknown>> {
  try {
    const res = await fetch("http://127.0.0.1:7070/", {
      signal: AbortSignal.timeout(2000),
    });
    const html = await res.text();
    const uptime = html.match(/Uptime:\s*<\/b>([^<]+)/)?.[1]?.trim();
    const tunnels = html.match(/Tunnels created:\s*<\/b>(\d+)/)?.[1];
    const peers = html.match(/Routers:\s*<\/b>(\d+)/)?.[1];
    return { uptime, tunnels, peers };
  } catch {
    return {};
  }
}

process.on("exit", () => {
  for (const rec of Object.values(NODES)) {
    if (rec.proc) {
      try {
        rec.proc.kill("SIGKILL");
      } catch {
        /* noop */
      }
    }
  }
});
