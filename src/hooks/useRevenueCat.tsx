import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// RevenueCat types
interface RCPackage {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    title: string;
    description: string;
    priceString: string;
    price: number;
    currencyCode: string;
  };
}

interface RevenueCatState {
  isNative: boolean;
  isInitialized: boolean;
  offerings: RCPackage[];
  hasActiveSubscription: boolean;
  expiresDate: string | null;
  loading: boolean;
  error: string | null;
}

// RevenueCat public API keys (publishable - safe in code)
const RC_PUBLIC_API_KEY_IOS = 'sk_bYCOPJsDnvHCMSucnQTtJlcQHvQHD';
const RC_PUBLIC_API_KEY_ANDROID = 'YOUR_REVENUECAT_ANDROID_PUBLIC_KEY';

const ENTITLEMENT_ID = 'Pro_Tier';

export function useRevenueCat() {
  const { user } = useAuth();
  const isNative = Capacitor.isNativePlatform();
  const listenerRegistered = useRef(false);

  const [state, setState] = useState<RevenueCatState>({
    isNative,
    isInitialized: false,
    offerings: [],
    hasActiveSubscription: false,
    expiresDate: null,
    loading: false,
    error: null,
  });

  // Check entitlement from customer info
  const extractEntitlement = useCallback((customerInfo: any) => {
    const entitlements = customerInfo?.entitlements?.active;
    const proEntitlement = entitlements?.[ENTITLEMENT_ID];
    const hasActive = !!proEntitlement;
    const expires = proEntitlement?.expirationDate || null;

    setState(prev => ({
      ...prev,
      hasActiveSubscription: hasActive,
      expiresDate: expires,
    }));

    return hasActive;
  }, []);

  // Sync subscription status with backend
  const syncWithBackend = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.functions.invoke('validate-iap-receipt', {
        body: { app_user_id: user.id },
      });
      if (error) {
        console.error('[RevenueCat] Backend sync error:', error);
      } else {
        console.log('[RevenueCat] Backend sync result:', data);
      }
    } catch (err) {
      console.error('[RevenueCat] Backend sync failed:', err);
    }
  }, [user?.id]);

  // Register listener for purchase events (initial, renewal, cancellation, plan change)
  const registerPurchaseListener = useCallback(async () => {
    if (!isNative || listenerRegistered.current) return;

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');

      await Purchases.addCustomerInfoUpdateListener(async (info: any) => {
        console.log('[RevenueCat] Customer info updated:', JSON.stringify(info));

        const customerInfo = info?.customerInfo ?? info;
        const hadActive = state.hasActiveSubscription;
        const hasActive = extractEntitlement(customerInfo);

        // Sync with backend on any change
        await syncWithBackend();

        // Log the event type for debugging
        if (!hadActive && hasActive) {
          console.log('[RevenueCat] Event: Initial purchase or renewal detected');
        } else if (hadActive && !hasActive) {
          console.log('[RevenueCat] Event: Cancellation or expiry detected');
        } else if (hadActive && hasActive) {
          console.log('[RevenueCat] Event: Plan change or renewal detected');
        }
      });

      listenerRegistered.current = true;
      console.log('[RevenueCat] Purchase listener registered');
    } catch (err) {
      console.error('[RevenueCat] Failed to register listener:', err);
    }
  }, [isNative, extractEntitlement, syncWithBackend, state.hasActiveSubscription]);

  // Fetch available offerings
  const fetchOfferings = useCallback(async () => {
    if (!isNative) return;

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const offerings = await Purchases.getOfferings();

      const packages: RCPackage[] = [];
      if (offerings.current?.availablePackages) {
        for (const pkg of offerings.current.availablePackages) {
          packages.push({
            identifier: pkg.identifier,
            packageType: pkg.packageType,
            product: {
              identifier: pkg.product.identifier,
              title: pkg.product.title,
              description: pkg.product.description,
              priceString: pkg.product.priceString,
              price: pkg.product.price,
              currencyCode: pkg.product.currencyCode,
            },
          });
        }
      }

      setState(prev => ({ ...prev, offerings: packages }));
      console.log('[RevenueCat] Offerings loaded:', packages.length);
    } catch (err) {
      console.error('[RevenueCat] Offerings error:', err);
    }
  }, [isNative]);

  // Check current subscription status
  const checkSubscriptionStatus = useCallback(async () => {
    if (!isNative) return;

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const customerInfo = await Purchases.getCustomerInfo();
      const hasActive = extractEntitlement(customerInfo.customerInfo);

      if (hasActive) {
        await syncWithBackend();
      }
    } catch (err) {
      console.error('[RevenueCat] Status check error:', err);
    }
  }, [isNative, extractEntitlement, syncWithBackend]);

  // Initialize RevenueCat
  const initialize = useCallback(async () => {
    if (!isNative || !user?.id) return;

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');

      const apiKey = Capacitor.getPlatform() === 'ios'
        ? RC_PUBLIC_API_KEY_IOS
        : RC_PUBLIC_API_KEY_ANDROID;

      // Configure with the logged-in user's ID as the external user ID
      await Purchases.configure({
        apiKey,
        appUserID: user.id,
      });

      setState(prev => ({ ...prev, isInitialized: true }));
      console.log('[RevenueCat] Initialized for user:', user.id);

      // Register listener, fetch offerings, and check status
      await registerPurchaseListener();
      await fetchOfferings();
      await checkSubscriptionStatus();
    } catch (err) {
      console.error('[RevenueCat] Init error:', err);
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to initialize RevenueCat',
      }));
    }
  }, [isNative, user?.id, registerPurchaseListener, fetchOfferings, checkSubscriptionStatus]);

  // Show the default offering paywall
  const showOffering = useCallback(async () => {
    if (!isNative) {
      console.warn('[RevenueCat] showOffering only available on native');
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const offerings = await Purchases.getOfferings();

      if (!offerings.current) {
        throw new Error('No current offering available');
      }

      // On native, present the RevenueCat paywall sheet
      // This uses the default offering automatically
      const result = await (Purchases as any).presentPaywall();
      console.log('[RevenueCat] Paywall result:', result);

      // Refresh status after paywall interaction
      await checkSubscriptionStatus();
      setState(prev => ({ ...prev, loading: false }));
      return result;
    } catch (err: any) {
      const isCancelled = err?.code === 1 || err?.message?.includes('cancelled');
      if (!isCancelled) {
        console.error('[RevenueCat] Paywall error:', err);
        setState(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to show paywall',
        }));
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    }
  }, [isNative, checkSubscriptionStatus]);

  // Purchase a specific package
  const purchasePackage = useCallback(async (packageIdentifier: string) => {
    if (!isNative) {
      throw new Error('In-app purchases only available on native platforms');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages?.find(
        p => p.identifier === packageIdentifier
      );

      if (!pkg) {
        throw new Error(`Package ${packageIdentifier} not found`);
      }

      const result = await Purchases.purchasePackage({ aPackage: pkg });
      console.log('[RevenueCat] Purchase successful:', result);

      await checkSubscriptionStatus();
      setState(prev => ({ ...prev, loading: false }));
      return result;
    } catch (err: any) {
      const isCancelled = err?.code === 1 || err?.message?.includes('cancelled');
      if (!isCancelled) {
        console.error('[RevenueCat] Purchase error:', err);
        setState(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Purchase failed',
        }));
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
      throw err;
    }
  }, [isNative, checkSubscriptionStatus]);

  // Restore purchases
  const restorePurchases = useCallback(async () => {
    if (!isNative) return;

    setState(prev => ({ ...prev, loading: true }));

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const result = await Purchases.restorePurchases();
      console.log('[RevenueCat] Restore result:', result);

      await checkSubscriptionStatus();
      setState(prev => ({ ...prev, loading: false }));
    } catch (err) {
      console.error('[RevenueCat] Restore error:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Restore failed',
      }));
    }
  }, [isNative, checkSubscriptionStatus]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    ...state,
    purchasePackage,
    restorePurchases,
    refreshStatus: checkSubscriptionStatus,
    showOffering,
  };
}
