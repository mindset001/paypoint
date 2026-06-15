import { create } from 'zustand';
import type { Wallet, Transaction } from '@/types';

interface WalletState {
  wallet: Wallet | null;
  transactions: Transaction[];
  loading: boolean;
  setWallet: (wallet: Wallet) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setLoading: (loading: boolean) => void;
  clearWallet: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  wallet: null,
  transactions: [],
  loading: false,
  setWallet: (wallet) => set({ wallet }),
  setTransactions: (transactions) => set({ transactions }),
  setLoading: (loading) => set({ loading }),
  clearWallet: () => set({ wallet: null, transactions: [] }),
}));
