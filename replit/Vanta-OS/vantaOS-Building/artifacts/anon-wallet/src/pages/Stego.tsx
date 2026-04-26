import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { encodeLSB, decodeLSB, capacityBytes } from '@/lib/stego';
import { useVaultStore } from '@/lib/vault';
import { useParticleStore } from '@/components/ParticleBackdrop';
import { ShieldAlert, Download, Upload, Image as ImageIcon, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Stego() {
  const [embedFile, setEmbedFile] = useState<File | null>(null);
  const [extractFile, setExtractFile] = useState<File | null>(null);
  const [payload, setPayload] = useState('');
  const [embedPass, setEmbedPass] = useState('');
  const [extractPass, setExtractPass] = useState('');
  const [capacity, setCapacity] = useState(0);
  const [encodedUrl, setEncodedUrl] = useState<string | null>(null);
  const [extractedPayload, setExtractedPayload] = useState<string | null>(null);

  const { burst } = useParticleStore();

  const handleEmbedFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEmbedFile(file);
    
    // Calculate rough capacity
    const img = new Image();
    img.onload = () => {
      setCapacity(capacityBytes(img.width, img.height));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  };

  const handleEncode = async () => {
    if (!embedFile || !payload) return;
    try {
      const data = new TextEncoder().encode(payload);
      const resultBlob = await encodeLSB(embedFile, data, embedPass || undefined);
      setEncodedUrl(URL.createObjectURL(resultBlob));
      burst(window.innerWidth / 4, window.innerHeight / 2);
    } catch (e: any) {
      alert('Encode failed: ' + e.message);
    }
  };

  const handleDecode = async () => {
    if (!extractFile) return;
    try {
      const data = await decodeLSB(extractFile, extractPass || undefined);
      setExtractedPayload(new TextDecoder().decode(data));
      burst((window.innerWidth / 4) * 3, window.innerHeight / 2);
    } catch (e: any) {
      alert('Decode failed: ' + e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-mono font-bold tracking-tight">STEGANOGRAPHY</h2>
        <p className="text-muted-foreground font-mono mt-1">Conceal cryptographic data within image least-significant bits</p>
      </div>

      <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-md flex items-start gap-4">
        <ShieldAlert className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
        <div>
          <h4 className="font-mono font-bold text-destructive-foreground">CARRIER NETWORK WARNING</h4>
          <p className="text-sm text-destructive-foreground/80 mt-1">
            Social media platforms (Twitter, Instagram, WhatsApp) recompress images, destroying LSB data. 
            Use uncompressed channels: Signal (sent as document), Telegram (sent as file), IPFS, Tor, or direct USB transfer.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/40 backdrop-blur-md border-primary/20">
          <CardHeader>
            <CardTitle className="font-mono flex items-center gap-2"><Lock className="w-4 h-4 text-primary"/> EMBED_DATA</CardTitle>
            <CardDescription className="font-mono">Hide a payload in a carrier image</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-primary/50 transition-colors bg-black/20 relative">
              <input 
                type="file" 
                accept="image/png,image/jpeg"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={handleEmbedFileChange}
              />
              <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="font-mono text-sm text-muted-foreground">
                {embedFile ? embedFile.name : 'Select Carrier Image (PNG/JPG)'}
              </p>
              {capacity > 0 && (
                <p className="font-mono text-xs text-primary mt-2">Max Capacity: ~{capacity} bytes</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">Payload Data</label>
              <Textarea 
                placeholder="Enter mnemonic, private key, or JSON..."
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                className="font-mono bg-black/50 min-h-[100px] border-primary/30"
              />
              <p className="text-xs font-mono text-right text-muted-foreground">
                {new TextEncoder().encode(payload).length} bytes
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">AES-GCM Encryption Key (Optional)</label>
              <Input 
                type="password"
                placeholder="Encrypt payload before embedding..."
                value={embedPass}
                onChange={(e) => setEmbedPass(e.target.value)}
                className="font-mono bg-black/50 border-primary/30"
              />
            </div>

            <Button 
              onClick={handleEncode} 
              className="w-full font-mono mt-2" 
              disabled={!embedFile || !payload}
            >
              ENCODE & INJECT
            </Button>

            {encodedUrl && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-4 border-t border-border/50 mt-4">
                <a href={encodedUrl} download="artifact_stego.png">
                  <Button variant="outline" className="w-full font-mono border-primary/50 text-primary hover:bg-primary/10">
                    <Download className="w-4 h-4 mr-2" />
                    DOWNLOAD ARTIFACT.PNG
                  </Button>
                </a>
              </motion.div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-md border-secondary/20">
          <CardHeader>
            <CardTitle className="font-mono flex items-center gap-2"><Upload className="w-4 h-4 text-secondary"/> EXTRACT_DATA</CardTitle>
            <CardDescription className="font-mono">Recover a payload from a carrier image</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-secondary/50 transition-colors bg-black/20 relative">
              <input 
                type="file" 
                accept="image/png"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={(e) => setExtractFile(e.target.files?.[0] || null)}
              />
              <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="font-mono text-sm text-muted-foreground">
                {extractFile ? extractFile.name : 'Select Artifact Image (PNG only)'}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">Decryption Key (if encrypted)</label>
              <Input 
                type="password"
                placeholder="Required if payload was encrypted..."
                value={extractPass}
                onChange={(e) => setExtractPass(e.target.value)}
                className="font-mono bg-black/50 border-secondary/30"
              />
            </div>

            <Button 
              onClick={handleDecode} 
              variant="secondary"
              className="w-full font-mono mt-2 bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary/20" 
              disabled={!extractFile}
            >
              EXTRACT PAYLOAD
            </Button>

            {extractedPayload && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-4 border-t border-border/50 mt-4 space-y-2">
                <label className="text-xs font-mono text-secondary">Extracted Data</label>
                <div className="p-3 bg-black/50 border border-secondary/30 rounded-md font-mono text-sm text-secondary break-all">
                  {extractedPayload}
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
