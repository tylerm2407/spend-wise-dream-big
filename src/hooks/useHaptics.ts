import { useCallback } from 'react';

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

/**
 * Custom hook for haptic feedback using the Vibration API.
 * Provides tactile feedback for interactive elements on supported devices.
 */
export function useHaptics() {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const vibrate = useCallback((pattern: number | number[]) => {
    if (isSupported) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Silently fail if vibration not available
      }
    }
  }, [isSupported]);

  const haptic = useCallback((type: HapticType = 'light') => {
    switch (type) {
      case 'light':
        vibrate(10);
        break;
      case 'medium':
        vibrate(20);
        break;
      case 'heavy':
        vibrate(40);
        break;
      case 'success':
        vibrate([10, 50, 20]);
        break;
      case 'warning':
        vibrate([20, 30, 20]);
        break;
      case 'error':
        vibrate([50, 30, 50]);
        break;
      case 'selection':
        vibrate(5);
        break;
      default:
        vibrate(10);
    }
  }, [vibrate]);

  return { haptic, isSupported };
}

/**
 * Standalone haptic function for use outside React components
 */
export function triggerHaptic(type: HapticType = 'light') {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const patterns: Record<HapticType, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 40,
      success: [10, 50, 20],
      warning: [20, 30, 20],
      error: [50, 30, 50],
      selection: 5,
    };
    try {
      navigator.vibrate(patterns[type]);
    } catch (e) {
      // Silently fail
    }
  }
}
