import { useState, useEffect, useCallback } from 'react';
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

// Your RevenueCat public API key (safe to store in code - it's a publishable key)
// Replace this with your actual RevenueCat public API key from the RevenueCat dashboard
const RC_PUBLIC_API_KEY_IOS = 'sk_bYCOPJsDnvHCMSucnQTtJlcQHvQHD';
const RC_PUBLIC_API_KEY_ANDROID = 'YOUR_REVENUECAT_ANDROID_PUBLIC_KEY';

export function useRevenueCat() {
  const { user } = useAuth();
  const isNative = Capacitor.isNativePlatform();

  const [state, setState] = useState<RevenueCatState>({
    isNative,
    isInitialized: false,
    offerings: [],
    hasActiveSubscription: false,
    expiresDate: null,
    loading: false,
    error: null,
  });

  // Initialize RevenueCat on native platforms
  const initialize = useCallback(async () => {
    if (!isNative || !user?.id) return;

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');

      const apiKey = Capacitor.getPlatform() === 'ios'
        ? RC_PUBLIC_API_KEY_IOS
        : RC_PUBLIC_API_KEY_ANDROID;

      await Purchases.configure({
        apiKey,
        appUserID: user.id,
      });

      setState(prev => ({ ...prev, isInitialized: true }));
      console.log('[RevenueCat] Initialized for user:', user.id);

      // Fetch offerings
      await fetchOfferings();
      // Check current subscription status
      await checkSubscriptionStatus();
    } catch (err) {
      console.error('[RevenueCat] Init error:', err);
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to initialize RevenueCat',
      }));
    }
  }, [isNative, user?.id]);

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

  const checkSubscriptionStatus = useCallback(async () => {
    if (!isNative) return;

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const customerInfo = await Purchases.getCustomerInfo();
      const entitlements = customerInfo.customerInfo.entitlements.active;

      const proEntitlement = entitlements?.['pro'] || entitlements?.['Pro'] || entitlements?.['premium'];
      const hasActive = !!proEntitlement;
      const expires = proEntitlement?.expirationDate || null;

      setState(prev => ({
        ...prev,
        hasActiveSubscription: hasActive,
        expiresDate: expires,
      }));

      // Sync with backend
      if (hasActive) {
        await syncWithBackend();
      }
    } catch (err) {
      console.error('[RevenueCat] Status check error:', err);
    }
  }, [isNative]);

  const syncWithBackend = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('validate-iap-receipt', {
        body: { app_user_id: user?.id },
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

  const purchasePackage = useCallback(async (packageIdentifier: string) => {
    if (!isNative) {
      throw new Error('In-app purchases only available on native platforms');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');

      // Get offerings to find the package
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages?.find(
        p => p.identifier === packageIdentifier
      );

      if (!pkg) {
        throw new Error(`Package ${packageIdentifier} not found`);
      }

      const result = await Purchases.purchasePackage({ aPackage: pkg });
      console.log('[RevenueCat] Purchase successful:', result);

      // Update local state
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
  };
}
