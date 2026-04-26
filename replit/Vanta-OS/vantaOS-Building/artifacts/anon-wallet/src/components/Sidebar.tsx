import React from 'react';
import { Link, useLocation } from 'wouter';
import { Home, KeyRound, Wallet, Layers, Shuffle, Image as ImageIcon, Network, Activity, TestTube, Server, Globe, Compass, Users, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/generate', label: 'Generate', icon: KeyRound },
  { href: '/recover', label: 'Recover', icon: Activity },
  { href: '/multisig', label: 'Multisig', icon: Layers },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/stego', label: 'Steganography', icon: ImageIcon },
  { href: '/mixnet', label: 'Mixnet Sim', icon: Network },
  { href: '/entropy', label: 'Entropy Pool', icon: Shuffle },
  { href: '/testnet', label: 'Testnet', icon: TestTube },
  { href: '/coinjoin', label: 'CoinJoin', icon: Users },
  { href: '/networks', label: 'Networks', icon: Globe },
  { href: '/node', label: 'Node', icon: Server },
  { href: '/browser', label: 'Browser', icon: Compass },
  { href: '/shield', label: 'Shield', icon: ShieldCheck },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 border-r border-border/50 bg-background/50 backdrop-blur flex flex-col z-20">
      <div className="h-16 flex items-center px-6 border-b border-border/50">
        <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center border border-primary/30">
          <div className="w-4 h-4 bg-primary rounded-sm shadow-[0_0_10px_rgba(0,255,255,0.5)]"></div>
        </div>
      </div>
      <nav className="flex-1 py-6 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-mono transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_0_20px_rgba(0,255,255,0.05)]"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border/50">
        <div className="text-xs text-muted-foreground font-mono text-center opacity-50">
          VANTA v1.0.0<br/>
          OFFLINE SECURE
        </div>
      </div>
    </aside>
  );
}
