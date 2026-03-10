import { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export type PlaidErrorReason =
  | 'not_configured'   // PLAID_CLIENT_ID / PLAID_SECRET not set in Supabase
  | 'unauthorized'     // user not logged in
  | 'network'          // fetch failed
  | 'unknown';

export interface PlaidError {
  reason: PlaidErrorReason;
  message: string;
}

export function usePlaid() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [isExchanging, setIsExchanging] = useState(false);
  const [plaidError, setPlaidError] = useState<PlaidError | null>(null);
  const [shouldOpen, setShouldOpen] = useState(false);

  // react-plaid-link needs null (not '') when there is no token yet
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token) => {
      setIsExchanging(true);
      setPlaidError(null);
      try {
        const { data, error: invokeError } = await supabase.functions.invoke(
          'plaid-exchange-token',
          { body: { public_token } },
        );
        if (invokeError) {
          let msg: string = invokeError.message ?? 'Unknown error';
          try {
            const context = (invokeError as any)?.context;
            const body = typeof context?.json === 'function' ? await context.json() : context;
            if (body?.error) msg = String(body.error);
          } catch { /* ignore */ }
          throw new Error(msg);
        }
        if (data?.error) throw new Error(data.error);
        queryClient.invalidateQueries({ queryKey: ['investment-accounts'] });
        toast({
          title: 'Account linked!',
          description: 'Your investment account has been synced.',
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
        // User exited with an error (e.g. invalid credentials at their bank)
        setPlaidError({ reason: 'unknown', message: err.display_message ?? err.error_message ?? 'Exited Plaid Link.' });
      }
    },
  });

  // Auto-open once the Plaid Link SDK is ready and we have a token
  useEffect(() => {
    if (ready && linkToken && shouldOpen) {
      open();
    }
  }, [ready, linkToken, shouldOpen, open]);

  const openPlaidLink = useCallback(async () => {
    setPlaidError(null);
    setIsLoadingToken(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        'plaid-create-link-token',
      );

      // Supabase sets invokeError on non-2xx responses.
      // invokeError.context is a Response object — we must await .json() to read the body.
      if (invokeError) {
        let msg: string = invokeError.message ?? 'Unknown error';
        try {
          const context = (invokeError as any)?.context;
          // context may be a Response object or already-parsed object
          const body = typeof context?.json === 'function'
            ? await context.json()
            : context;
          if (body?.error) msg = String(body.error);
          else if (body?.message) msg = String(body.message);
        } catch {
          // body wasn't JSON (e.g. 404 HTML) — keep the default message
        }
        const reason: PlaidErrorReason =
          msg.toLowerCase().includes('credential') || msg.toLowerCase().includes('configured') || msg.toLowerCase().includes('not found')
            ? 'not_configured'
            : msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('401')
            ? 'unauthorized'
            : 'unknown';
        setPlaidError({ reason, message: msg });
        return;
      }

      // Edge function returned 2xx but included an error payload
      if (data?.error) {
        const msg: string = data.error;
        const reason: PlaidErrorReason = msg.toLowerCase().includes('credential')
          ? 'not_configured'
          : 'unknown';
        setPlaidError({ reason, message: msg });
        return;
      }

      if (!data?.link_token) {
        setPlaidError({ reason: 'unknown', message: 'No link token returned from server.' });
        return;
      }

      setLinkToken(data.link_token);
      setShouldOpen(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error — check your connection.';
      setPlaidError({ reason: 'network', message: msg });
    } finally {
      setIsLoadingToken(false);
    }
  }, []);

  return {
    openPlaidLink,
    isLoading: isLoadingToken || isExchanging,
    plaidError,
    clearError: () => setPlaidError(null),
  };
}
