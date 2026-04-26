import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVaultStore } from '@/lib/vault';
import { useEntropyStore } from '@/lib/entropy';
import { useNetworksStore } from '@/lib/networks';
import { PHISHING_DOMAINS } from '@/lib/phishing';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { KeyRound, Shield, Activity, Network, ShieldCheck, TestTube, Compass } from 'lucide-react';

export default function Dashboard() {
  const { wallets, multisigVaults, isEphemeral } = useVaultStore();
  const { bits } = useEntropyStore();
  const { tor, i2p, yggdrasil, hyphanet } = useNetworksStore();

  const activeNetworksCount = [tor, i2p, yggdrasil, hyphanet].filter(s => s === 'ACTIVE').length;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-mono font-bold tracking-tight">SYSTEM_STATUS</h2>
          <p className="text-muted-foreground font-mono mt-1">
            {isEphemeral ? 'Running in volatile memory (Ephemeral Mode)' : 'Encrypted persistent storage active'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <motion.div variants={item}>
          <Card className="bg-card/40 backdrop-blur-md border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium font-mono">LOCAL_WALLETS</CardTitle>
              <KeyRound className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{wallets.length}</div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={item}>
          <Card className="bg-card/40 backdrop-blur-md border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium font-mono">MULTISIG_VAULTS</CardTitle>
              <Shield className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{multisigVaults.length}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="bg-card/40 backdrop-blur-md border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium font-mono">ENTROPY_POOL</CardTitle>
              <Activity className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{bits} <span className="text-sm text-muted-foreground">bits</span></div>
              <div className="mt-4 h-2 bg-secondary/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500" 
                  style={{ width: `${Math.min((bits / 4096) * 100, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="bg-card/40 backdrop-blur-md border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium font-mono">NETWORK_STATUS</CardTitle>
              <Network className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-secondary">OFFLINE</div>
              <p className="text-xs text-muted-foreground mt-1 font-mono">Air-gapped operations only</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="bg-card/40 backdrop-blur-md border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium font-mono">PROTECTION_STATUS</CardTitle>
              <ShieldCheck className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-mono text-primary flex items-center gap-2">
                ACTIVE
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 font-mono leading-tight">
                {PHISHING_DOMAINS.length} rules loaded<br/>
                {activeNetworksCount} networks active<br/>
                FP Score: MEDIUM
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.h3 variants={item} className="text-xl font-mono font-bold mt-8">QUICK_ACTIONS</motion.h3>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <motion.div variants={item}>
          <Link href="/generate" className="block p-4 rounded-lg border border-border/50 bg-card/20 hover:bg-primary/5 hover:border-primary/50 transition-all group h-full">
            <KeyRound className="w-6 h-6 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-mono font-bold text-sm mb-1">Generate Keys</h4>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/stego" className="block p-4 rounded-lg border border-border/50 bg-card/20 hover:bg-primary/5 hover:border-primary/50 transition-all group h-full">
            <Shield className="w-6 h-6 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-mono font-bold text-sm mb-1">Steganography</h4>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/mixnet" className="block p-4 rounded-lg border border-border/50 bg-card/20 hover:bg-primary/5 hover:border-primary/50 transition-all group h-full">
            <Network className="w-6 h-6 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-mono font-bold text-sm mb-1">Mixnet Sim</h4>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/testnet" className="block p-4 rounded-lg border border-border/50 bg-card/20 hover:bg-primary/5 hover:border-primary/50 transition-all group h-full">
            <TestTube className="w-6 h-6 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-mono font-bold text-sm mb-1">Testnet</h4>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/browser" className="block p-4 rounded-lg border border-border/50 bg-card/20 hover:bg-primary/5 hover:border-primary/50 transition-all group h-full">
            <Compass className="w-6 h-6 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-mono font-bold text-sm mb-1">Browser</h4>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/shield" className="block p-4 rounded-lg border border-border/50 bg-card/20 hover:bg-primary/5 hover:border-primary/50 transition-all group h-full">
            <ShieldCheck className="w-6 h-6 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-mono font-bold text-sm mb-1">Shield</h4>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}
