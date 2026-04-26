import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useVaultStore } from '@/lib/vault';
import { buildMultisig } from '@/lib/wallet';
import { Shield, Copy, Check, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Multisig() {
  const [m, setM] = useState(2);
  const [n, setN] = useState(3);
  const [pubkeys, setPubkeys] = useState<string[]>(['', '', '']);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const { addMultisigVault, isEphemeral } = useVaultStore();

  const handleMChange = (val: string) => {
    const newM = parseInt(val) || 1;
    setM(Math.min(newM, n));
  };

  const handleNChange = (val: string) => {
    const newN = parseInt(val) || 1;
    setN(Math.max(newN, m));
    
    // Adjust pubkeys array length
    setPubkeys(prev => {
      const next = [...prev];
      while (next.length < newN) next.push('');
      while (next.length > newN) next.pop();
      return next;
    });
  };

  const updatePubkey = (index: number, val: string) => {
    const newKeys = [...pubkeys];
    newKeys[index] = val.trim();
    setPubkeys(newKeys);
  };

  const handleGenerate = () => {
    try {
      const validKeys = pubkeys.filter(k => k.length === 66 || k.length === 130);
      if (validKeys.length !== n) {
        throw new Error(`Need exactly ${n} valid hex public keys (compressed 33 bytes / 66 hex chars)`);
      }
      const multisig = buildMultisig(m, n, validKeys);
      setResult(multisig);
    } catch (e: any) {
      alert(e.message);
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
        <h2 className="text-3xl font-mono font-bold tracking-tight">MULTISIG_QUORUM</h2>
        <p className="text-muted-foreground font-mono mt-1">Configure M-of-N signature thresholds</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/40 backdrop-blur-md border-primary/20">
          <CardHeader>
            <CardTitle className="font-mono">QUORUM_SETUP</CardTitle>
            <CardDescription className="font-mono">Define participants and threshold</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <div className="space-y-2 flex-1">
                <label className="text-sm font-mono text-muted-foreground">Required Sigs (M)</label>
                <Input type="number" min="1" max={n} value={m} onChange={(e) => handleMChange(e.target.value)} className="font-mono bg-black/50" />
              </div>
              <div className="space-y-2 flex-1">
                <label className="text-sm font-mono text-muted-foreground">Total Participants (N)</label>
                <Input type="number" min={m} max="15" value={n} onChange={(e) => handleNChange(e.target.value)} className="font-mono bg-black/50" />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-mono text-muted-foreground">Participant Public Keys (Hex)</label>
              {pubkeys.map((key, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="pt-2 text-xs font-mono text-muted-foreground w-6 text-right">{i+1}.</div>
                  <Input 
                    placeholder="Enter compressed public key hex..."
                    value={key}
                    onChange={(e) => updatePubkey(i, e.target.value)}
                    className="font-mono bg-black/50 text-xs"
                  />
                </div>
              ))}
            </div>

            <Button onClick={handleGenerate} className="w-full font-mono mt-4" disabled={pubkeys.some(k => !k)}>
              <Shield className="w-4 h-4 mr-2" />
              DERIVE MULTISIG VAULT
            </Button>
          </CardContent>
        </Card>

        {result && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="bg-card/40 backdrop-blur-md border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-mono text-primary">VAULT_DERIVED</CardTitle>
                  <CardDescription className="font-mono">P2WSH Multisignature Address</CardDescription>
                </div>
                {!isEphemeral && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      addMultisigVault({
                        id: crypto.randomUUID(),
                        m, n, pubkeys,
                        address: result.address,
                        createdAt: Date.now()
                      });
                      alert('Multisig vault saved');
                    }} 
                    className="font-mono border-primary/50 text-primary hover:bg-primary/10"
                  >
                    SAVE VAULT
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground">P2WSH Address</label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={result.address} className="font-mono text-xs bg-black/50 text-primary" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(result.address)}>
                      {copied === result.address ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground">Witness Script (Hex)</label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={result.witnessScriptHex} className="font-mono text-xs bg-black/50" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(result.witnessScriptHex)}>
                      {copied === result.witnessScriptHex ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="bg-primary/10 border border-primary/20 p-3 rounded-md flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-primary/80 font-mono">
                    Save the witness script. You cannot spend from a P2WSH address without it, even if you have the keys.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
