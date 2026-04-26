import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEntropyStore } from '@/lib/entropy';
import { useParticleStore } from '@/components/ParticleBackdrop';
import { MousePointer2, Keyboard, Mic, Camera, Shuffle } from 'lucide-react';
import { useLocation } from 'wouter';

export default function Entropy() {
  const { pool, bits, hash, addBytes } = useEntropyStore();
  const { burst } = useParticleStore();
  const [_, setLocation] = useLocation();
  
  const [sources, setSources] = useState({
    mouse: false,
    keyboard: false,
  });

  // Mouse entropy
  useEffect(() => {
    if (!sources.mouse) return;
    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      const x = e.clientX;
      const y = e.clientY;
      const bytes = new Uint8Array([x & 0xff, (x >> 8) & 0xff, y & 0xff, (y >> 8) & 0xff, now & 0xff]);
      addBytes(bytes);
      if (Math.random() < 0.1) burst(x, y); // occasional burst
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [sources.mouse, addBytes, burst]);

  // Keyboard entropy
  useEffect(() => {
    if (!sources.keyboard) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = performance.now();
      const bytes = new Uint8Array([e.keyCode & 0xff, now & 0xff]);
      addBytes(bytes);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sources.keyboard, addBytes]);

  const toggleSource = (source: keyof typeof sources) => {
    setSources(s => ({ ...s, [source]: !s[source] }));
  };

  const poolHex = Array.from(pool).slice(-200).map(b => b.toString(16).padStart(2, '0')).join('');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-mono font-bold tracking-tight">ENTROPY_POOL</h2>
        <p className="text-muted-foreground font-mono mt-1">Accumulate truly random bytes for cryptographic synthesis</p>
      </div>

      <Card className="bg-card/40 backdrop-blur-md border-primary/20 overflow-hidden relative">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="relative w-64 h-64 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="128" cy="128" r="120"
                  className="stroke-muted/20"
                  strokeWidth="8" fill="none"
                />
                <circle
                  cx="128" cy="128" r="120"
                  className="stroke-primary transition-all duration-300"
                  strokeWidth="8" fill="none"
                  strokeDasharray="753.98"
                  strokeDashoffset={753.98 - (753.98 * Math.min(bits, 4096)) / 4096}
                />
              </svg>
              <div className="text-center">
                <div className="text-4xl font-mono font-bold text-primary">{bits}</div>
                <div className="text-sm font-mono text-muted-foreground">BITS</div>
              </div>
            </div>
            
            <div className="w-full max-w-xl space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">SHA-256 STATE</span>
                <span className="text-primary truncate ml-4">{hash || 'AWAITING_INPUT'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card/40 backdrop-blur-md border-border/50">
          <CardHeader>
            <CardTitle className="font-mono text-lg">ENTROPY_SOURCES</CardTitle>
            <CardDescription className="font-mono">Enable input listeners to gather entropy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-border/50">
              <div className="flex items-center gap-3">
                <MousePointer2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="font-mono text-sm font-bold">Mouse Movements</div>
                  <div className="font-mono text-xs text-muted-foreground">High yield, low quality</div>
                </div>
              </div>
              <Button 
                variant={sources.mouse ? "default" : "outline"} 
                className={sources.mouse ? "bg-primary text-black hover:bg-primary/90" : ""}
                onClick={() => toggleSource('mouse')}
              >
                {sources.mouse ? 'SAMPLING' : 'INACTIVE'}
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-border/50">
              <div className="flex items-center gap-3">
                <Keyboard className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="font-mono text-sm font-bold">Keystroke Timing</div>
                  <div className="font-mono text-xs text-muted-foreground">Medium yield, medium quality</div>
                </div>
              </div>
              <Button 
                variant={sources.keyboard ? "default" : "outline"}
                className={sources.keyboard ? "bg-primary text-black hover:bg-primary/90" : ""}
                onClick={() => toggleSource('keyboard')}
              >
                {sources.keyboard ? 'SAMPLING' : 'INACTIVE'}
              </Button>
            </div>
            
            <Button 
              className="w-full font-mono mt-4 border border-primary text-primary bg-primary/10 hover:bg-primary/20"
              onClick={() => setLocation('/generate')}
              disabled={bits < 256}
            >
              <Shuffle className="w-4 h-4 mr-2" />
              DRAIN TO GENERATOR
            </Button>
            {bits < 256 && (
              <p className="text-center text-xs font-mono text-muted-foreground">Requires minimum 256 bits</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-md border-border/50">
          <CardHeader>
            <CardTitle className="font-mono text-lg">TAIL_BUFFER</CardTitle>
            <CardDescription className="font-mono">Raw byte stream (last 200 bytes)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-48 bg-black/80 rounded-lg border border-border/50 p-4 font-mono text-xs text-primary/60 break-all overflow-hidden relative">
              {poolHex}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 pointer-events-none" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
