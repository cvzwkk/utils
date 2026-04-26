import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppShell } from "@/components/AppShell";

import Dashboard from "@/pages/Dashboard";
import Generate from "@/pages/Generate";
import Recover from "@/pages/Recover";
import Multisig from "@/pages/Multisig";
import Wallet from "@/pages/Wallet";
import Stego from "@/pages/Stego";
import Mixnet from "@/pages/Mixnet";
import Entropy from "@/pages/Entropy";
import Testnet from "@/pages/Testnet";
import Node from "@/pages/Node";
import Networks from "@/pages/Networks";
import Browser from "@/pages/Browser";
import CoinJoin from "@/pages/CoinJoin";
import Shield from "@/pages/Shield";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/generate" component={Generate} />
        <Route path="/recover" component={Recover} />
        <Route path="/multisig" component={Multisig} />
        <Route path="/wallet" component={Wallet} />
        <Route path="/stego" component={Stego} />
        <Route path="/mixnet" component={Mixnet} />
        <Route path="/entropy" component={Entropy} />
        <Route path="/testnet" component={Testnet} />
        <Route path="/node" component={Node} />
        <Route path="/networks" component={Networks} />
        <Route path="/browser" component={Browser} />
        <Route path="/coinjoin" component={CoinJoin} />
        <Route path="/shield" component={Shield} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
