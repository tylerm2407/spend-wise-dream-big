import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useGuest } from './useGuest';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionStatus {
  subscribed: boolean;
  isInTrial: boolean;
  trialDaysRemaining: number;
  trialEndDate: string | null;
  hasProAccess: boolean;
  subscriptionEnd: string | null;
  productId: string | null;
  hasActiveIAP: boolean;
  iapExpiresDate: string | null;
}

interface SubscriptionContextType extends SubscriptionStatus {
  loading: boolean;
  error: string | null;
  checkSubscription: () => Promise<void>;
  openCheckout: (referralData?: { referral_code: string; referrer_id: string }) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  /** @deprecated Use hasProAccess instead */
  hasAccess: boolean;
}

const defaultStatus: SubscriptionStatus = {
  subscribed: false,
  isInTrial: true,
  trialDaysRemaining: 30,
  trialEndDate: null,
  hasProAccess: true,
  subscriptionEnd: null,
  productId: null,
  hasActiveIAP: false,
  iapExpiresDate: null,
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const { isGuest } = useGuest();
  const [status, setStatus] = useState<SubscriptionStatus>(defaultStatus);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
    // Guests get free tier with no pro access
    if (isGuest) {
      setStatus({
        subscribed: false,
        isInTrial: false,
        trialDaysRemaining: 0,
        trialEndDate: null,
        hasProAccess: false,
        subscriptionEnd: null,
        productId: null,
        hasActiveIAP: false,
        iapExpiresDate: null,
      });
      setLoading(false);
      return;
    }

    if (!session?.access_token) {
      setStatus(defaultStatus);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: fnError } = await supabase.functions.invoke('check-subscription');
      
      if (fnError) {
        // 401 means token expired/invalid - use defaults, don't treat as error
        console.warn('Subscription check failed (likely token refresh):', fnError.message);
        return;
      }

      if (data?.error) {
        console.warn('Subscription check returned error:', data.error);
        return;
      }

      setStatus({
        subscribed: data.subscribed ?? false,
        isInTrial: data.is_in_trial ?? false,
        trialDaysRemaining: data.trial_days_remaining ?? 0,
        trialEndDate: data.trial_end_date ?? null,
        hasProAccess: data.has_pro_access ?? false,
        subscriptionEnd: data.subscription_end ?? null,
        productId: data.product_id ?? null,
        hasActiveIAP: data.has_active_iap ?? false,
        iapExpiresDate: data.iap_expires_date ?? null,
      });
    } catch (err) {
      console.error('Failed to check subscription:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, isGuest]);

  const openCheckout = async (referralData?: { referral_code: string; referrer_id: string }) => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const { data, error: fnError } = await supabase.functions.invoke('create-checkout', {
      body: referralData ? { referral_code: referralData.referral_code, referrer_id: referralData.referrer_id } : {},
    });
    
    if (fnError || data.error) {
      throw new Error(fnError?.message || data.error);
    }

    if (data.url) {
      window.open(data.url, '_blank');
    }
  };

  const openCustomerPortal = async () => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const { data, error: fnError } = await supabase.functions.invoke('customer-portal');
    
    if (fnError || data.error) {
      throw new Error(fnError?.message || data.error);
    }

    if (data.url) {
      window.open(data.url, '_blank');
    }
  };

  useEffect(() => {
    if (isGuest) {
      checkSubscription();
    } else if (user) {
      checkSubscription();
    } else {
      setStatus(defaultStatus);
      setLoading(false);
    }
  }, [user, isGuest, checkSubscription]);

  // Auto-refresh every minute (authenticated users only)
  useEffect(() => {
    if (!user || isGuest) return;
    
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, isGuest, checkSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        ...status,
        loading,
        error,
        checkSubscription,
        openCheckout,
        openCustomerPortal,
        // backward compat
        hasAccess: status.hasProAccess,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
