export const formatNGN = (kobo: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(kobo / 100);

export const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat('en-NG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr));

export const txTypeLabel: Record<string, string> = {
  airtime: 'Airtime',
  data: 'Data',
  cable: 'Cable TV',
  electricity: 'Electricity',
  exam: 'Exam PIN',
  wallet_fund: 'Wallet Fund',
  wallet_transfer_debit: 'Transfer Sent',
  wallet_transfer_credit: 'Transfer Received',
  commission: 'Commission',
  cashback: 'Cashback',
  referral_bonus: 'Referral Bonus',
  refund: 'Refund',
};

export const networkColors: Record<string, string> = {
  MTN: 'bg-yellow-400 text-yellow-900',
  Airtel: 'bg-red-500 text-white',
  Glo: 'bg-green-600 text-white',
  '9mobile': 'bg-green-400 text-white',
};

export const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    return axiosError.response?.data?.message || 'Something went wrong';
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
};
