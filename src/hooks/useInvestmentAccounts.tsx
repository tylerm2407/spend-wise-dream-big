import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface InvestmentAccount {
  id: string;
  user_id: string;
  account_name: string;
  account_type: 'roth_ira' | 'traditional_ira' | '401k' | 'brokerage' | 'savings' | 'other';
  institution_name: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  plaid_item_id: string | null;
  plaid_account_id: string | null;
  plaid_balance: number | null;
  plaid_balance_synced_at: string | null;
}

export interface InvestmentTransfer {
  id: string;
  user_id: string;
  account_id: string;
  amount: number;
  source_type: 'alternative_savings' | 'challenge_savings' | 'custom' | 'purchase_savings';
  source_description: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  confirmed_at: string | null;
  created_at: string;
}

interface CreateAccountInput {
  account_name: string;
  account_type: InvestmentAccount['account_type'];
  institution_name?: string;
  is_default?: boolean;
}

interface CreateTransferInput {
  account_id: string;
  amount: number;
  source_type: InvestmentTransfer['source_type'];
  source_description?: string;
}

const ACCOUNT_TYPE_LABELS: Record<InvestmentAccount['account_type'], string> = {
  roth_ira: 'Roth IRA',
  traditional_ira: 'Traditional IRA',
  '401k': '401(k)',
  brokerage: 'Brokerage',
  savings: 'Savings',
  other: 'Other',
};

export function getAccountTypeLabel(type: InvestmentAccount['account_type']) {
  return ACCOUNT_TYPE_LABELS[type] || type;
}

export function useInvestmentAccounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['investment-accounts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('investment_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });
      if (error) throw error;
      return data as InvestmentAccount[];
    },
    enabled: !!user,
  });

  const { data: transfers = [], isLoading: transfersLoading } = useQuery({
    queryKey: ['investment-transfers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('investment_transfers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as InvestmentTransfer[];
    },
    enabled: !!user,
  });

  const createAccount = useMutation({
    mutationFn: async (input: CreateAccountInput) => {
      if (!user) throw new Error('Not authenticated');
      // If setting as default, unset others first
      if (input.is_default) {
        await supabase
          .from('investment_accounts')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }
      const { data, error } = await supabase
        .from('investment_accounts')
        .insert({ user_id: user.id, ...input })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-accounts', user?.id] });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from('investment_accounts')
        .delete()
        .eq('id', accountId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-accounts', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['investment-transfers', user?.id] });
    },
  });

  const syncBalance = useMutation({
    mutationFn: async (accountId: string) => {
      const { data, error } = await supabase.functions.invoke('plaid-sync-balance', {
        body: { account_id: accountId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-accounts', user?.id] });
    },
  });

  const createTransfer = useMutation({
    mutationFn: async (input: CreateTransferInput) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('investment_transfers')
        .insert({ user_id: user.id, ...input, status: 'confirmed', confirmed_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-transfers', user?.id] });
    },
  });

  const totalInvested = transfers
    .filter(t => t.status === 'confirmed' || t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const defaultAccount = accounts.find(a => a.is_default) || accounts[0] || null;

  return {
    accounts,
    transfers,
    accountsLoading,
    transfersLoading,
    createAccount: createAccount.mutateAsync,
    deleteAccount: deleteAccount.mutateAsync,
    createTransfer: createTransfer.mutateAsync,
    syncBalance: syncBalance.mutateAsync,
    isCreatingAccount: createAccount.isPending,
    isCreatingTransfer: createTransfer.isPending,
    isSyncingBalance: syncBalance.isPending,
    totalInvested,
    defaultAccount,
  };
}
