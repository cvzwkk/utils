import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useNodeStore } from '@/lib/node';
import { useNetworksStore } from '@/lib/networks';
import { Server, Activity, Database, Users, Network, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Node() {
  const { isRunning, progress, blockHeight, peers, mempoolSize, toggleNode, setProgress, setBlockHeight, setMempoolSize } = useNodeStore();
  const { tor, i2p } = useNetworksStore();
  const [broadcastQueue, setBroadcastQueue] = useState<string[]>([]);

  useEffect(() => {
    if (!isRunning) return;

    let interval = setInterval(() => {
      setProgress(Math.min(100, progress + (Math.random() * 0.5)));
      setBlockHeight(blockHeight + Math.floor(Math.random() * 3));
      setMempoolSize(Math.floor(Math.random() * 50000) + 10000);
    }, 2000);

    return () => clearInterval(interval);
  }, [isRunning, progress, blockHeight, setProgress, setBlockHeight, setMempoolSize]);

  const addBroadcast = () => {
    setBroadcastQueue(q => [...q, `TX_${Math.random().toString(36).substring(2, 10).toUpperCase()}`]);
    setTimeout(() => {
      setBroadcastQueue(q => q.slice(1));
    }, 3000);
  };

  const getActiveNetwork = () => {
    if (tor === 'ACTIVE') return 'TOR';
    if (i2p === 'ACTIVE') return 'I2P';
    return 'CLEARNET';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-mono font-bold tracking-tight">PRUNED_NODE</h2>
          <p className="text-muted-foreground font-mono mt-1">Local blockchain synchronization and relay</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm text-muted-foreground">{isRunning ? 'RUNNING' : 'STOPPED'}</span>
          <Switch checked={isRunning} onCheckedChange={toggleNode} />
        </div>
      </div>

      <div className="bg-primary/10 border border-primary/20 p-4 rounded-md flex items-start gap-4">
        <Info className="w-6 h-6 text-primary shrink-0 mt-0.5" />
        <div>
          <h4 className="font-mono font-bold text-primary text-sm tracking-wider">LOCAL PRUNED-NODE SIMULATOR</h4>
          <p className="text-xs text-primary/80 mt-1 leading-relaxed">
            Actual P2P sync, peer connections, and block relay require a desktop Bitcoin daemon. This panel visualizes the operations a node would perform. Outbound API queries (testnet balance, broadcast) go through public Esplora endpoints over HTTPS.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/40 backdrop-blur-md border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-mono">SYNC_PROGRESS</CardTitle>
            <Activity className="w-4 h-4 text-primary absolute right-6 top-6" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{progress.toFixed(2)}%</div>
            <div className="mt-4 h-1.5 bg-secondary/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-md border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-mono">BLOCK_HEIGHT</CardTitle>
            <Database className="w-4 h-4 text-primary absolute right-6 top-6" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{blockHeight.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">Target: ~2.8M (Testnet)</p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-md border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-mono">ACTIVE_PEERS</CardTitle>
            <Users className="w-4 h-4 text-primary absolute right-6 top-6" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{isRunning ? peers.length : 0}</div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">Outbound connections</p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-md border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-mono">NETWORK</CardTitle>
            <Network className="w-4 h-4 text-primary absolute right-6 top-6" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-secondary">{getActiveNetwork()}</div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">Routing protocol</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card/40 backdrop-blur-md border-primary/20 lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-mono">PEER_CONNECTIONS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!isRunning ? (
                <div className="text-center py-8 text-muted-foreground font-mono">Node is offline. Start the node to connect to peers.</div>
              ) : (
                peers.map(peer => (
                  <div key={peer.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-black/50 border border-border/50 rounded-md gap-4">
                    <div>
                      <div className="font-mono text-sm text-primary-foreground">{peer.address}</div>
                      <div className="text-xs font-mono text-muted-foreground">{peer.version} • {peer.services}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm text-secondary">{peer.ping}ms</div>
                      <div className="text-xs font-mono text-muted-foreground">latency</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-md border-primary/20">
          <CardHeader>
            <CardTitle className="font-mono">MEMPOOL_&_RELAY</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="text-sm font-mono text-muted-foreground mb-1">Mempool Size</div>
              <div className="text-2xl font-mono font-bold">{isRunning ? mempoolSize.toLocaleString() : 0} <span className="text-sm font-normal">TXs</span></div>
            </div>
            
            <div className="space-y-4">
              <div className="text-sm font-mono text-muted-foreground">Broadcast Queue</div>
              <div className="h-32 border border-border/50 bg-black/50 rounded-md p-2 overflow-hidden relative flex flex-col items-center justify-end">
                <AnimatePresence>
                  {broadcastQueue.map((tx, i) => (
                    <motion.div
                      key={tx + i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20 w-full text-center my-1"
                    >
                      RELAYING {tx}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {broadcastQueue.length === 0 && (
                  <div className="text-xs font-mono text-muted-foreground absolute inset-0 flex items-center justify-center">QUEUE EMPTY</div>
                )}
              </div>
              <Button onClick={addBroadcast} disabled={!isRunning} className="w-full font-mono" variant="outline">
                TEST BROADCAST
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
