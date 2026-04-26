import { create } from 'zustand';

interface EntropyState {
  pool: Uint8Array;
  hash: string;
  bits: number;
  addBytes: (bytes: Uint8Array) => void;
  drain: (n: number) => Uint8Array;
}

export const useEntropyStore = create<EntropyState>((set, get) => ({
  pool: new Uint8Array(0),
  hash: '',
  bits: 0,
  addBytes: async (bytes) => {
    const { pool } = get();
    const newPool = new Uint8Array(pool.length + bytes.length);
    newPool.set(pool, 0);
    newPool.set(bytes, pool.length);
    
    // Calculate SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', newPool);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    set({
      pool: newPool,
      hash: hashHex,
      bits: Math.min(newPool.length * 8, 4096)
    });
  },
  drain: (n) => {
    const { pool } = get();
    const drained = pool.slice(0, n);
    const remaining = pool.slice(n);
    set({ pool: remaining, bits: remaining.length * 8 });
    return drained;
  }
}));
