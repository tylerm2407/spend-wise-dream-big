import { useCallback } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

const isNative = Capacitor.isNativePlatform();

function webFallback(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Silently fail
    }
  }
}

/**
 * Custom hook for haptic feedback.
 * Uses Capacitor Haptics on native, falls back to Vibration API on web.
 */
export function useHaptics() {
  const isSupported = isNative || (typeof navigator !== 'undefined' && 'vibrate' in navigator);

  const haptic = useCallback(async (type: HapticType = 'light') => {
    if (isNative) {
      try {
        switch (type) {
          case 'light':
            await Haptics.impact({ style: ImpactStyle.Light });
            break;
          case 'medium':
            await Haptics.impact({ style: ImpactStyle.Medium });
            break;
          case 'heavy':
            await Haptics.impact({ style: ImpactStyle.Heavy });
            break;
          case 'success':
            await Haptics.notification({ type: NotificationType.Success });
            break;
          case 'warning':
            await Haptics.notification({ type: NotificationType.Warning });
            break;
          case 'error':
            await Haptics.notification({ type: NotificationType.Error });
            break;
          case 'selection':
            await Haptics.selectionStart();
            await Haptics.selectionChanged();
            await Haptics.selectionEnd();
            break;
          default:
            await Haptics.impact({ style: ImpactStyle.Light });
        }
      } catch {
        // Silently fail if haptics unavailable
      }
    } else {
      const patterns: Record<HapticType, number | number[]> = {
        light: 10, medium: 20, heavy: 40,
        success: [10, 50, 20], warning: [20, 30, 20], error: [50, 30, 50],
        selection: 5,
      };
      webFallback(patterns[type]);
    }
  }, []);

  return { haptic, isSupported };
}

/**
 * Standalone haptic function for use outside React components
 */
export async function triggerHaptic(type: HapticType = 'light') {
  if (isNative) {
    try {
      switch (type) {
        case 'light':
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        case 'medium':
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
        case 'heavy':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
        case 'success':
          await Haptics.notification({ type: NotificationType.Success });
          break;
        case 'warning':
          await Haptics.notification({ type: NotificationType.Warning });
          break;
        case 'error':
          await Haptics.notification({ type: NotificationType.Error });
          break;
        case 'selection':
          await Haptics.selectionChanged();
          break;
        default:
          await Haptics.impact({ style: ImpactStyle.Light });
      }
    } catch {
      // Silently fail
    }
  } else {
    const patterns: Record<HapticType, number | number[]> = {
      light: 10, medium: 20, heavy: 40,
      success: [10, 50, 20], warning: [20, 30, 20], error: [50, 30, 50],
      selection: 5,
    };
    webFallback(patterns[type]);
  }
}
