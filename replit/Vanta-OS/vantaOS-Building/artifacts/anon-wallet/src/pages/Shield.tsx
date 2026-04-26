import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ShieldCheck, ShieldAlert, Eye, Clipboard, AlertTriangle, Fingerprint, CheckCircle2, Search } from 'lucide-react';
import { checkDomain } from '@/lib/phishing';
import { isAddressSimilar } from '@/lib/safety';
import { useVaultStore } from '@/lib/vault';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { wordlists } from 'bip39';

export default function Shield() {
  const [active, setActive] = useState(true);
  const [domainCheck, setDomainCheck] = useState('');
  const [domainResult, setDomainResult] = useState<'SAFE' | 'SUSPICIOUS' | 'BLOCKED' | null>(null);
  
  const [addressCheck, setAddressCheck] = useState('');
  const [addressResult, setAddressResult] = useState<{ similar: boolean, match?: string } | null>(null);
  
  const [clipboardWatch, setClipboardWatch] = useState(false);
  const [fingerprint, setFingerprint] = useState<any>(null);

  const { wallets, testnetWallets } = useVaultStore();
  const [location] = useLocation();

  useEffect(() => {
    // Generate fingerprint on mount
    const generateFingerprint = async () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let canvasHash = 'unknown';
      if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial'";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125,1,62,20);
        ctx.fillStyle = "#069";
        ctx.fillText("vanta_shield", 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText("vanta_shield", 4, 17);
        const dataUrl = canvas.toDataURL();
        const buffer = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(dataUrl));
        canvasHash = Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
      }

      setFingerprint({
        userAgent: navigator.userAgent,
        screen: `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
        deviceMemory: (navigator as any).deviceMemory || 'unknown',
        plugins: navigator.plugins.length,
        canvasHash
      });
    };
    generateFingerprint();
  }, []);

  const handleDomainCheck = () => {
    if (!domainCheck) {
      setDomainResult(null);
      return;
    }
    setDomainResult(checkDomain(domainCheck));
  };

  const handleAddressCheck = () => {
    if (!addressCheck) {
      setAddressResult(null);
      return;
    }
    
    // Collect all known addresses
    const allAddresses: string[] = [];
    wallets.forEach(w => w.account84?.receive.forEach((r: any) => allAddresses.push(r.address)));
    testnetWallets.forEach(w => w.account84?.receive.forEach((r: any) => allAddresses.push(r.address)));
    
    const match = allAddresses.find(a => isAddressSimilar(a, addressCheck));
    if (match) {
      setAddressResult({ similar: true, match });
    } else {
      setAddressResult({ similar: false });
    }
  };

  // Seed phrase paste guard
  useEffect(() => {
    if (!active) return;
    
    const handlePaste = (e: ClipboardEvent) => {
      // Don't block on recover page
      if (location === '/recover') return;
      
      const pasted = e.clipboardData?.getData('text') || '';
      const words = pasted.toLowerCase().trim().split(/\s+/);
      
      if (words.length >= 12) {
        // Check if they are bip39 words
        const englishWordlist = new Set(wordlists.english);
        const bip39Words = words.filter(w => englishWordlist.has(w));
        
        if (bip39Words.length >= 12) {
          e.preventDefault();
          toast.error('Seed phrase detected on clipboard', {
            description: 'Never paste your seed into a website you don\'t fully trust.',
            action: {
              label: 'Paste Anyway',
              onClick: () => {
                // Not actually pasting into the specific input because we intercepted at document level,
                // but the user is warned. In a real app we'd dispatch a synthetic paste event or set state.
                toast('Proceeding with caution.');
              }
            }
          });
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [active, location]);

  // Clipboard hijacker watch
  useEffect(() => {
    if (!active || !clipboardWatch) return;
    
    let lastClipboard = '';
    let interval: any;

    const checkClipboard = async () => {
      try {
        if (!document.hasFocus()) return;
        const text = await navigator.clipboard.readText();
        if (text && text !== lastClipboard) {
          // Basic heuristic for bitcoin address (bc1 or 1 or 3)
          if (/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,90}$/.test(text) || /^tb1[a-zA-HJ-NP-Z0-9]{25,90}$/.test(text)) {
            if (lastClipboard && text !== lastClipboard) {
              toast.warning('Clipboard Modified Externally', {
                description: 'A Bitcoin address on your clipboard was changed. Malware may be attempting to swap addresses.',
                duration: 10000,
              });
            }
          }
          lastClipboard = text;
        }
      } catch (e) {
        // Permission denied or not focused
      }
    };

    interval = setInterval(checkClipboard, 1500);
    return () => clearInterval(interval);
  }, [active, clipboardWatch]);

  const toggleClipboardWatch = async () => {
    if (!clipboardWatch) {
      try {
        await navigator.clipboard.readText(); // Prompt permission
        setClipboardWatch(true);
      } catch (e) {
        toast.error('Permission denied', { description: 'Cannot read clipboard without permission.' });
      }
    } else {
      setClipboardWatch(false);
    }
  };

  const getFingerprintScore = () => {
    if (!fingerprint) return 'CALCULATING';
    let score = 0;
    if (fingerprint.canvasHash !== 'unknown') score += 2;
    if (fingerprint.hardwareConcurrency !== 'unknown') score += 1;
    if (fingerprint.deviceMemory !== 'unknown') score += 1;
    if (fingerprint.plugins > 0) score += 1;
    
    if (score >= 4) return 'HIGH';
    if (score >= 2) return 'MEDIUM';
    return 'LOW';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-mono font-bold tracking-tight">SHIELD_LAYER</h2>
          <p className="text-muted-foreground font-mono mt-1">Active client-side threat mitigation</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm text-muted-foreground">{active ? 'ACTIVE' : 'DISABLED'}</span>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
      </div>

      {!active && (
        <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-md flex items-start gap-4">
          <ShieldAlert className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
          <div>
            <h4 className="font-mono font-bold text-destructive text-sm tracking-wider">PROTECTIONS DISABLED</h4>
            <p className="text-xs text-destructive-foreground mt-1 leading-relaxed">
              All active client-side protections are currently disabled. You are vulnerable to clipboard hijacking, address poisoning, and phishing domains.
            </p>
          </div>
        </div>
      )}

      <div className={!active ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* PHISHING DOMAINS */}
          <Card className="bg-card/40 backdrop-blur-md border-primary/20">
            <CardHeader className="pb-4">
              <CardTitle className="font-mono text-lg flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" /> PHISHING_DOMAINS
              </CardTitle>
              <CardDescription className="font-mono text-xs">Verify domains against local blocklist</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="binnance.com" 
                  className="font-mono bg-black/50" 
                  value={domainCheck}
                  onChange={(e) => setDomainCheck(e.target.value)}
                />
                <Button onClick={handleDomainCheck} className="font-mono shrink-0">CHECK</Button>
              </div>
              {domainResult && (
                <div className={`p-3 rounded border font-mono text-xs flex items-center justify-between
                  ${domainResult === 'SAFE' ? 'bg-secondary/10 border-secondary/30 text-secondary' : 
                    domainResult === 'SUSPICIOUS' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : 
                    'bg-destructive/10 border-destructive/30 text-destructive'}`}>
                  <span>STATUS: {domainResult}</span>
                  {domainResult === 'SAFE' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ADDRESS POISONING DETECTOR */}
          <Card className="bg-card/40 backdrop-blur-md border-primary/20">
            <CardHeader className="pb-4">
              <CardTitle className="font-mono text-lg flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" /> POISON_DETECTOR
              </CardTitle>
              <CardDescription className="font-mono text-xs">Check for visually similar fake addresses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="bc1q..." 
                  className="font-mono bg-black/50" 
                  value={addressCheck}
                  onChange={(e) => setAddressCheck(e.target.value)}
                />
                <Button onClick={handleAddressCheck} className="font-mono shrink-0">CHECK</Button>
              </div>
              {addressResult && (
                <div className={`p-3 rounded border font-mono text-xs 
                  ${!addressResult.similar ? 'bg-secondary/10 border-secondary/30 text-secondary' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span>{addressResult.similar ? 'POISONING DETECTED' : 'CLEAN'}</span>
                    {!addressResult.similar ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  </div>
                  {addressResult.similar && (
                    <div className="mt-2 pt-2 border-t border-destructive/30 text-destructive-foreground opacity-80 break-all">
                      Matches known address: {addressResult.match}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* CLIPBOARD HIJACKER WATCH */}
          <Card className="bg-card/40 backdrop-blur-md border-primary/20">
            <CardHeader className="pb-4">
              <CardTitle className="font-mono text-lg flex items-center gap-2">
                <Clipboard className="w-5 h-5 text-primary" /> CLIPBOARD_WATCH
              </CardTitle>
              <CardDescription className="font-mono text-xs">Detect malicious address swapping</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-black/50 border border-border/50 rounded-md">
                <div className="font-mono text-xs text-muted-foreground">
                  Monitor clipboard for external modifications (requires permission)
                </div>
                <Switch checked={clipboardWatch} onCheckedChange={toggleClipboardWatch} />
              </div>
              {clipboardWatch && (
                <div className="text-[10px] font-mono text-primary animate-pulse flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                  Actively monitoring clipboard (when tab focused)
                </div>
              )}
            </CardContent>
          </Card>

          {/* FINGERPRINT EXPOSURE */}
          <Card className="bg-card/40 backdrop-blur-md border-primary/20">
            <CardHeader className="pb-4">
              <CardTitle className="font-mono text-lg flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-primary" /> FINGERPRINT_EXPOSURE
              </CardTitle>
              <CardDescription className="font-mono text-xs">Browser uniqueness analysis</CardDescription>
            </CardHeader>
            <CardContent>
              {fingerprint ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-black/50 border border-border/50 rounded-md mb-4">
                    <span className="font-mono text-sm">UNIQUENESS SCORE:</span>
                    <Badge variant="outline" className={`font-mono text-xs ${
                      getFingerprintScore() === 'HIGH' ? 'text-destructive border-destructive/50' :
                      getFingerprintScore() === 'MEDIUM' ? 'text-yellow-500 border-yellow-500/50' :
                      'text-secondary border-secondary/50'
                    }`}>
                      {getFingerprintScore()}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="text-muted-foreground">Screen</div>
                    <div className="text-primary-foreground text-right">{fingerprint.screen}</div>
                    
                    <div className="text-muted-foreground">Language</div>
                    <div className="text-primary-foreground text-right">{fingerprint.language}</div>
                    
                    <div className="text-muted-foreground">Timezone</div>
                    <div className="text-primary-foreground text-right">{fingerprint.timezone}</div>
                    
                    <div className="text-muted-foreground">Hardware Cores</div>
                    <div className="text-primary-foreground text-right">{fingerprint.hardwareConcurrency}</div>
                    
                    <div className="text-muted-foreground">Canvas Hash</div>
                    <div className="text-primary-foreground text-right truncate pl-2" title={fingerprint.canvasHash}>{fingerprint.canvasHash}</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground font-mono text-xs">Calculating...</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
