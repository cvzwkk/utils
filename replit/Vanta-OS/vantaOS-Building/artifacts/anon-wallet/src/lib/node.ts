import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NodeState {
  isRunning: boolean;
  progress: number; // 0 to 100
  blockHeight: number;
  peers: Array<{ id: string; address: string; ping: number; version: string; services: string }>;
  mempoolSize: number;
  toggleNode: () => void;
  setProgress: (p: number) => void;
  setBlockHeight: (h: number) => void;
  setMempoolSize: (size: number) => void;
  generatePeers: () => void;
}

export const useNodeStore = create<NodeState>()(
  persist(
    (set, get) => ({
      isRunning: false,
      progress: 0,
      blockHeight: 2800000,
      peers: [],
      mempoolSize: 0,
      toggleNode: () => {
        const isRunning = !get().isRunning;
        set({ isRunning });
        if (isRunning && get().peers.length === 0) {
          get().generatePeers();
        }
      },
      setProgress: (p) => set({ progress: p }),
      setBlockHeight: (h) => set({ blockHeight: h }),
      setMempoolSize: (size) => set({ mempoolSize: size }),
      generatePeers: () => {
        const fakePeers = Array.from({ length: Math.floor(Math.random() * 5) + 8 }).map((_, i) => {
          const isTor = Math.random() > 0.5;
          const address = isTor 
            ? `${Math.random().toString(36).substring(2, 15)}...onion:8333`
            : `${Math.random().toString(36).substring(2, 10)}.b32.i2p:8333`;
          return {
            id: `peer-${i}`,
            address,
            ping: Math.floor(Math.random() * 300) + 20,
            version: '/Satoshi:25.0.0/',
            services: 'NODE_NETWORK | NODE_WITNESS'
          };
        });
        set({ peers: fakePeers });
      }
    }),
    {
      name: 'vanta-node-storage',
      partialize: (state) => ({ progress: state.progress, blockHeight: state.blockHeight }),
    }
  )
);
