import { SocksProxyAgent } from "socks-proxy-agent";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { URL } from "node:url";

export type ProxyVia = "tor" | "i2p" | "none";

const PROXY_URLS: Record<Exclude<ProxyVia, "none">, string> = {
  tor: "socks5h://127.0.0.1:9050",
  i2p: "socks5h://127.0.0.1:4447",
};

const agentCache = new Map<string, SocksProxyAgent>();

export function getAgentFor(via: ProxyVia) {
  if (via === "none") return undefined;
  const url = PROXY_URLS[via];
  let a = agentCache.get(url);
  if (!a) {
    a = new SocksProxyAgent(url, { keepAlive: true, timeout: 30_000 });
    agentCache.set(url, a);
  }
  return a;
}

export interface ProxyResponse {
  status: number;
  headers: Record<string, string | string[]>;
  body: Buffer;
  finalUrl: string;
}

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 45_000;
const MAX_BYTES = 12 * 1024 * 1024;

export async function proxyFetch(
  rawUrl: string,
  via: ProxyVia,
  redirectsLeft = MAX_REDIRECTS,
): Promise<ProxyResponse> {
  return new Promise((resolve, reject) => {
    let target: URL;
    try {
      target = new URL(rawUrl);
    } catch {
      return reject(new Error(`invalid URL: ${rawUrl}`));
    }
    if (!/^https?:$/.test(target.protocol)) {
      return reject(new Error(`unsupported protocol: ${target.protocol}`));
    }

    const isHttps = target.protocol === "https:";
    const agent = getAgentFor(via);
    const reqFn = isHttps ? httpsRequest : httpRequest;

    const req = reqFn(
      target,
      {
        method: "GET",
        agent,
        timeout: TIMEOUT_MS,
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; rv:128.0) Gecko/20100101 Firefox/128.0",
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.5",
          "accept-encoding": "identity",
          dnt: "1",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (
          [301, 302, 303, 307, 308].includes(status) &&
          res.headers.location
        ) {
          if (redirectsLeft <= 0) {
            return reject(new Error("too many redirects"));
          }
          res.resume();
          const next = new URL(res.headers.location, target).toString();
          proxyFetch(next, via, redirectsLeft - 1).then(resolve, reject);
          return;
        }
        const chunks: Buffer[] = [];
        let total = 0;
        res.on("data", (c: Buffer) => {
          total += c.length;
          if (total > MAX_BYTES) {
            req.destroy(new Error("response too large"));
            return;
          }
          chunks.push(c);
        });
        res.on("end", () => {
          resolve({
            status,
            headers: res.headers as Record<string, string | string[]>,
            body: Buffer.concat(chunks),
            finalUrl: target.toString(),
          });
        });
        res.on("error", reject);
      },
    );

    req.on("timeout", () => req.destroy(new Error("request timeout")));
    req.on("error", reject);
    req.end();
  });
}
