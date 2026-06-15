'use client';
import { useCallback } from 'react';
import { useWalletStore } from '@/store/wallet.store';
import { walletApi } from '@/lib/api';

export const useWallet = () => {
  const { wallet, transactions, loading, setWallet, setTransactions, setLoading } = useWalletStore();

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await walletApi.get();
      setWallet(data.data);
    } finally {
      setLoading(false);
    }
  }, [setWallet, setLoading]);

  const fetchTransactions = useCallback(async (params?: { page?: number; type?: string }) => {
    const { data } = await walletApi.transactions(params);
    setTransactions(data.data.transactions);
    return data.data;
  }, [setTransactions]);

  return { wallet, transactions, loading, fetchWallet, fetchTransactions };
};
