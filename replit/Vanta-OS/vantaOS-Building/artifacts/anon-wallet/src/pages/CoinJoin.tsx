import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { useVaultStore } from '@/lib/vault';
import { useParticleStore } from '@/components/ParticleBackdrop';
import { Users, Shield, Loader2, ArrowRight, CheckCircle2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as bitcoin from 'bitcoinjs-lib';

const STAGES = [
  'REGISTRATION',
  'INPUT_REGISTRATION',
  'OUTPUT_REGISTRATION',
  'SIGNING',
  'BROADCAST'
];

export default function CoinJoin() {
  const { wallets, testnetWallets, addWallet } = useVaultStore();
  const allWallets = [...wallets.map(w => ({...w, network: 'mainnet'})), ...testnetWallets.map(w => ({...w, network: 'testnet'}))];
  
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [denomination, setDenomination] = useState('0.1');
  const [rounds, setRounds] = useState([3]);
  const [anonSet, setAnonSet] = useState('20');
  
  const [isJoining, setIsJoining] = useState(false);
  const [stage, setStage] = useState(0);
  const [participants, setParticipants] = useState<{id: string, x: number, y: number}[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [derivedOutputs, setDerivedOutputs] = useState<string[]>([]);

  const { burst } = useParticleStore();

  const startCoinJoin = () => {
    if (!selectedWalletId) return;
    
    setIsJoining(true);
    setStage(0);
    setIsComplete(false);
    setParticipants([]);
    setDerivedOutputs([]);

    const targetSet = parseInt(anonSet);
    let currentSet = 1; // You
    
    // Simulate participants joining
    const joinInterval = setInterval(() => {
      if (currentSet < targetSet) {
        setParticipants(p => [...p, {
          id: `anon_${Math.random().toString(36).substring(2, 6)}`,
          x: Math.random() * 100,
          y: Math.random() * 100
        }]);
        currentSet++;
      } else {
        clearInterval(joinInterval);
        progressStages();
      }
    }, 2000 / targetSet);

    const progressStages = () => {
      let currentStage = 0;
      const stageInterval = setInterval(() => {
        currentStage++;
        if (currentStage >= STAGES.length) {
          clearInterval(stageInterval);
          completeCoinJoin();
        } else {
          setStage(currentStage);
        }
      }, 1500);
    };

    const completeCoinJoin = () => {
      setIsJoining(false);
      setIsComplete(true);
      
      // Generate some fake derived outputs based on the network
      const wallet = allWallets.find(w => w.id === selectedWalletId);
      const isTestnet = wallet?.network === 'testnet';
      
      const outputs = Array.from({ length: rounds[0] }).map(() => {
        return (isTestnet ? 'tb1q' : 'bc1q') + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      });
      
      setDerivedOutputs(outputs);
      
      // trigger burst in center
      const rect = document.getElementById('coinjoin-visualizer')?.getBoundingClientRect();
      if (rect) {
        burst(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-mono font-bold tracking-tight">COINJOIN_COORDINATOR</h2>
        <p className="text-muted-foreground font-mono mt-1">Crowd-anonymize UTXOs to break deterministic links</p>
      </div>

      <div className="bg-primary/10 border border-primary/20 p-4 rounded-md flex items-start gap-4">
        <Info className="w-6 h-6 text-primary shrink-0 mt-0.5" />
        <div>
          <h4 className="font-mono font-bold text-primary text-sm tracking-wider">LOCAL COINJOIN SIMULATOR</h4>
          <p className="text-xs text-primary/80 mt-1 leading-relaxed">
            There is no real coordinator and no other participants. To run real CoinJoin use Wasabi, JoinMarket, or Whirlpool. This panel demonstrates the protocol flow visually.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card/40 backdrop-blur-md border-primary/20 lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="font-mono">ROUND_PARAMETERS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">Source Wallet</label>
              <Select value={selectedWalletId} onValueChange={setSelectedWalletId} disabled={isJoining}>
                <SelectTrigger className="font-mono bg-black/50 border-primary/30">
                  <SelectValue placeholder="Select wallet..." />
                </SelectTrigger>
                <SelectContent>
                  {allWallets.map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} <span className="text-muted-foreground ml-2">({w.network})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">Denomination</label>
              <Select value={denomination} onValueChange={setDenomination} disabled={isJoining}>
                <SelectTrigger className="font-mono bg-black/50 border-primary/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.01">0.01 BTC</SelectItem>
                  <SelectItem value="0.05">0.05 BTC</SelectItem>
                  <SelectItem value="0.1">0.10 BTC</SelectItem>
                  <SelectItem value="0.5">0.50 BTC</SelectItem>
                  <SelectItem value="1.0">1.00 BTC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">Anonymity Set Target</label>
              <Select value={anonSet} onValueChange={setAnonSet} disabled={isJoining}>
                <SelectTrigger className="font-mono bg-black/50 border-primary/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 participants</SelectItem>
                  <SelectItem value="10">10 participants</SelectItem>
                  <SelectItem value="20">20 participants</SelectItem>
                  <SelectItem value="50">50 participants</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-xs font-mono text-muted-foreground">Mix Rounds</label>
                <label className="text-xs font-mono text-primary">{rounds[0]} rounds</label>
              </div>
              <Slider 
                value={rounds} 
                onValueChange={setRounds} 
                max={5} min={1} step={1} 
                className="py-2" 
                disabled={isJoining}
              />
            </div>

            <Button 
              onClick={startCoinJoin} 
              className="w-full font-mono mt-4" 
              disabled={isJoining || !selectedWalletId}
            >
              {isJoining ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> COORDINATING...</>
              ) : (
                <><Users className="w-4 h-4 mr-2" /> JOIN ROUND</>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-md border-primary/20 lg:col-span-2 overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle className="font-mono flex justify-between">
              <span>VISUALIZATION</span>
              {isJoining && <span className="text-primary text-sm font-normal animate-pulse">{STAGES[stage]}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center p-8 relative min-h-[400px]" id="coinjoin-visualizer">
            
            {!isJoining && !isComplete ? (
              <div className="text-center text-muted-foreground font-mono opacity-50 flex flex-col items-center">
                <Users className="w-16 h-16 mb-4" />
                <p>Waiting for user to join round...</p>
              </div>
            ) : (
              <>
                {/* Central Coordinator */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                  <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center bg-black transition-colors duration-500 ${
                    stage >= 1 ? 'border-primary shadow-[0_0_30px_rgba(0,255,255,0.4)]' : 'border-muted'
                  }`}>
                    <Shield className={`w-6 h-6 ${stage >= 1 ? 'text-primary' : 'text-muted'}`} />
                  </div>
                </div>

                {/* Participants */}
                <AnimatePresence>
                  {participants.map((p, i) => {
                    const radius = 120;
                    const angle = (i / parseInt(anonSet)) * Math.PI * 2;
                    const tx = Math.cos(angle) * radius;
                    const ty = Math.sin(angle) * radius;
                    
                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute top-1/2 left-1/2 w-3 h-3 bg-secondary rounded-full z-10"
                        style={{
                          marginLeft: `${tx}px`,
                          marginTop: `${ty}px`,
                          boxShadow: '0 0 10px rgba(57,255,20,0.5)'
                        }}
                      >
                        {/* Flow line to center */}
                        {stage >= 1 && stage <= 2 && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: radius }}
                            className="absolute top-1.5 left-1.5 h-px bg-secondary origin-left opacity-30"
                            style={{ transform: `rotate(${angle + Math.PI}rad)` }}
                          />
                        )}
                        {/* Flow line from center */}
                        {stage >= 2 && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: radius }}
                            className="absolute top-1.5 left-1.5 h-px bg-primary origin-left opacity-30"
                            style={{ transform: `rotate(${angle}rad)` }}
                          />
                        )}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[8px] font-mono text-secondary whitespace-nowrap">
                          {p.id}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Your Node */}
                <motion.div
                  className="absolute top-1/2 left-1/2 w-4 h-4 bg-primary rounded-full z-10 border border-white"
                  style={{
                    marginLeft: `-${120}px`,
                    marginTop: `0px`,
                    boxShadow: '0 0 15px rgba(0,255,255,0.8)'
                  }}
                >
                  {stage >= 1 && stage <= 2 && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: 120 }}
                      className="absolute top-2 left-2 h-px bg-primary origin-left opacity-50"
                      style={{ transform: `rotate(0rad)` }}
                    />
                  )}
                  {stage >= 2 && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: 120 }}
                      className="absolute top-2 left-2 h-px bg-primary origin-left opacity-50"
                      style={{ transform: `rotate(${Math.PI}rad)` }}
                    />
                  )}
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono text-primary whitespace-nowrap font-bold">
                    YOU
                  </div>
                </motion.div>

                <div className="absolute bottom-8 left-8 right-8">
                  <div className="flex justify-between text-xs font-mono text-muted-foreground mb-2">
                    <span>{STAGES[stage]}</span>
                    <span>{Math.round(((stage + 1) / STAGES.length) * 100)}%</span>
                  </div>
                  <Progress value={((stage + 1) / STAGES.length) * 100} className="h-1" />
                </div>
              </>
            )}

            {isComplete && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/90 backdrop-blur flex items-center justify-center z-30 p-8"
              >
                <div className="max-w-md w-full space-y-6">
                  <div className="text-center">
                    <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
                    <h3 className="text-2xl font-mono font-bold text-primary">MIX COMPLETE</h3>
                    <p className="text-sm font-mono text-muted-foreground mt-2">
                      Anonymity set of {anonSet} reached over {rounds[0]} rounds.
                    </p>
                  </div>
                  
                  <div className="space-y-3 bg-black/50 border border-primary/20 p-4 rounded-md">
                    <h4 className="font-mono text-sm text-muted-foreground">NEW UNLINKED OUTPUTS:</h4>
                    {derivedOutputs.map((out, i) => (
                      <div key={i} className="flex items-center justify-between font-mono text-xs">
                        <span className="text-primary truncate mr-4">{out}</span>
                        <span className="text-secondary shrink-0">{denomination} BTC</span>
                      </div>
                    ))}
                  </div>

                  <Button className="w-full font-mono" onClick={() => { setIsComplete(false); setParticipants([]); }}>
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
