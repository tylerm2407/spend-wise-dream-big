import { useCallback, useEffect, useState } from 'react';
import { useProfile } from './useProfile';
import { formatCurrency } from '@/lib/calculations';

const STORAGE_KEY = 'budget_alerts_enabled';
const LAST_WARNING_KEY = 'budget_last_warning_date';
const LAST_EXCEEDED_KEY = 'budget_last_exceeded_date';

type NotificationPermissionState = 'default' | 'granted' | 'denied';

export function useBudgetNotifications() {
  const { profile } = useProfile();

  const [enabled, setEnabled] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const [permission, setPermission] = useState<NotificationPermissionState>(() => {
    if (typeof Notification === 'undefined') return 'denied';
    return Notification.permission as NotificationPermissionState;
  });

  // Sync enabled state with localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  }, [enabled]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') return false;

    if (Notification.permission === 'granted') {
      setPermission('granted');
      return true;
    }

    if (Notification.permission === 'denied') {
      setPermission('denied');
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result as NotificationPermissionState);
    return result === 'granted';
  }, []);

  const toggleAlerts = useCallback(async (newValue: boolean) => {
    if (newValue) {
      const granted = await requestPermission();
      if (!granted) {
        setEnabled(false);
        return false;
      }
    }
    setEnabled(newValue);
    return true;
  }, [requestPermission]);

  const sendNotification = useCallback((title: string, body: string, tag: string) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag, // prevents duplicate notifications
        silent: false,
      });
    } catch {
      // Fallback: some mobile browsers don't support Notification constructor
      console.warn('Browser notifications not supported');
    }
  }, []);

  /**
   * Check if the current spending has crossed budget thresholds.
   * Call this after adding a purchase.
   */
  const checkBudgetThresholds = useCallback((todayTotal: number) => {
    if (!enabled || !profile?.daily_budget) return;

    const dailyBudget = Number(profile.daily_budget);
    if (dailyBudget <= 0) return;

    const today = new Date().toISOString().split('T')[0];
    const pct = (todayTotal / dailyBudget) * 100;

    // Check if already notified today for each threshold
    const lastWarningDate = localStorage.getItem(LAST_WARNING_KEY);
    const lastExceededDate = localStorage.getItem(LAST_EXCEEDED_KEY);

    if (pct >= 100 && lastExceededDate !== today) {
      const overBy = todayTotal - dailyBudget;
      sendNotification(
        '🚨 Daily Budget Exceeded',
        `You've spent ${formatCurrency(todayTotal, 0)} today — ${formatCurrency(overBy, 0)} over your ${formatCurrency(dailyBudget, 0)} limit.`,
        'budget-exceeded'
      );
      localStorage.setItem(LAST_EXCEEDED_KEY, today);
      localStorage.setItem(LAST_WARNING_KEY, today); // also mark warning as sent
    } else if (pct >= 80 && pct < 100 && lastWarningDate !== today) {
      const remaining = dailyBudget - todayTotal;
      sendNotification(
        '⚠️ Approaching Daily Budget',
        `You've used ${Math.round(pct)}% of your ${formatCurrency(dailyBudget, 0)} daily budget. Only ${formatCurrency(remaining, 0)} left.`,
        'budget-warning'
      );
      localStorage.setItem(LAST_WARNING_KEY, today);
    }
  }, [enabled, profile?.daily_budget, sendNotification]);

  return {
    enabled,
    permission,
    toggleAlerts,
    checkBudgetThresholds,
    isSupported: typeof Notification !== 'undefined',
  };
}
