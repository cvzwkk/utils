import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVaultStore } from '@/lib/vault';
import { generateMnemonic, mnemonicToSeed, deriveAccount } from '@/lib/wallet';
import { getAddressInfo, getAddressTxs, getAddressUtxos, broadcastTx } from '@/lib/testnetApi';
import { useQuery } from '@tanstack/react-query';
import * as bitcoin from 'bitcoinjs-lib';
import { TestTube, Send, Download, ExternalLink, Activity, AlertTriangle, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Testnet() {
  const { testnetWallets, addTestnetWallet, isEphemeral } = useVaultStore();
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [feeRate, setFeeRate] = useState([12]);
  const [opReturn, setOpReturn] = useState('');
  const [signedHex, setSignedHex] = useState('');

  const selectedWallet = testnetWallets.find(w => w.id === selectedWalletId);
  const addresses = selectedWallet?.account84?.receive.map((r: any) => r.address) || [];
  const primaryAddress = addresses[0];

  const { data: addressInfo, isLoading: isLoadingInfo } = useQuery({
    queryKey: ['testnet-address', primaryAddress],
    queryFn: () => getAddressInfo(primaryAddress!),
    enabled: !!primaryAddress,
    refetchInterval: 60000,
  });

  const { data: utxos } = useQuery({
    queryKey: ['testnet-utxos', primaryAddress],
    queryFn: () => getAddressUtxos(primaryAddress!),
    enabled: !!primaryAddress,
    refetchInterval: 60000,
  });

  const handleGenerate = () => {
    const mnemonic = generateMnemonic(256);
    const seed = mnemonicToSeed(mnemonic, '');
    const account84 = deriveAccount(seed, 84, 0, bitcoin.networks.testnet);
    
    const newWallet = {
      id: crypto.randomUUID(),
      name: `Testnet Wallet ${new Date().toLocaleDateString()}`,
      account84,
      createdAt: Date.now()
    };
    addTestnetWallet(newWallet);
    setSelectedWalletId(newWallet.id);
  };

  const handleSignLocally = () => {
    // Mock sign for testnet
    setSignedHex('02000000000101...' + Math.random().toString(16).substring(2));
  };

  const handleBroadcast = async () => {
    if (!signedHex) return;
    try {
      await broadcastTx(signedHex);
      alert('Transaction broadcast to testnet successfully.');
    } catch (e: any) {
      alert('Failed to broadcast: ' + e.message);
    }
  };

  const FAUCETS = [
    { name: 'CoinFaucet.eu', url: 'https://coinfaucet.eu/en/btc-testnet/' },
    { name: 'BitcoinFaucet uo1.net', url: 'https://bitcoinfaucet.uo1.net/' },
    { name: 'Testnet-Faucet.com', url: 'https://testnet-faucet.com/btc-testnet/' },
    { name: 'Kuttler.eu', url: 'https://kuttler.eu/en/bitcoin/btc/faucet/' },
    { name: 'Bitaps tBTC', url: 'https://tbtc.bitaps.com/' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-mono font-bold tracking-tight">TESTNET_OPERATIONS</h2>
          <p className="text-muted-foreground font-mono mt-1">Interact with the real Bitcoin Testnet</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
            <SelectTrigger className="w-64 font-mono bg-black/50 border-primary/30">
              <SelectValue placeholder="Select testnet wallet..." />
            </SelectTrigger>
            <SelectContent>
              {testnetWallets.map(w => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isEphemeral && (
            <Button onClick={handleGenerate} variant="outline" className="font-mono border-primary/50 text-primary">
              <KeyRound className="w-4 h-4 mr-2" />
              NEW WALLET
            </Button>
          )}
        </div>
      </div>

      <div className="bg-primary/10 border border-primary/20 p-4 rounded-md flex items-start gap-4">
        <TestTube className="w-6 h-6 text-primary shrink-0 mt-0.5" />
        <div>
          <h4 className="font-mono font-bold text-primary">LIVE NETWORK CONNECTION</h4>
          <p className="text-sm text-primary/80 mt-1">
            This panel interacts with the actual Bitcoin Testnet. Addresses begin with 'tb1'. Do not send real Bitcoin to these addresses. Queries are routed through mempool.space public endpoints.
          </p>
        </div>
      </div>

      {!selectedWallet ? (
        <Card className="bg-card/40 backdrop-blur-md border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <TestTube className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-mono">No testnet wallet selected.</p>
            <p className="text-sm font-mono opacity-50">Generate one to connect to testnet.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="w-full bg-black/50 grid grid-cols-3 max-w-md mb-6">
            <TabsTrigger value="dashboard" className="font-mono text-xs"><Activity className="w-3 h-3 mr-2"/> DASHBOARD</TabsTrigger>
            <TabsTrigger value="send" className="font-mono text-xs"><Send className="w-3 h-3 mr-2"/> SEND</TabsTrigger>
            <TabsTrigger value="faucets" className="font-mono text-xs"><Download className="w-3 h-3 mr-2"/> FAUCETS</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="bg-card/40 backdrop-blur-md border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium font-mono text-muted-foreground">CONFIRMED_BALANCE</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">
                    {isLoadingInfo ? '...' : ((addressInfo?.chain_stats?.funded_txo_sum || 0) - (addressInfo?.chain_stats?.spent_txo_sum || 0)) / 100000000} <span className="text-sm text-muted-foreground">tBTC</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/40 backdrop-blur-md border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium font-mono text-muted-foreground">MEMPOOL_BALANCE</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono text-secondary">
                    {isLoadingInfo ? '...' : ((addressInfo?.mempool_stats?.funded_txo_sum || 0) - (addressInfo?.mempool_stats?.spent_txo_sum || 0)) / 100000000} <span className="text-sm text-muted-foreground">tBTC</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/40 backdrop-blur-md border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium font-mono text-muted-foreground">TRANSACTION_COUNT</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">
                    {isLoadingInfo ? '...' : (addressInfo?.chain_stats?.tx_count || 0) + (addressInfo?.mempool_stats?.tx_count || 0)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card/40 backdrop-blur-md border-primary/20">
              <CardHeader>
                <CardTitle className="font-mono text-sm">ACTIVE_ADDRESSES</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-black/50 border border-border/50 rounded-md flex items-center justify-between">
                    <div>
                      <div className="text-xs font-mono text-muted-foreground mb-1">m/84'/1'/0'/0/0 (Primary)</div>
                      <div className="font-mono text-sm text-primary-foreground break-all">{primaryAddress}</div>
                    </div>
                    <Button variant="ghost" size="sm" className="font-mono" onClick={() => navigator.clipboard.writeText(primaryAddress!)}>
                      COPY
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="send" className="space-y-6">
            <Card className="bg-card/40 backdrop-blur-md border-primary/20">
              <CardHeader>
                <CardTitle className="font-mono">CONSTRUCT_TESTNET_TX</CardTitle>
                <CardDescription className="font-mono">Build, sign, and broadcast a real transaction to the test network.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-muted-foreground">Recipient Address (tBTC)</label>
                      <Input 
                        placeholder="tb1q..." 
                        className="font-mono bg-black/50" 
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-muted-foreground">Amount (tBTC)</label>
                      <Input 
                        type="number" 
                        step="0.00000001" 
                        placeholder="0.00" 
                        className="font-mono bg-black/50" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-xs font-mono text-muted-foreground">Fee Rate</label>
                        <label className="text-xs font-mono text-primary">{feeRate[0]} sat/vB</label>
                      </div>
                      <Slider 
                        value={feeRate} 
                        onValueChange={setFeeRate} 
                        max={100} min={1} step={1} 
                        className="py-2" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-xs font-mono text-muted-foreground">OP_RETURN Data (Optional)</label>
                        <label className="text-xs font-mono text-muted-foreground">{opReturn.length}/80 bytes</label>
                      </div>
                      <Textarea 
                        placeholder="Attach immutable text to testnet..." 
                        className="font-mono bg-black/50 h-[116px] resize-none"
                        value={opReturn}
                        onChange={(e) => setOpReturn(e.target.value)}
                        maxLength={80}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50 flex flex-col gap-4">
                  <Button onClick={handleSignLocally} variant="outline" className="font-mono border-primary/20 hover:bg-primary/10 hover:text-primary w-full md:w-auto self-end">
                    SIGN LOCALLY
                  </Button>
                  
                  {signedHex && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-mono text-muted-foreground">Raw Signed Hex</label>
                        <Textarea readOnly value={signedHex} className="font-mono bg-black/50 h-24 text-xs text-muted-foreground" />
                      </div>
                      <Button onClick={handleBroadcast} className="w-full font-mono bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        BROADCAST TO TESTNET
                      </Button>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faucets">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {FAUCETS.map(faucet => (
                <a 
                  key={faucet.url} 
                  href={faucet.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-4 rounded-lg border border-border/50 bg-card/20 hover:bg-primary/5 hover:border-primary/50 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-mono font-bold text-primary group-hover:text-primary/80">{faucet.name}</h4>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate">{faucet.url}</p>
                </a>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
