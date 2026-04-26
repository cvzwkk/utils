import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ParticleBackdrop } from './ParticleBackdrop';
import { Sidebar } from './Sidebar';
import { UnlockModal } from './UnlockModal';
import { useEntropyStore } from '@/lib/entropy';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const { pool, bits } = useEntropyStore();
  
  const hash = pool.length > 0 
    ? Array.from(pool.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('') + '...'
    : '00000000...';

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      <ParticleBackdrop />
      {!isUnlocked && <UnlockModal onUnlock={() => setIsUnlocked(true)} />}
      
      <Sidebar />
      
      <main className="flex-1 flex flex-col relative z-10 overflow-y-auto">
        <header className="h-16 border-b border-border/50 bg-background/50 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-20">
          <h1 className="font-mono text-xl font-bold tracking-tight text-primary">VANTA<span className="text-muted-foreground">_OS</span></h1>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono text-primary flex items-center gap-2 shadow-[0_0_10px_rgba(0,255,255,0.1)]">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              ENTROPY: {bits}b / SHA-256: {hash}
            </div>
          </div>
        </header>
        <div className="p-6 max-w-7xl mx-auto w-full flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
