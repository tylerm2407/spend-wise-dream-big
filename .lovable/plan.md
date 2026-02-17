

## Replace RevenueCat API Keys

### What changes
Update the two placeholder constants in `src/hooks/useRevenueCat.tsx` (lines 30-31) with the actual RevenueCat public API keys provided by the user.

### Steps

1. Ask the user for their RevenueCat public API keys (iOS and/or Android)
2. Replace `YOUR_REVENUECAT_IOS_PUBLIC_KEY` and `YOUR_REVENUECAT_ANDROID_PUBLIC_KEY` in `src/hooks/useRevenueCat.tsx` with the real values

### Technical details

- File: `src/hooks/useRevenueCat.tsx`, lines 30-31
- These are **publishable** keys, safe to store in client code
- Current placeholders:
  - `RC_PUBLIC_API_KEY_IOS = 'YOUR_REVENUECAT_IOS_PUBLIC_KEY'`
  - `RC_PUBLIC_API_KEY_ANDROID = 'YOUR_REVENUECAT_ANDROID_PUBLIC_KEY'`

### Before proceeding
I will need the user to provide the actual key values. If the app only targets one platform, we only need that platform's key.
