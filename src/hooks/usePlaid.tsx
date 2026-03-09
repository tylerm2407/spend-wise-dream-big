import { useState, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export function usePlaid() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [isExchanging, setIsExchanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldOpen, setShouldOpen] = useState(false);

  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess: async (public_token, _metadata) => {
      setIsExchanging(true);
      try {
        const { error: invokeError } = await supabase.functions.invoke('plaid-exchange-token', {
          body: { public_token },
        });
        if (invokeError) throw invokeError;
        queryClient.invalidateQueries({ queryKey: ['investment-accounts'] });
        toast({ title: 'Account linked!', description: 'Your investment account has been synced.' });
      } catch (err) {
        setError('Failed to link account. Please try again.');
        toast({ title: 'Link failed', variant: 'destructive' });
      } finally {
        setIsExchanging(false);
        setShouldOpen(false);
        setLinkToken(null);
      }
    },
    onExit: () => {
      setShouldOpen(false);
      setLinkToken(null);
    },
  });

  // Auto-open when token is ready and user requested it
  useEffect(() => {
    if (ready && linkToken && shouldOpen) {
      open();
    }
  }, [ready, linkToken, shouldOpen, open]);

  const openPlaidLink = async () => {
    setError(null);
    setIsLoadingToken(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('plaid-create-link-token');
      if (invokeError || !data?.link_token) throw invokeError || new Error('No link token returned');
      setLinkToken(data.link_token);
      setShouldOpen(true);
    } catch (err) {
      setError('Failed to start account linking. Please try again.');
      toast({ title: 'Setup failed', variant: 'destructive' });
    } finally {
      setIsLoadingToken(false);
    }
  };

  return { openPlaidLink, isLoading: isLoadingToken || isExchanging, error };
}
