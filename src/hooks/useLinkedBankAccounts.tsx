import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface LinkedBankAccount {
  id: string;
  user_id: string;
  plaid_item_id: string | null;
  plaid_account_id: string | null;
  account_name: string;
  account_type: string | null;
  institution_name: string | null;
  mask: string | null;
  current_balance: number | null;
  available_balance: number | null;
  balance_synced_at: string | null;
  last_transaction_sync_at: string | null;
  created_at: string;
}

export function useLinkedBankAccounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['linked-bank-accounts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('linked_bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LinkedBankAccount[];
    },
    enabled: !!user,
  });

  const removeAccount = useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from('linked_bank_accounts')
        .delete()
        .eq('id', accountId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-bank-accounts', user?.id] });
    },
  });

  return {
    accounts,
    isLoading,
    removeAccount: removeAccount.mutateAsync,
    isRemoving: removeAccount.isPending,
  };
}
