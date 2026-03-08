import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useProfile } from './useProfile';

const NUDGE_SCHEDULED_KEY = 'daily_nudge_scheduled_date';
const NUDGE_ID = 9999;

/**
 * Schedules a single local notification at 6 PM today (or tomorrow if past 6 PM)
 * reminding the user of their daily budget. Only fires on native platforms.
 */
export function useDailyNudge() {
  const { profile } = useProfile();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!profile?.daily_budget || Number(profile.daily_budget) <= 0) return;

    const today = new Date().toISOString().split('T')[0];
    if (localStorage.getItem(NUDGE_SCHEDULED_KEY) === today) return;

    (async () => {
      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') return;

        // Calculate next 6 PM
        const now = new Date();
        const sixPm = new Date();
        sixPm.setHours(18, 0, 0, 0);
        if (now >= sixPm) {
          sixPm.setDate(sixPm.getDate() + 1);
        }

        // Cancel any previous nudge
        try {
          await LocalNotifications.cancel({ notifications: [{ id: NUDGE_ID }] });
        } catch { /* ignore */ }

        await LocalNotifications.schedule({
          notifications: [{
            id: NUDGE_ID,
            title: '💰 Daily Budget Check-in',
            body: `You have ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(profile.daily_budget))} budgeted today. How are you doing?`,
            schedule: { at: sixPm },
            extra: { tag: 'daily-nudge' },
          }],
        });

        localStorage.setItem(NUDGE_SCHEDULED_KEY, today);
      } catch {
        // Notifications not available
      }
    })();
  }, [profile?.daily_budget]);
}
