

# App Store Launch Optimization Checklist

Here's a prioritized list of remaining improvements to ensure a seamless user experience before launch.

---

## 1. Loading Skeletons (Replace Spinners)

**Problem:** Every page currently shows a generic spinner while loading data. This feels jarring and slow.

**Fix:** Add content-shaped skeleton placeholders on the Home, History, Goals, and Insights pages so users see a preview of the layout before data loads. This makes the app feel significantly faster.

---

## 2. Pull-to-Refresh

**Problem:** There's no way for users to manually refresh data on any page. If a sync fails or data feels stale, they're stuck.

**Fix:** Add pull-to-refresh gesture support on the Home page (and optionally History/Insights) that re-fetches purchases, goals, and profile data.

---

## 3. Empty State Improvements

**Problem:** Several pages (Insights, Challenges, Goals) may show minimal guidance when there's no data yet. New users could feel lost.

**Fix:** Add friendly, illustrated empty states with a clear single CTA on each page (e.g., "Log your first purchase to see insights here").

---

## 4. Network Error Handling / Retry

**Problem:** If API calls fail (e.g., fetching purchases, profile), there's no user-facing error message or retry option -- the page just stays empty or shows a spinner forever.

**Fix:** Add error states with a "Tap to retry" button on data-fetching pages. Also add React Query's `retry` and `retryDelay` configuration globally for resilience.

---

## 5. Keyboard Handling for Forms

**Problem:** On iOS, the keyboard can cover input fields (especially on the Add Purchase page and Onboarding). There's no scroll-into-view behavior.

**Fix:** Add `scrollIntoView` behavior on input focus and ensure the submit button remains visible when the keyboard is open (using Capacitor's `Keyboard` plugin or CSS `env(safe-area-inset-bottom)`).

---

## 6. Safe Area Insets

**Problem:** The bottom tab bar references `safe-area-inset-bottom` but the app may not properly handle the notch/Dynamic Island area at the top on modern iPhones.

**Fix:** Ensure `viewport-fit=cover` is set in the HTML meta tag and that all headers/content respect `env(safe-area-inset-top)`. Verify the bottom tab bar padding works on all iPhone models.

---

## 7. Session Expiry Handling

**Problem:** If a user's auth token expires while the app is in the background, they may see broken screens or silent failures instead of being redirected to login.

**Fix:** Add a global auth state listener that detects `SIGNED_OUT` events and gracefully redirects to the login page with a toast message.

---

## 8. Optimistic Updates for Purchases

**Problem:** When adding a purchase, the user waits for the server round-trip before seeing it reflected on the Home page.

**Fix:** Use React Query's optimistic update pattern to immediately show the new purchase in the list and roll back on failure.

---

## 9. Rate Limiting / Debouncing Profile Updates

**Problem:** In Settings, every keystroke in the name/income fields triggers `updateProfile`, which could fire dozens of API calls.

**Fix:** Debounce the `updateProfile` calls (300-500ms delay) so they only fire after the user stops typing.

---

## 10. App State Restoration (Deep Linking)

**Problem:** If the app is killed and reopened, or a user taps a notification, they always land on `/home` regardless of where they were.

**Fix:** This is lower priority but consider persisting the last active route so the app can restore context on relaunch.

---

## Recommended Priority Order

| Priority | Item | Impact |
|----------|------|--------|
| High | Loading skeletons | Perceived performance |
| High | Network error handling / retry | Prevents dead-end states |
| High | Debounce profile updates | Prevents API spam |
| High | Safe area insets | Visual polish on all iPhones |
| Medium | Pull-to-refresh | User control over data freshness |
| Medium | Keyboard handling | Form usability on iOS |
| Medium | Session expiry handling | Prevents confusing auth errors |
| Medium | Optimistic updates | Snappier interactions |
| Low | Empty state improvements | New user experience |
| Low | App state restoration | Nice-to-have polish |

---

## Technical Notes

- **Loading skeletons** will use the existing `Skeleton` component from `src/components/ui/skeleton.tsx` and be added to each page's loading state.
- **Debouncing** will use a simple `setTimeout`/`clearTimeout` pattern (no new dependencies needed).
- **Error/retry states** will leverage React Query's `isError` and `refetch` from existing query hooks.
- **Safe area insets** require adding `viewport-fit=cover` to `index.html` and applying `pt-[env(safe-area-inset-top)]` to page headers.
- **Pull-to-refresh** can be implemented with a touch gesture handler or the `@capacitor/app` plugin.

