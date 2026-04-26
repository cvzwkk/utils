import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useNetworksStore } from '@/lib/networks';
import {
  fetchAllStatus,
  startBackendNode,
  stopBackendNode,
  UI_TO_BACKEND,
  type NodeStatusItem,
  type BackendNodeName,
} from '@/lib/nodesApi';
import { Lock, KeyRound, Network, Share2, Info, Server, ShieldAlert, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

type UiId = 'tor' | 'i2p' | 'yggdrasil' | 'hyphanet';

const NODE_META: Array<{
  id: UiId;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  binary: string;
}> = [
  { id: 'tor', title: 'TOR', icon: Lock, description: 'The Onion Router (circuit-based)', binary: 'tor' },
  { id: 'i2p', title: 'I2P', icon: KeyRound, description: 'Invisible Internet Project (garlic routing)', binary: 'i2pd' },
  { id: 'yggdrasil', title: 'YGGDRASIL', icon: Network, description: 'End-to-end encrypted IPv6 mesh', binary: 'yggdrasil' },
  { id: 'hyphanet', title: 'HYPHANET', icon: Share2, description: 'Censorship-resistant distributed datastore', binary: 'freenet (fred)' },
];

function uptimeFmt(ms: number): string {
  if (!ms || ms < 0) return '0s';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function statusBadgeColor(status: string) {
  switch (status) {
    case 'RUNNING':
      return 'bg-secondary/20 text-secondary border-secondary/40';
    case 'STARTING':
      return 'bg-primary/20 text-primary border-primary/40 animate-pulse';
    case 'FAILED':
      return 'bg-destructive/20 text-destructive border-destructive/40';
    default:
      return 'bg-muted/40 text-muted-foreground border-border/40';
  }
}

export default function Networks() {
  const {
    routingMode, customMix,
    setRoutingMode, setCustomMix,
    setNetworkState,
  } = useNetworksStore();

  const [statusMap, setStatusMap] = React.useState<Record<BackendNodeName, NodeStatusItem> | null>(null);
  const [busy, setBusy] = React.useState<Record<UiId, boolean>>({
    tor: false, i2p: false, yggdrasil: false, hyphanet: false,
  });
  const [openLogs, setOpenLogs] = React.useState<Record<UiId, boolean>>({
    tor: false, i2p: false, yggdrasil: false, hyphanet: false,
  });

  const refresh = React.useCallback(async () => {
    try {
      const s = await fetchAllStatus();
      setStatusMap(s);
      // sync with zustand store for downstream UIs (Browser, Mixnet, etc.)
      const map: Record<UiId, BackendNodeName> = UI_TO_BACKEND;
      (Object.keys(map) as UiId[]).forEach((ui) => {
        const back = map[ui];
        const st = s[back]?.status;
        const next =
          st === 'RUNNING' ? 'ACTIVE' :
          st === 'STARTING' ? 'CONNECTING' : 'DISCONNECTED';
        setNetworkState(ui, next);
      });
    } catch {
      // backend offline, leave as-is
    }
  }, [setNetworkState]);

  React.useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 2500);
    return () => clearInterval(t);
  }, [refresh]);

  const handleToggle = async (uiId: UiId, currentStatus: string) => {
    const back = UI_TO_BACKEND[uiId];
    setBusy((b) => ({ ...b, [uiId]: true }));
    try {
      if (currentStatus === 'RUNNING' || currentStatus === 'STARTING') {
        await stopBackendNode(back);
        toast.success(`${uiId.toUpperCase()} daemon stopped`);
      } else {
        await startBackendNode(back);
        toast.success(`${uiId.toUpperCase()} daemon spawned (PID will appear shortly)`);
      }
      await refresh();
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    } finally {
      setBusy((b) => ({ ...b, [uiId]: false }));
    }
  };

  const NetworkCard = ({ meta }: { meta: typeof NODE_META[number] }) => {
    const back = UI_TO_BACKEND[meta.id];
    const item = statusMap?.[back];
    const status = item?.status ?? 'STOPPED';
    const Icon = meta.icon;
    const isOn = status === 'RUNNING' || status === 'STARTING';

    return (
      <Card className={`bg-card/40 backdrop-blur-md border-${status === 'RUNNING' ? 'secondary/50' : status === 'FAILED' ? 'destructive/40' : 'primary/20'} transition-colors`}>
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-mono flex items-center gap-2">
              <Icon className="w-5 h-5" />
              {meta.title}
            </CardTitle>
            <CardDescription className="font-mono text-xs mt-1">{meta.description}</CardDescription>
            <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground font-mono">
              <Server className="w-3 h-3" /> {meta.binary}
            </div>
          </div>
          <Switch
            checked={isOn}
            onCheckedChange={() => handleToggle(meta.id, status)}
            disabled={busy[meta.id] || status === 'STARTING'}
          />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mt-2">
            <Badge variant="outline" className={`font-mono text-xs ${statusBadgeColor(status)}`}>{status}</Badge>
            {item?.pid && (
              <span className="font-mono text-xs text-muted-foreground">PID {item.pid}</span>
            )}
          </div>

          {item && (
            <div className="mt-4 space-y-2 text-xs font-mono text-muted-foreground border-t border-border/50 pt-4">
              <div className="flex justify-between">
                <span>Uptime:</span>
                <span className="text-primary-foreground">{uptimeFmt(item.uptimeMs)}</span>
              </div>
              <div className="flex justify-between">
                <span>Listen ports:</span>
                <span className="text-primary-foreground">
                  {Object.entries(item.ports).map(([k, v]) => `${k}:${v}`).join(' · ')}
                </span>
              </div>
              {item.exitCode !== null && status !== 'RUNNING' && (
                <div className="flex justify-between text-destructive">
                  <span>Last exit:</span>
                  <span>code {item.exitCode}{item.exitSignal ? ` (${item.exitSignal})` : ''}</span>
                </div>
              )}
              {item.error && (
                <div className="text-destructive break-words">err: {item.error}</div>
              )}
              <button
                className="underline text-[10px] hover:text-primary"
                onClick={() => setOpenLogs((o) => ({ ...o, [meta.id]: !o[meta.id] }))}
              >
                {openLogs[meta.id] ? 'hide' : 'show'} log tail ({item.logTail.length})
              </button>
              {openLogs[meta.id] && (
                <pre className="mt-2 max-h-44 overflow-auto bg-black/60 border border-border/40 rounded p-2 text-[10px] leading-tight whitespace-pre-wrap break-all">
{item.logTail.length === 0 ? '(no output yet)' : item.logTail.join('\n')}
                </pre>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-mono font-bold tracking-tight">ANONYMITY_NETWORKS</h2>
          <p className="text-muted-foreground font-mono mt-1">Self-hosted overlay daemons running inside this app</p>
        </div>
        <Badge variant="outline" className="font-mono text-xs border-secondary/40 text-secondary">
          <Activity className="w-3 h-3 mr-1" /> live
        </Badge>
      </div>

      <div className="bg-secondary/10 border border-secondary/30 p-4 rounded-md flex items-start gap-4">
        <Server className="w-6 h-6 text-secondary shrink-0 mt-0.5" />
        <div>
          <h4 className="font-mono font-bold text-secondary text-sm tracking-wider">SELF-HOSTED ON LOCALHOST</h4>
          <p className="text-xs text-secondary/80 mt-1 leading-relaxed">
            tor, i2pd, yggdrasil, and freenet (fred) are bundled with this app and run as real processes on the server. Toggle a network to spawn its daemon — no external download required. Listen ports bind to 127.0.0.1; PID, uptime, and live log tail are streamed below.
          </p>
        </div>
      </div>

      <div className="bg-primary/10 border border-primary/20 p-4 rounded-md flex items-start gap-4">
        <Info className="w-6 h-6 text-primary shrink-0 mt-0.5" />
        <div>
          <h4 className="font-mono font-bold text-primary text-sm tracking-wider">SCOPE OF ANONYMITY</h4>
          <p className="text-xs text-primary/80 mt-1 leading-relaxed">
            The daemons run on the server hosting this app and provide real circuits, garlic tunnels, and mesh connectivity for outbound traffic ORIGINATED BY THIS APP (broadcasts, fetches, OP_RETURN posts). Your browser&apos;s own traffic still uses your normal connection. Yggdrasil runs without TUN (admin-only mode) inside the container sandbox.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {NODE_META.map((m) => (
          <NetworkCard key={m.id} meta={m} />
        ))}
      </div>

      <Card className="bg-card/40 backdrop-blur-md border-primary/20">
        <CardHeader>
          <CardTitle className="font-mono">ROUTING_MODE</CardTitle>
          <CardDescription className="font-mono">How outbound app traffic is distributed across active daemons</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={routingMode} onValueChange={(v: 'SINGLE' | 'ROUND_ROBIN' | 'MIXED_MULTI_PATH') => setRoutingMode(v)} className="grid gap-4 md:grid-cols-3">
            <div className={`flex items-center space-x-2 border rounded-md p-4 ${routingMode === 'SINGLE' ? 'border-primary bg-primary/5' : 'border-border/50 bg-black/50'}`}>
              <RadioGroupItem value="SINGLE" id="r1" />
              <Label htmlFor="r1" className="font-mono cursor-pointer">
                <div className="font-bold">SINGLE</div>
                <div className="text-xs text-muted-foreground mt-1">Pick one active network for all traffic</div>
              </Label>
            </div>
            <div className={`flex items-center space-x-2 border rounded-md p-4 ${routingMode === 'ROUND_ROBIN' ? 'border-primary bg-primary/5' : 'border-border/50 bg-black/50'}`}>
              <RadioGroupItem value="ROUND_ROBIN" id="r2" />
              <Label htmlFor="r2" className="font-mono cursor-pointer">
                <div className="font-bold">ROUND ROBIN</div>
                <div className="text-xs text-muted-foreground mt-1">Rotate sequentially per request</div>
              </Label>
            </div>
            <div className={`flex items-center space-x-2 border rounded-md p-4 ${routingMode === 'MIXED_MULTI_PATH' ? 'border-primary bg-primary/5' : 'border-border/50 bg-black/50'}`}>
              <RadioGroupItem value="MIXED_MULTI_PATH" id="r3" />
              <Label htmlFor="r3" className="font-mono cursor-pointer">
                <div className="font-bold">MIXED MULTI-PATH</div>
                <div className="text-xs text-muted-foreground mt-1">Split requests across all networks</div>
              </Label>
            </div>
          </RadioGroup>

          {routingMode === 'MIXED_MULTI_PATH' && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="pt-6 border-t border-border/50">
              <h4 className="font-mono font-bold mb-4">CUSTOM MIX WEIGHTS</h4>
              <div className="space-y-6">
                {NODE_META.map(({ id, title }) => {
                  const back = UI_TO_BACKEND[id];
                  const isActive = statusMap?.[back]?.status === 'RUNNING';
                  return (
                    <div key={id} className={`space-y-3 ${!isActive ? 'opacity-30 pointer-events-none' : ''}`}>
                      <div className="flex justify-between">
                        <Label className="font-mono">{title}</Label>
                        <span className="font-mono text-xs">{customMix[id as keyof typeof customMix]}%</span>
                      </div>
                      <Slider
                        value={[customMix[id as keyof typeof customMix]]}
                        onValueChange={(val) => setCustomMix({ ...customMix, [id]: val[0] })}
                        max={100} min={0} step={1}
                        disabled={!isActive}
                      />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-md flex items-start gap-4">
        <ShieldAlert className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
        <div>
          <h4 className="font-mono font-bold text-destructive text-sm tracking-wider">SHARED-HOST WARNING</h4>
          <p className="text-xs text-destructive/80 mt-1 leading-relaxed">
            On a deployed instance, every visitor shares the same set of running daemons. Tor circuit IDs, I2P destinations, and Yggdrasil keys are not per-user. For real personal anonymity, run this app locally on your own machine.
          </p>
        </div>
      </div>
    </div>
  );
}
