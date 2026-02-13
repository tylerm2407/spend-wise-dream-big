import { useState, useCallback } from 'react';
import { useSubscription } from './useSubscription';

/**
 * Hook that provides an action guard for subscription-gated features.
 * Users can browse freely, but actions trigger the paywall dialog when not subscribed.
 */
export function useSubscriptionGate() {
  const { hasAccess, loading } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const guardAction = useCallback(
    (action: () => void) => {
      if (loading) return;
      if (hasAccess) {
        action();
      } else {
        setShowPaywall(true);
      }
    },
    [hasAccess, loading]
  );

  const dismissPaywall = useCallback(() => {
    setShowPaywall(false);
  }, []);

  return { guardAction, showPaywall, dismissPaywall, hasAccess };
}
