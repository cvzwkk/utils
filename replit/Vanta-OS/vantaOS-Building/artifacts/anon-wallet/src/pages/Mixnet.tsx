import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Network, Send, Loader2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Mixnet() {
  const [txHex, setTxHex] = useState('');
  const [network, setNetwork] = useState('tor');
  const [hops, setHops] = useState(3);
  const [simulating, setSimulating] = useState(false);
  const [currentHop, setCurrentHop] = useState(-1);
  const [complete, setComplete] = useState(false);

  const startSimulation = () => {
    if (!txHex) return;
    setSimulating(true);
    setComplete(false);
    setCurrentHop(0);

    const step = (hop: number) => {
      if (hop >= hops) {
        setTimeout(() => {
          setSimulating(false);
          setComplete(true);
        }, 1000);
        return;
      }
      
      setCurrentHop(hop);
      // Random delay between hops 800ms - 2000ms
      setTimeout(() => step(hop + 1), Math.random() * 1200 + 800);
    };

    step(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-mono font-bold tracking-tight">MIXNET_ROUTING</h2>
        <p className="text-muted-foreground font-mono mt-1">Obfuscate transaction origin via onion routing simulation</p>
      </div>

      <div className="bg-primary/10 border border-primary/20 p-4 rounded-md flex items-start gap-4">
        <Info className="w-6 h-6 text-primary shrink-0 mt-0.5" />
        <div>
          <h4 className="font-mono font-bold text-primary">SIMULATION ENVIRONMENT</h4>
          <p className="text-sm text-primary/80 mt-1">
            Browser security models prevent raw TCP/UDP socket connections. This is a local routing simulator demonstrating how Vanta would broadcast via Tor/I2P/Lokinet in a native desktop environment. No actual broadcast occurs.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card/40 backdrop-blur-md border-primary/20 lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="font-mono">BROADCAST_PARAMS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">Raw Signed Transaction (Hex)</label>
              <Textarea 
                placeholder="01000000000101..." 
                className="font-mono bg-black/50 h-32 border-primary/30"
                value={txHex}
                onChange={(e) => setTxHex(e.target.value)}
                disabled={simulating}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">Transport Network</label>
              <Select value={network} onValueChange={setNetwork} disabled={simulating}>
                <SelectTrigger className="font-mono bg-black/50 border-primary/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tor">Tor (Onion Routing)</SelectItem>
                  <SelectItem value="i2p">I2P (Garlic Routing)</SelectItem>
                  <SelectItem value="lokinet">Lokinet (LLARP)</SelectItem>
                  <SelectItem value="nym">Nym Mixnet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-xs font-mono text-muted-foreground">Route Length (Hops)</label>
                <label className="text-xs font-mono text-primary">{hops} nodes</label>
              </div>
              <Slider 
                value={[hops]} 
                onValueChange={(v) => setHops(v[0])} 
                max={9} min={3} step={1} 
                className="py-2" 
                disabled={simulating}
              />
            </div>

            <Button 
              onClick={startSimulation} 
              className="w-full font-mono mt-4" 
              disabled={simulating || !txHex}
            >
              {simulating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> ESTABLISHING CIRCUIT...</>
              ) : (
                <><Network className="w-4 h-4 mr-2" /> INITIATE BROADCAST</>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-md border-primary/20 lg:col-span-2 overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle className="font-mono flex justify-between">
              <span>VISUALIZATION</span>
              <span className="text-primary text-sm font-normal">
                {simulating ? `HOP ${currentHop + 1}/${hops}` : complete ? 'COMPLETE' : 'STANDBY'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center p-8 relative min-h-[400px]">
            {/* Simulation Canvas */}
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
              <div className="relative w-full max-w-lg h-64 flex items-center justify-between px-12">
                {Array.from({ length: hops }).map((_, i) => (
                  <div key={i} className="relative flex flex-col items-center justify-center z-10">
                    <motion.div 
                      className={`w-4 h-4 rounded-full border-2 ${
                        currentHop >= i ? 'border-primary bg-primary/20 shadow-[0_0_15px_rgba(0,255,255,0.5)]' : 'border-muted bg-black'
                      }`}
                      animate={currentHop === i ? { scale: [1, 1.5, 1], transition: { repeat: Infinity, duration: 1 } } : {}}
                    />
                    {currentHop >= i && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-8 w-max text-[10px] font-mono text-primary text-center"
                      >
                        <div>NODE_{i.toString().padStart(2, '0')}</div>
                        <div className="text-muted-foreground">{Math.floor(Math.random() * 150 + 50)}ms</div>
                      </motion.div>
                    )}
                  </div>
                ))}

                {/* Connecting Lines */}
                <div className="absolute left-12 right-12 h-0.5 bg-muted/30 top-1/2 -translate-y-1/2 z-0" />
                
                {simulating && (
                  <motion.div 
                    className="absolute h-0.5 bg-primary top-1/2 -translate-y-1/2 z-0 shadow-[0_0_10px_rgba(0,255,255,0.8)] origin-left"
                    initial={{ width: '0%' }}
                    animate={{ width: `${(currentHop / (hops - 1)) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                )}

                {/* The Packet */}
                <AnimatePresence>
                  {simulating && (
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-secondary rounded shadow-[0_0_20px_rgba(57,255,20,0.8)] z-20 flex items-center justify-center border border-white"
                      initial={{ left: '3rem' }}
                      animate={{ left: `calc(3rem + ${(currentHop / (hops - 1)) * 100}% - ${(currentHop / (hops - 1)) * 3}rem)` }}
                      transition={{ type: 'spring', damping: 20, stiffness: 50 }}
                    >
                      <Send className="w-3 h-3 text-black" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {complete && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-30"
              >
                <div className="text-center p-8 border border-primary/30 rounded-lg bg-black/50 shadow-[0_0_50px_rgba(0,255,255,0.1)]">
                  <Network className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-mono font-bold text-primary mb-2">BROADCAST SUCCESSFUL</h3>
                  <p className="font-mono text-sm text-muted-foreground max-w-sm mb-6">
                    Transaction injected into mempool via node exit relay. Origin IP successfully obfuscated across {hops} hops.
                  </p>
                  <Button variant="outline" className="font-mono border-primary/50 text-primary" onClick={() => setComplete(false)}>
                    ACKNOWLEDGE
                  </Button>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
