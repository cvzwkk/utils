import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useParticleStore } from '@/components/ParticleBackdrop';
import { useVaultStore } from '@/lib/vault';
import { generateMnemonic, mnemonicToSeed, deriveAccount } from '@/lib/wallet';
import { useEntropyStore } from '@/lib/entropy';
import { ShieldAlert, Copy, Check, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

export default function Generate() {
  const [method, setMethod] = useState('mnemonic');
  const [strength, setStrength] = useState('256');
  const [passphrase, setPassphrase] = useState('');
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const { burst } = useParticleStore();
  const { addWallet, isEphemeral } = useVaultStore();
  const { drain } = useEntropyStore();

  const handleGenerate = (e: React.MouseEvent) => {
    // Basic generation for now
    let mnemonic = '';
    if (method === 'mnemonic') {
      mnemonic = generateMnemonic(parseInt(strength));
    } else if (method === 'pool') {
      // Need 32 bytes for 256 bit
      const bytes = drain(32);
      if (bytes.length < 32) {
        alert('Not enough entropy in pool');
        return;
      }
      // simplified handling
      mnemonic = generateMnemonic(256);
    } else {
      mnemonic = generateMnemonic(256);
    }

    const seed = mnemonicToSeed(mnemonic, passphrase);
    const account44 = deriveAccount(seed, 44, 0);
    const account84 = deriveAccount(seed, 84, 0);

    setResult({
      mnemonic,
      seed: seed.toString('hex'),
      account44,
      account84
    });

    burst(window.innerWidth / 2, window.innerHeight / 2);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const truncate = (str: string) => {
    if (!str) return '';
    return `${str.slice(0, 8)}...${str.slice(-8)}`;
  };

  const handleSave = () => {
    if (!result) return;
    addWallet({
      id: crypto.randomUUID(),
      name: `Wallet ${new Date().toLocaleDateString()}`,
      account84: result.account84,
      createdAt: Date.now()
    });
    alert('Wallet saved to vault');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-mono font-bold tracking-tight">KEY_GENERATION</h2>
        <p className="text-muted-foreground font-mono mt-1">Cryptographic material synthesis</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card/40 backdrop-blur-md border-primary/20">
          <CardHeader>
            <CardTitle className="font-mono">PARAMETERS</CardTitle>
            <CardDescription className="font-mono">Select generation method and strength</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-mono text-muted-foreground">Source</label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="font-mono bg-black/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mnemonic">Standard PRNG</SelectItem>
                  <SelectItem value="pool">Entropy Pool</SelectItem>
                  <SelectItem value="dice">Dice Rolls</SelectItem>
                  <SelectItem value="coins">Coin Flips</SelectItem>
                  <SelectItem value="brain">Brain Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-mono text-muted-foreground">Strength</label>
              <Select value={strength} onValueChange={setStrength}>
                <SelectTrigger className="font-mono bg-black/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="128">128-bit (12 words)</SelectItem>
                  <SelectItem value="256">256-bit (24 words)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-mono text-muted-foreground">BIP39 Passphrase (Optional)</label>
              <Input 
                type="password" 
                value={passphrase} 
                onChange={(e) => setPassphrase(e.target.value)}
                className="font-mono bg-black/50"
                placeholder="Leave blank for none"
              />
            </div>

            {method === 'brain' && (
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md flex items-start gap-3 mt-4">
                <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive-foreground">
                  Brain wallets are highly susceptible to dictionary and brute-force attacks. Use with extreme caution.
                </p>
              </div>
            )}

            <Button onClick={handleGenerate} className="w-full font-mono mt-4" size="lg">
              <KeyRound className="w-4 h-4 mr-2" />
              GENERATE
            </Button>
          </CardContent>
        </Card>

        {result && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="bg-card/40 backdrop-blur-md border-primary/20 h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-mono text-primary">SYNTHESIS_COMPLETE</CardTitle>
                  <CardDescription className="font-mono">Cryptographic material ready</CardDescription>
                </div>
                {!isEphemeral && (
                  <Button variant="outline" size="sm" onClick={handleSave} className="font-mono border-primary/50 text-primary hover:bg-primary/10">
                    SAVE TO VAULT
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="mnemonic" className="w-full">
                  <TabsList className="w-full bg-black/50 grid grid-cols-3">
                    <TabsTrigger value="mnemonic" className="font-mono text-xs">MNEMONIC</TabsTrigger>
                    <TabsTrigger value="keys" className="font-mono text-xs">ROOT_KEYS</TabsTrigger>
                    <TabsTrigger value="addresses" className="font-mono text-xs">ADDRESSES</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="mnemonic" className="mt-4 space-y-4">
                    <div className="p-4 bg-black/50 border border-primary/20 rounded-md">
                      <p className="font-mono text-lg leading-relaxed break-words text-primary-foreground">
                        {result.mnemonic}
                      </p>
                    </div>
                    <Button variant="secondary" className="w-full font-mono" onClick={() => copyToClipboard(result.mnemonic)}>
                      {copied === result.mnemonic ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                      COPY MNEMONIC
                    </Button>
                    <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <p className="text-xs text-destructive-foreground">
                        Never store this digitally unencrypted. Anyone with these words controls the funds.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="keys" className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-muted-foreground">Seed Hex</label>
                      <div className="flex items-center gap-2">
                        <Input readOnly value={result.seed} className="font-mono text-xs bg-black/50" />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(result.seed)}>
                          {copied === result.seed ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-muted-foreground">xprv (m/84'/0'/0')</label>
                      <div className="flex items-center gap-2">
                        <Input readOnly value={result.account84.xprv} className="font-mono text-xs bg-black/50 text-destructive" />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(result.account84.xprv)}>
                          {copied === result.account84.xprv ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-muted-foreground">xpub (m/84'/0'/0')</label>
                      <div className="flex items-center gap-2">
                        <Input readOnly value={result.account84.xpub} className="font-mono text-xs bg-black/50 text-primary" />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(result.account84.xpub)}>
                          {copied === result.account84.xpub ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="addresses" className="mt-4">
                    <div className="space-y-4 h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {result.account84.receive.map((addr: any) => (
                        <div key={addr.path} className="p-3 bg-black/50 border border-border/50 rounded-md flex items-center gap-4">
                          <div className="bg-white p-1 rounded-sm">
                            <QRCodeSVG value={addr.address} size={64} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-mono text-muted-foreground mb-1">{addr.path}</div>
                            <div className="font-mono text-sm truncate text-primary-foreground">{addr.address}</div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => copyToClipboard(addr.address)}>
                            {copied === addr.address ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
