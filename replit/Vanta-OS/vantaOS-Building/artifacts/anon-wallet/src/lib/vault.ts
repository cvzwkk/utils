import { create } from 'zustand';

interface VaultState {
  wallets: any[];
  testnetWallets: any[];
  multisigVaults: any[];
  sessionPassphrase: string | null;
  isEphemeral: boolean;
  setSessionPassphrase: (pass: string | null) => void;
  setEphemeral: (ephemeral: boolean) => void;
  addWallet: (wallet: any) => void;
  addTestnetWallet: (wallet: any) => void;
  addMultisigVault: (vault: any) => void;
}

export const useVaultStore = create<VaultState>((set) => ({
  wallets: [],
  testnetWallets: [],
  multisigVaults: [],
  sessionPassphrase: null,
  isEphemeral: false,
  setSessionPassphrase: (pass) => set({ sessionPassphrase: pass }),
  setEphemeral: (ephemeral) => set({ isEphemeral: ephemeral }),
  addWallet: (wallet) => set((state) => ({ wallets: [...state.wallets, wallet] })),
  addTestnetWallet: (wallet) => set((state) => ({ testnetWallets: [...state.testnetWallets, wallet] })),
  addMultisigVault: (vault) => set((state) => ({ multisigVaults: [...state.multisigVaults, vault] })),
}));
