import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NetworksState {
  tor: 'DISCONNECTED' | 'CONNECTING' | 'ACTIVE';
  i2p: 'DISCONNECTED' | 'CONNECTING' | 'ACTIVE';
  yggdrasil: 'DISCONNECTED' | 'CONNECTING' | 'ACTIVE';
  hyphanet: 'DISCONNECTED' | 'CONNECTING' | 'ACTIVE';
  routingMode: 'SINGLE' | 'ROUND_ROBIN' | 'MIXED_MULTI_PATH';
  customMix: { tor: number; i2p: number; yggdrasil: number; hyphanet: number };
  setNetworkState: (network: 'tor' | 'i2p' | 'yggdrasil' | 'hyphanet', state: 'DISCONNECTED' | 'CONNECTING' | 'ACTIVE') => void;
  setRoutingMode: (mode: 'SINGLE' | 'ROUND_ROBIN' | 'MIXED_MULTI_PATH') => void;
  setCustomMix: (mix: { tor: number; i2p: number; yggdrasil: number; hyphanet: number }) => void;
}

export const useNetworksStore = create<NetworksState>()(
  persist(
    (set) => ({
      tor: 'DISCONNECTED',
      i2p: 'DISCONNECTED',
      yggdrasil: 'DISCONNECTED',
      hyphanet: 'DISCONNECTED',
      routingMode: 'SINGLE',
      customMix: { tor: 100, i2p: 0, yggdrasil: 0, hyphanet: 0 },
      setNetworkState: (network, state) => set({ [network]: state }),
      setRoutingMode: (mode) => set({ routingMode: mode }),
      setCustomMix: (mix) => set({ customMix: mix }),
    }),
    {
      name: 'vanta-networks-storage',
    }
  )
);
