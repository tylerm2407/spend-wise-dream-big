import { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export type PlaidBankErrorReason = 'not_configured' | 'unauthorized' | 'network' | 'unknown';

export interface PlaidBankError {
  reason: PlaidBankErrorReason;
  message: string;
}

export function usePlaidBanking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [isExchanging, setIsExchanging] = useState(false);
  const [plaidError, setPlaidError] = useState<PlaidBankError | null>(null);
  const [shouldOpen, setShouldOpen] = useState(false);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token) => {
      setIsExchanging(true);
      setPlaidError(null);
      try {
        const { data, error: invokeError } = await supabase.functions.invoke(
          'plaid-exchange-bank-token',
          { body: { public_token } },
        );
        if (invokeError) {
          let msg = invokeError.message ?? 'Unknown error';
          try {
            const context = (invokeError as any)?.context;
            const body = typeof context?.json === 'function' ? await context.json() : context;
            if (body?.error) msg = String(body.error);
          } catch { /* ignore */ }
          throw new Error(msg);
        }
        if (data?.error) throw new Error(data.error);

        const count = data?.transactions_imported ?? 0;
        const institution = data?.institution_name ?? 'your bank';
        queryClient.invalidateQueries({ queryKey: ['linked-bank-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['purchases'] });
        toast({
          title: 'Bank linked!',
          description: `${institution} connected. ${count} transactions imported.`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setPlaidError({ reason: 'unknown', message: msg });
        toast({ title: 'Link failed', description: msg, variant: 'destructive' });
      } finally {
        setIsExchanging(false);
        setShouldOpen(false);
        setLinkToken(null);
      }
    },
    onExit: (err) => {
      setShouldOpen(false);
      setLinkToken(null);
      if (err) {
        setPlaidError({ reason: 'unknown', message: err.display_message ?? err.error_message ?? 'Exited Plaid Link.' });
      }
    },
  });

  useEffect(() => {
    if (ready && linkToken && shouldOpen) open();
  }, [ready, linkToken, shouldOpen, open]);

  const openBankLink = useCallback(async () => {
    setPlaidError(null);
    setIsLoadingToken(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('plaid-link-bank');

      if (invokeError) {
        let msg = invokeError.message ?? 'Unknown error';
        try {
          const context = (invokeError as any)?.context;
          const body = typeof context?.json === 'function' ? await context.json() : context;
          if (body?.error) msg = String(body.error);
          else if (body?.message) msg = String(body.message);
        } catch { /* body wasn't JSON */ }
        const reason: PlaidBankErrorReason =
          msg.toLowerCase().includes('credential') || msg.toLowerCase().includes('configured') || msg.toLowerCase().includes('not found')
            ? 'not_configured'
            : msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('401')
            ? 'unauthorized'
            : 'unknown';
        setPlaidError({ reason, message: msg });
        return;
      }

      if (data?.error) {
        setPlaidError({ reason: 'unknown', message: data.error });
        return;
      }

      if (!data?.link_token) {
        setPlaidError({ reason: 'unknown', message: 'No link token returned.' });
        return;
      }

      setLinkToken(data.link_token);
      setShouldOpen(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setPlaidError({ reason: 'network', message: msg });
    } finally {
      setIsLoadingToken(false);
    }
  }, []);

  return {
    openBankLink,
    isLoading: isLoadingToken || isExchanging,
    plaidError,
    clearError: () => setPlaidError(null),
  };
}
