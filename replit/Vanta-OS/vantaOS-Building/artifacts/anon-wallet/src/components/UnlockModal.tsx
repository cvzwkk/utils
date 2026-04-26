import React, { useState } from 'react';
import { useVaultStore } from '@/lib/vault';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Lock, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

export function UnlockModal({ onUnlock }: { onUnlock: () => void }) {
  const [passphrase, setPassphrase] = useState('');
  const { setSessionPassphrase, setEphemeral } = useVaultStore();

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passphrase.length < 8) return;
    setSessionPassphrase(passphrase);
    setEphemeral(false);
    onUnlock();
  };

  const handleEphemeral = () => {
    setSessionPassphrase(null);
    setEphemeral(true);
    onUnlock();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md p-4"
      >
        <Card className="border-primary/20 bg-background/80 backdrop-blur-md shadow-2xl shadow-primary/5">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-mono text-primary">SESSION_LOCK</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">
              Enter a session passphrase to encrypt data locally, or proceed in ephemeral mode (nothing saved).
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleUnlock}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Passphrase (min 8 chars)"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="font-mono bg-black/50 border-primary/30 focus-visible:ring-primary"
                />
              </div>
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive-foreground">
                  If you lose this passphrase, your session data is unrecoverable. We cannot reset it.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1 border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={handleEphemeral}
              >
                Ephemeral Mode
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={passphrase.length < 8}
              >
                Unlock Session
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
