import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { useVaultStore } from '@/lib/vault';
import { Wallet as WalletIcon, Send, Download, History, ShieldAlert } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function Wallet() {
  const { wallets } = useVaultStore();
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [opReturn, setOpReturn] = useState('');
  
  const selectedWallet = wallets.find(w => w.id === selectedWalletId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-mono font-bold tracking-tight">TRANSACTION_CONTROL</h2>
          <p className="text-muted-foreground font-mono mt-1">Manage funds and construct PSBTs</p>
        </div>
        <div className="w-64">
          <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
            <SelectTrigger className="font-mono bg-black/50 border-primary/30">
              <SelectValue placeholder="Select a wallet..." />
            </SelectTrigger>
            <SelectContent>
              {wallets.map(w => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedWallet ? (
        <Card className="bg-card/40 backdrop-blur-md border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <WalletIcon className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-mono">No wallet selected.</p>
            <p className="text-sm font-mono opacity-50">Generate or recover a wallet to continue.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="receive" className="w-full">
          <TabsList className="w-full bg-black/50 grid grid-cols-3 max-w-md mb-6">
            <TabsTrigger value="receive" className="font-mono text-xs"><Download className="w-3 h-3 mr-2"/> RECEIVE</TabsTrigger>
            <TabsTrigger value="send" className="font-mono text-xs"><Send className="w-3 h-3 mr-2"/> SEND</TabsTrigger>
            <TabsTrigger value="history" className="font-mono text-xs"><History className="w-3 h-3 mr-2"/> HISTORY</TabsTrigger>
          </TabsList>

          <TabsContent value="receive">
            <Card className="bg-card/40 backdrop-blur-md border-primary/20 max-w-2xl">
              <CardHeader>
                <CardTitle className="font-mono">RECEIVING_ADDRESS</CardTitle>
                <CardDescription className="font-mono">P2WPKH Native Segwit</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-[0_0_30px_rgba(0,255,255,0.2)]">
                  <QRCodeSVG value={selectedWallet.account84.receive[0].address} size={200} />
                </div>
                <div className="w-full space-y-2">
                  <Input 
                    readOnly 
                    value={selectedWallet.account84.receive[0].address} 
                    className="font-mono text-center text-primary bg-black/50 border-primary/30"
                  />
                  <p className="text-xs text-center font-mono text-muted-foreground">Derivation path: {selectedWallet.account84.receive[0].path}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="send">
            <Card className="bg-card/40 backdrop-blur-md border-primary/20">
              <CardHeader>
                <CardTitle className="font-mono flex items-center justify-between">
                  <span>CONSTRUCT_TX</span>
                  <span className="text-xs font-normal text-muted-foreground px-2 py-1 bg-white/5 rounded border border-white/10">LOCAL SANDBOX</span>
                </CardTitle>
                <CardDescription className="font-mono">Build and sign a transaction. Balance and UTXOs must be mocked locally.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-muted-foreground">Recipient Address</label>
                      <Input placeholder="bc1q..." className="font-mono bg-black/50" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-muted-foreground">Amount (BTC)</label>
                      <Input type="number" step="0.00000001" placeholder="0.00" className="font-mono bg-black/50" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-xs font-mono text-muted-foreground">Fee Rate</label>
                        <label className="text-xs font-mono text-primary">12 sat/vB</label>
                      </div>
                      <Slider defaultValue={[12]} max={100} min={1} step={1} className="py-2" />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-xs font-mono text-muted-foreground">OP_RETURN Data (Optional)</label>
                        <label className="text-xs font-mono text-muted-foreground">{opReturn.length}/80 bytes</label>
                      </div>
                      <Textarea 
                        placeholder="Attach immutable hex/text to the blockchain..." 
                        className="font-mono bg-black/50 h-[116px] resize-none"
                        value={opReturn}
                        onChange={(e) => setOpReturn(e.target.value)}
                        maxLength={80}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50 flex justify-end gap-4">
                  <Button variant="outline" className="font-mono border-primary/20 hover:bg-primary/10 hover:text-primary">
                    SIGN LOCALLY
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="bg-card/40 backdrop-blur-md border-primary/20">
              <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                <History className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-mono">No transaction history in this session.</p>
                <p className="text-sm font-mono opacity-50 mt-2 text-center max-w-md">Vanta operates statelessly against the blockchain. Connect to an electrum server to index history.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
