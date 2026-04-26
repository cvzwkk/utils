import { Router, type IRouter, type Request, type Response } from "express";
import * as cheerio from "cheerio";
import { proxyFetch, type ProxyVia } from "../lib/proxyClient";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const VALID_VIA: ProxyVia[] = ["tor", "i2p", "none"];

function pickVia(q: unknown): ProxyVia {
  const s = String(q ?? "none").toLowerCase();
  return (VALID_VIA as string[]).includes(s) ? (s as ProxyVia) : "none";
}

function buildProxiedUrl(target: string, via: ProxyVia): string {
  return `/api/proxy/page?via=${via}&url=${encodeURIComponent(target)}`;
}

function buildAssetUrl(target: string, via: ProxyVia): string {
  return `/api/proxy/asset?via=${via}&url=${encodeURIComponent(target)}`;
}

function rewriteHtml(html: string, baseUrl: string, via: ProxyVia): string {
  const $ = cheerio.load(html, { decodeEntities: false });

  // Remove framing-blocking metas
  $('meta[http-equiv="Content-Security-Policy"]').remove();
  $('meta[http-equiv="X-Frame-Options"]').remove();
  $('meta[http-equiv="refresh"]').remove();

  // Inject base for relative URLs
  $("head").prepend(`<base href="${baseUrl}">`);

  const rewriteAttr = (sel: string, attr: string, asAsset = false) => {
    $(sel).each((_, el) => {
      const v = $(el).attr(attr);
      if (!v) return;
      try {
        const abs = new URL(v, baseUrl).toString();
        if (!/^https?:/.test(abs)) return;
        $(el).attr(
          attr,
          asAsset ? buildAssetUrl(abs, via) : buildProxiedUrl(abs, via),
        );
      } catch {
        /* ignore */
      }
    });
  };

  rewriteAttr("a[href]", "href", false);
  rewriteAttr("form[action]", "action", false);
  rewriteAttr("link[href]", "href", true);
  rewriteAttr("script[src]", "src", true);
  rewriteAttr("img[src]", "src", true);
  rewriteAttr("source[src]", "src", true);
  rewriteAttr("video[src]", "src", true);
  rewriteAttr("audio[src]", "src", true);
  rewriteAttr("iframe[src]", "src", false);

  // Also handle srcset on img/source (just take first url)
  $("img[srcset], source[srcset]").each((_, el) => {
    const v = $(el).attr("srcset");
    if (!v) return;
    const rewritten = v
      .split(",")
      .map((part) => {
        const seg = part.trim().split(/\s+/);
        const u = seg[0];
        try {
          const abs = new URL(u, baseUrl).toString();
          seg[0] = buildAssetUrl(abs, via);
        } catch {
          /* ignore */
        }
        return seg.join(" ");
      })
      .join(", ");
    $(el).attr("srcset", rewritten);
  });

  // Force target=_self so links open inside iframe
  $("a[target]").attr("target", "_self");

  // Inject a small banner so user knows traffic is proxied
  const banner = `
<div id="__vanta_banner" style="position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#000;color:#0fffc1;font-family:monospace;font-size:11px;padding:4px 10px;border-bottom:1px solid #0fffc1;display:flex;justify-content:space-between;align-items:center;pointer-events:none">
  <span>VANTA · routed via <b style="color:#fff">${via.toUpperCase()}</b> SOCKS proxy</span>
  <span style="opacity:.6">${new URL(baseUrl).host}</span>
</div>
<style>body{padding-top:24px !important}</style>`;
  $("body").prepend(banner);

  return $.html();
}

const FORWARDABLE_RES_HEADERS = new Set([
  "content-type",
  "cache-control",
  "etag",
  "last-modified",
  "expires",
]);

function copyAssetHeaders(res: Response, headers: Record<string, string | string[]>) {
  for (const [k, v] of Object.entries(headers)) {
    if (FORWARDABLE_RES_HEADERS.has(k.toLowerCase()) && v !== undefined) {
      res.setHeader(k, Array.isArray(v) ? v.join(", ") : v);
    }
  }
}

router.get("/proxy/page", async (req: Request, res: Response) => {
  const url = String(req.query["url"] ?? "");
  const via = pickVia(req.query["via"]);
  if (!url) return res.status(400).send("missing url");

  try {
    const r = await proxyFetch(url, via);
    const ct = (r.headers["content-type"] as string) || "text/html";
    if (ct.includes("text/html") || ct.includes("application/xhtml")) {
      const html = rewriteHtml(r.body.toString("utf8"), r.finalUrl, via);
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.setHeader("x-vanta-via", via);
      res.setHeader("x-vanta-final-url", r.finalUrl);
      // Strip framing protection - we ARE the frame
      res.removeHeader("x-frame-options");
      res.removeHeader("content-security-policy");
      return res.status(r.status).send(html);
    }
    // Non-html: stream as-is
    copyAssetHeaders(res, r.headers);
    res.status(r.status).send(r.body);
  } catch (e) {
    logger.warn({ url, via, err: (e as Error).message }, "proxy/page error");
    res.status(502).type("html").send(renderErrorPage(url, via, e as Error));
  }
});

router.get("/proxy/asset", async (req: Request, res: Response) => {
  const url = String(req.query["url"] ?? "");
  const via = pickVia(req.query["via"]);
  if (!url) return res.status(400).send("missing url");
  try {
    const r = await proxyFetch(url, via);
    copyAssetHeaders(res, r.headers);
    // CSS may contain url(...) refs — also rewrite
    const ct = (r.headers["content-type"] as string) || "";
    if (ct.includes("text/css")) {
      const css = r.body.toString("utf8").replace(
        /url\((['"]?)([^'")]+)\1\)/g,
        (_m, q, u) => {
          try {
            const abs = new URL(u, r.finalUrl).toString();
            if (!/^https?:/.test(abs)) return `url(${q}${u}${q})`;
            return `url(${q}${buildAssetUrl(abs, via)}${q})`;
          } catch {
            return `url(${q}${u}${q})`;
          }
        },
      );
      return res.status(r.status).send(css);
    }
    res.status(r.status).send(r.body);
  } catch (e) {
    logger.warn({ url, via, err: (e as Error).message }, "proxy/asset error");
    res.status(502).send("proxy fetch failed");
  }
});

function renderErrorPage(url: string, via: ProxyVia, err: Error): string {
  const safeUrl = String(url).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
  const safeMsg = err.message.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Proxy error</title>
<style>body{background:#0a0a0f;color:#0fffc1;font-family:ui-monospace,monospace;padding:32px;margin:0}
h1{color:#ff4d6d;margin:0 0 16px;font-size:18px;letter-spacing:2px}
p{color:#aaa;line-height:1.5;margin:8px 0}
code{background:#000;color:#fff;padding:2px 6px;border:1px solid #333;border-radius:3px}
.box{border:1px solid #ff4d6d44;background:#ff4d6d10;padding:16px;border-radius:6px;max-width:680px}
.hint{margin-top:24px;color:#0fffc1;font-size:12px}</style></head>
<body><div class="box"><h1>// PROXY FETCH FAILED</h1>
<p>Could not fetch <code>${safeUrl}</code> via <code>${via}</code>.</p>
<p>Reason: <code>${safeMsg}</code></p></div>
<p class="hint">If <b>${via.toUpperCase()}</b> is not RUNNING, start it on the Networks panel. Tor/I2P bootstraps may take a minute on first launch. .onion / .i2p domains require Tor or I2P to be reachable.</p>
</body></html>`;
}

export default router;
