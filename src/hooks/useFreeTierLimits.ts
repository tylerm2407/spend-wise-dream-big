import { useMemo } from 'react';
import { useSubscription } from './useSubscription';
import { usePurchases } from './usePurchases';

export const FREE_LIMITS = {
  MONTHLY_PURCHASES: 30,
  MAX_GOALS: 2,
  AI_ALTERNATIVES: false,
  RECEIPT_SCANNING: false,
  CSV_EXPORT: false,
} as const;

export function useFreeTierLimits() {
  const { hasProAccess } = useSubscription();
  const { purchases } = usePurchases();

  const currentMonthPurchases = useMemo(() => {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    return purchases.filter(p => (p.purchase_date ?? '') >= monthStart).length;
  }, [purchases]);

  const purchasesRemaining = FREE_LIMITS.MONTHLY_PURCHASES - currentMonthPurchases;

  return {
    hasProAccess,
    // Purchase limits
    canAddPurchase: hasProAccess || currentMonthPurchases < FREE_LIMITS.MONTHLY_PURCHASES,
    currentMonthPurchases,
    purchasesRemaining: hasProAccess ? Infinity : Math.max(0, purchasesRemaining),
    purchaseLimit: FREE_LIMITS.MONTHLY_PURCHASES,
    // Feature gates
    canUseAI: hasProAccess,
    canScanReceipts: hasProAccess,
    canExportCSV: hasProAccess,
    maxGoals: hasProAccess ? Infinity : FREE_LIMITS.MAX_GOALS,
  };
}
