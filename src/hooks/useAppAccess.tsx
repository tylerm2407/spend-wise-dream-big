import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from './useAuth';
import { useGuest } from './useGuest';
import { supabase } from '@/integrations/supabase/client';

interface AppAccessState {
  hasAccess: boolean;
  novawealthSubscriber: boolean;
  standaloneSubscriber: boolean;
  loading: boolean;
  syncNow: () => Promise<void>;
}

const AppAccessContext = createContext<AppAccessState | undefined>(undefined);

const ONE_HOUR_MS = 60 * 60 * 1000;

export function AppAccessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isGuest } = useGuest();
  const [novawealthSubscriber, setNovawealthSubscriber] = useState(false);
  const [standaloneSubscriber, setStandaloneSubscriber] = useState(false);
  const [loading, setLoading] = useState(true);

  const hasAccess = novawealthSubscriber || standaloneSubscriber;

  const syncNow = useCallback(async () => {
    if (!user?.id || !user?.email) return;

    try {
      // Call the sync edge function
      const { data, error } = await supabase.functions.invoke('sync-novawealth-access', {
        body: { user_id: user.id, email: user.email },
      });

      if (error) {
        console.warn('[useAppAccess] Sync failed:', error.message);
      } else if (data) {
        setNovawealthSubscriber(data.novawealth_subscriber ?? false);
      }
    } catch (err) {
      console.warn('[useAppAccess] Sync error:', err);
    }
  }, [user?.id, user?.email]);

  const checkAccess = useCallback(async () => {
    if (isGuest || !user?.id) {
      setNovawealthSubscriber(false);
      setStandaloneSubscriber(false);
      setLoading(false);
      return;
    }

    try {
      // Read current cached state from user_access table
      const { data: accessRow, error } = await (supabase as any)
        .from('user_access')
        .select('novawealth_subscriber, standalone_subscriber, last_novawealth_check')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('[useAppAccess] Read error:', error.message);
        setLoading(false);
        return;
      }

      if (accessRow) {
        setNovawealthSubscriber(accessRow.novawealth_subscriber ?? false);
        setStandaloneSubscriber(accessRow.standalone_subscriber ?? false);

        // Check if last sync was more than 1 hour ago
        const lastCheck = accessRow.last_novawealth_check
          ? new Date(accessRow.last_novawealth_check).getTime()
          : 0;
        const needsRefresh = Date.now() - lastCheck > ONE_HOUR_MS;

        if (needsRefresh) {
          // Sync in background — don't block UI
          syncNow();
        }
      } else {
        // No row yet — first time, trigger sync
        await syncNow();

        // Re-read after sync
        const { data: freshRow } = await (supabase as any)
          .from('user_access')
          .select('novawealth_subscriber, standalone_subscriber')
          .eq('id', user.id)
          .maybeSingle();

        if (freshRow) {
          setNovawealthSubscriber(freshRow.novawealth_subscriber ?? false);
          setStandaloneSubscriber(freshRow.standalone_subscriber ?? false);
        }
      }
    } catch (err) {
      console.warn('[useAppAccess] Check error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isGuest, syncNow]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return (
    <AppAccessContext.Provider value={{ hasAccess, novawealthSubscriber, standaloneSubscriber, loading, syncNow }}>
      {children}
    </AppAccessContext.Provider>
  );
}

export function useAppAccess() {
  const context = useContext(AppAccessContext);
  if (context === undefined) {
    throw new Error('useAppAccess must be used within an AppAccessProvider');
  }
  return context;
}
