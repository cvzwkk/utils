import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { mnemonicToSeed, deriveAccount, validateAddress } from '@/lib/wallet';
import { decodeLSB } from '@/lib/stego';
import { useVaultStore } from '@/lib/vault';
import { useParticleStore } from '@/components/ParticleBackdrop';
import { ShieldAlert, Copy, Check, Upload, Key } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Recover() {
  const [mnemonic, setMnemonic] = useState('');
  const [hexSeed, setHexSeed] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [stegoPassphrase, setStegoPassphrase] = useState('');
  const [stegoFile, setStegoFile] = useState<File | null>(null);
  
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const { addWallet, isEphemeral } = useVaultStore();
  const { burst } = useParticleStore();

  const handleRecoverMnemonic = () => {
    try {
      const seed = mnemonicToSeed(mnemonic.trim(), passphrase);
      const account84 = deriveAccount(seed, 84, 0);
      setResult({ seed: seed.toString('hex'), account84 });
      burst(window.innerWidth / 2, window.innerHeight / 2);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRecoverStego = async () => {
    if (!stegoFile) return;
    try {
      const payload = await decodeLSB(stegoFile, stegoPassphrase);
      const text = new TextDecoder().decode(payload);
      
      // Assume payload is a mnemonic for now
      setMnemonic(text);
      const seed = mnemonicToSeed(text, passphrase);
      const account84 = deriveAccount(seed, 84, 0);
      setResult({ seed: seed.toString('hex'), account84, extracted: text });
      burst(window.innerWidth / 2, window.innerHeight / 2);
    } catch (e: any) {
      alert('Failed to decode: ' + e.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-mono font-bold tracking-tight">RECOVERY_PROTOCOL</h2>
        <p className="text-muted-foreground font-mono mt-1">Restore cryptographic material from backup</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card/40 backdrop-blur-md border-primary/20">
          <CardHeader>
            <CardTitle className="font-mono">SOURCE</CardTitle>
            <CardDescription className="font-mono">Select recovery method</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="mnemonic" className="w-full">
              <TabsList className="w-full bg-black/50 grid grid-cols-3">
                <TabsTrigger value="mnemonic" className="font-mono text-xs">MNEMONIC</TabsTrigger>
                <TabsTrigger value="hex" className="font-mono text-xs">RAW_HEX</TabsTrigger>
                <TabsTrigger value="stego" className="font-mono text-xs">STEGO_IMG</TabsTrigger>
              </TabsList>
              
              <TabsContent value="mnemonic" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-mono text-muted-foreground">BIP39 Mnemonic Phrase</label>
                  <Textarea 
                    value={mnemonic}
                    onChange={(e) => setMnemonic(e.target.value)}
                    className="font-mono bg-black/50 min-h-[100px] border-primary/30 focus-visible:ring-primary"
                    placeholder="Enter 12 or 24 words..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-mono text-muted-foreground">BIP39 Passphrase (Optional)</label>
                  <Input 
                    type="password" 
                    value={passphrase} 
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="font-mono bg-black/50 border-primary/30"
                    placeholder="Leave blank for none"
                  />
                </div>
                <Button onClick={handleRecoverMnemonic} className="w-full font-mono mt-4" disabled={!mnemonic}>
                  <Key className="w-4 h-4 mr-2" />
                  RECOVER FROM MNEMONIC
                </Button>
              </TabsContent>

              <TabsContent value="stego" className="mt-4 space-y-4">
                <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-primary/50 transition-colors bg-black/20 relative">
                  <input 
                    type="file" 
                    accept="image/png,image/jpeg"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => setStegoFile(e.target.files?.[0] || null)}
                  />
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="font-mono text-sm text-muted-foreground">
                    {stegoFile ? stegoFile.name : 'Drop carrier image here or click to browse'}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-mono text-muted-foreground">Decryption Passphrase (if encrypted)</label>
                  <Input 
                    type="password" 
                    value={stegoPassphrase} 
                    onChange={(e) => setStegoPassphrase(e.target.value)}
                    className="font-mono bg-black/50 border-primary/30"
                  />
                </div>

                <div className="bg-primary/10 border border-primary/20 p-3 rounded-md flex items-start gap-3 mt-4">
                  <ShieldAlert className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-primary/80 font-mono">
                    Ensure image is uncompressed. Social media platforms often strip LSB data.
                  </p>
                </div>

                <Button onClick={handleRecoverStego} className="w-full font-mono mt-4" disabled={!stegoFile}>
                  <Key className="w-4 h-4 mr-2" />
                  EXTRACT & RECOVER
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {result && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="bg-card/40 backdrop-blur-md border-primary/20 h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-mono text-primary">RECOVERY_SUCCESS</CardTitle>
                  <CardDescription className="font-mono">Keys derived successfully</CardDescription>
                </div>
                {!isEphemeral && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      addWallet({
                        id: crypto.randomUUID(),
                        name: `Recovered Wallet`,
                        account84: result.account84,
                        createdAt: Date.now()
                      });
                      alert('Wallet saved to vault');
                    }} 
                    className="font-mono border-primary/50 text-primary hover:bg-primary/10"
                  >
                    SAVE TO VAULT
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {result.extracted && (
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-muted-foreground">Extracted Payload</label>
                    <div className="p-3 bg-black/50 border border-primary/20 rounded-md font-mono text-sm break-all text-primary-foreground">
                      {result.extracted}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground">xpub (m/84'/0'/0')</label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={result.account84.xpub} className="font-mono text-xs bg-black/50 text-primary" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(result.account84.xpub)}>
                      {copied === result.account84.xpub ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground">First Receiving Address</label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={result.account84.receive[0].address} className="font-mono text-xs bg-black/50 text-primary-foreground" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(result.account84.receive[0].address)}>
                      {copied === result.account84.receive[0].address ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
