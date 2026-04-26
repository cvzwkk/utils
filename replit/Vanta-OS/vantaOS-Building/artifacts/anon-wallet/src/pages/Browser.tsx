import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNetworksStore } from '@/lib/networks';
import { fetchAllStatus, type NodeStatusItem, type BackendNodeName } from '@/lib/nodesApi';
import { Compass, Search, ArrowLeft, ArrowRight, ExternalLink, ShieldAlert, Lock, Globe, RotateCcw, Activity } from 'lucide-react';

type Via = 'tor' | 'i2p' | 'none';

const QUICK_LINKS: Array<{ name: string; url: string; preferredVia?: Via }> = [
  { name: 'check.torproject.org', url: 'https://check.torproject.org', preferredVia: 'tor' },
  { name: 'DuckDuckGo', url: 'https://html.duckduckgo.com/html/' },
  { name: 'Bitcoin.org', url: 'https://bitcoin.org' },
  { name: 'Mempool.space', url: 'https://mempool.space' },
  { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Tor_(network)' },
  { name: 'IP check (ipify)', url: 'https://api.ipify.org', preferredVia: 'tor' },
  { name: 'I2P stats.i2p', url: 'http://stats.i2p', preferredVia: 'i2p' },
  { name: 'Proton (.onion)', url: 'https://protonmailrmez3lotccipshtkleegetolb73fuirgj7r4o4vfu7ozyd.onion', preferredVia: 'tor' },
];

function buildProxyUrl(target: string, via: Via): string {
  return `/api/proxy/page?via=${via}&url=${encodeURIComponent(target)}`;
}

export default function Browser() {
  const [inputUrl, setInputUrl] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [via, setVia] = useState<Via>('tor');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [isSearchMode, setIsSearchMode] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [statusMap, setStatusMap] = useState<Record<BackendNodeName, NodeStatusItem> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { routingMode } = useNetworksStore();

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const s = await fetchAllStatus();
        if (!cancelled) setStatusMap(s);
      } catch {
        /* offline */
      }
    };
    void tick();
    const t = setInterval(tick, 4000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const torStatus = statusMap?.tor?.status ?? 'STOPPED';
  const i2pStatus = statusMap?.i2pd?.status ?? 'STOPPED';

  const navigate = (rawTarget: string, viaOverride?: Via) => {
    let target = rawTarget.trim();
    if (!target) return;
    if (isSearchMode && !target.includes('.') && !target.startsWith('http')) {
      target = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(target)}`;
    } else if (!/^https?:\/\//i.test(target)) {
      target = `https://${target}`;
    }
    const v = viaOverride ?? via;
    const proxied = buildProxyUrl(target, v);
    setCurrentUrl(proxied);
    setInputUrl(target);
    setHistory((h) => {
      const next = [...h.slice(0, historyIdx + 1), proxied];
      setHistoryIdx(next.length - 1);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(inputUrl);
  };

  const goBack = () => {
    if (historyIdx > 0) {
      const idx = historyIdx - 1;
      setHistoryIdx(idx);
      setCurrentUrl(history[idx]);
    }
  };
  const goForward = () => {
    if (historyIdx < history.length - 1) {
      const idx = historyIdx + 1;
      setHistoryIdx(idx);
      setCurrentUrl(history[idx]);
    }
  };
  const reload = () => setIframeKey((k) => k + 1);

  const switchVia = (v: Via) => {
    setVia(v);
    if (currentUrl) {
      try {
        const u = new URL(currentUrl, window.location.origin);
        const target = u.searchParams.get('url');
        if (target) navigate(target, v);
      } catch { /* noop */ }
    }
  };

  const viaLabel = (v: Via) =>
    v === 'tor' ? 'TOR' : v === 'i2p' ? 'I2P' : 'CLEARNET';

  const viaReady =
    via === 'none' ? true :
    via === 'tor' ? torStatus === 'RUNNING' :
    i2pStatus === 'RUNNING';

  const indicatorColor = viaReady
    ? 'border-secondary/40 text-secondary bg-secondary/5'
    : 'border-destructive/40 text-destructive bg-destructive/10';

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-mono font-bold tracking-tight">VANTA_BROWSER</h2>
          <p className="text-muted-foreground font-mono mt-1">Iframe traffic routed through self-hosted SOCKS proxy</p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-muted-foreground">Routing Mode:</span>
          <Badge variant="outline" className="border-primary/40 text-primary">{routingMode}</Badge>
        </div>
      </div>

      <div className="bg-secondary/10 border border-secondary/30 p-4 rounded-md flex items-start gap-4 shrink-0">
        <Activity className="w-6 h-6 text-secondary shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-mono font-bold text-secondary text-sm tracking-wider">REAL TRAFFIC ROUTING</h4>
          <p className="text-xs text-secondary/80 mt-1 leading-relaxed">
            The frame fetches via the server&apos;s proxy that connects to the live tor SOCKS (127.0.0.1:9050) or i2pd SOCKS (127.0.0.1:4447). HTML is rewritten so links, forms, and assets stay inside the proxy. Visit <code>check.torproject.org</code> via TOR to confirm — it should display &quot;Congratulations&quot;.
          </p>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        <div className="w-64 shrink-0 space-y-4 flex flex-col">
          <Card className="bg-card/40 backdrop-blur-md border-primary/20 flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="font-mono text-sm">QUICK_LINKS</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
              {QUICK_LINKS.map(link => (
                <button
                  key={link.name}
                  onClick={() => {
                    if (link.preferredVia) setVia(link.preferredVia);
                    navigate(link.url, link.preferredVia ?? via);
                  }}
                  className="w-full text-left p-2 rounded hover:bg-white/5 font-mono text-xs transition-colors flex items-center justify-between group"
                >
                  <span className="truncate">{link.name}</span>
                  {link.preferredVia ? (
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5 ml-1">
                      {viaLabel(link.preferredVia)}
                    </Badge>
                  ) : (
                    <Globe className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-md border-primary/20 shrink-0">
            <CardContent className="p-4 space-y-3">
              <div className="text-xs font-mono">
                <div className="text-muted-foreground mb-2">PROXY VIA</div>
                <div className="grid grid-cols-3 gap-1">
                  {(['tor', 'i2p', 'none'] as Via[]).map(v => (
                    <button
                      key={v}
                      onClick={() => switchVia(v)}
                      className={`px-2 py-1.5 rounded border font-mono text-[11px] transition-colors ${
                        via === v
                          ? 'border-primary bg-primary/15 text-primary'
                          : 'border-border/40 hover:border-border bg-black/30'
                      }`}
                    >
                      {viaLabel(v)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[10px] font-mono space-y-1 pt-2 border-t border-border/40">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">tor daemon:</span>
                  <span className={torStatus === 'RUNNING' ? 'text-secondary' : 'text-destructive'}>
                    {torStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">i2pd daemon:</span>
                  <span className={i2pStatus === 'RUNNING' ? 'text-secondary' : 'text-destructive'}>
                    {i2pStatus}
                  </span>
                </div>
                {via !== 'none' && !viaReady && (
                  <div className="text-destructive pt-1">
                    Start {viaLabel(via)} on Networks panel.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/40 backdrop-blur-md border-primary/20 flex-1 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-border/50 bg-black/40 flex items-center gap-2">
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goBack} disabled={historyIdx <= 0}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goForward} disabled={historyIdx >= history.length - 1}>
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={reload} disabled={!currentUrl}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder={isSearchMode ? "DuckDuckGo Search or enter URL..." : "Enter URL..."}
                  className="font-mono bg-black/50 h-8 pl-8 pr-32 text-xs"
                />
                <div className="absolute left-2 top-1/2 -translate-y-1/2">
                  {isSearchMode ? <Search className="w-4 h-4 text-muted-foreground" /> : <Globe className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsSearchMode((x) => !x)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded border border-border/40 hover:border-primary"
                  >
                    {isSearchMode ? 'SEARCH' : 'URL'}
                  </button>
                  <Badge variant="outline" className={`h-5 text-[10px] font-mono ${indicatorColor}`}>
                    <Lock className="w-3 h-3 mr-1" /> {viaLabel(via)}
                  </Badge>
                </div>
              </div>
              <Button type="submit" size="sm" className="h-8 font-mono">GO</Button>
            </form>
          </div>

          <div className="flex-1 bg-white relative">
            {!currentUrl ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background text-muted-foreground p-8 text-center">
                <Compass className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-mono mb-2">Enter a URL or search query to begin</p>
                <p className="font-mono text-xs text-muted-foreground/70 max-w-md">
                  All requests go through the server-side proxy via the network you select above. Tor and I2P daemons must be RUNNING for those routes.
                </p>
              </div>
            ) : via !== 'none' && !viaReady ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background p-8 text-center">
                <ShieldAlert className="w-16 h-16 mb-6 text-destructive opacity-50" />
                <h3 className="text-xl font-mono font-bold text-destructive mb-2">{viaLabel(via)} DAEMON OFFLINE</h3>
                <p className="font-mono text-sm text-muted-foreground max-w-md mb-8 leading-relaxed">
                  Routing is set to {viaLabel(via)} but its daemon is not RUNNING. Open the Networks panel and toggle it on, or switch the proxy above to CLEARNET.
                </p>
                <Button className="font-mono" onClick={() => switchVia('none')}>
                  <ExternalLink className="w-4 h-4 mr-2" /> SWITCH TO CLEARNET
                </Button>
              </div>
            ) : (
              <iframe
                key={`${currentUrl}-${iframeKey}`}
                ref={iframeRef}
                src={currentUrl}
                className="w-full h-full border-0 bg-white"
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
