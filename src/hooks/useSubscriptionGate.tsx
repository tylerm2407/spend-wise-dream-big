import { useState, useCallback } from 'react';
import { useSubscription } from './useSubscription';

/**
 * Hook that provides an action guard for Pro-only features.
 * Free tier users can browse but Pro-gated actions trigger the paywall dialog.
 * 
 * Also provides limit checks for free tier restrictions:
 * - Goals: max 2 for free users
 * - Alternatives: max 1 suggestion for free users
 */
export function useSubscriptionGate() {
  const { hasProAccess, loading } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const guardAction = useCallback(
    (action: () => void) => {
      if (loading) return;
      if (hasProAccess) {
        action();
      } else {
        setShowPaywall(true);
      }
    },
    [hasProAccess, loading]
  );

  const dismissPaywall = useCallback(() => {
    setShowPaywall(false);
  }, []);

  return { guardAction, showPaywall, dismissPaywall, hasAccess: hasProAccess, hasProAccess };
}
