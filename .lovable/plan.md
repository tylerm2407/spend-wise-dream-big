

# True Cost App - Full Audit: Pain Points, Bugs, and Engagement Opportunities

---

## Part 1: Active Bug

### Subscription Check Error
The `check-subscription` edge function is returning a 500 error with "Authentication error: {}". This means the subscription status is not being checked correctly, and users may see incorrect trial/subscription states. The error appears in the console logs and the edge function logs.

**Fix:** Debug the auth token passing in the edge function. The error `Authentication error: {}` suggests the Supabase service role key may have an issue, or the token format is being rejected. This needs investigation and a fix in the edge function.

---

## Part 2: User Experience Pain Points

### 1. Onboarding Friction
- **Issue:** The onboarding saves the profile and marks `onboarding_completed: true` at Step 3 (before logging the first purchase in Step 4). If the user skips Step 4 or the app crashes, they'll never see onboarding again but missed the activation step.
- **Impact:** Users skip the critical first purchase, reducing engagement.
- **Fix:** Move `onboarding_completed: true` to only fire after Step 4 (either after logging a purchase or explicitly skipping).

### 2. No "Reset Password" Page After Email Link
- **Issue:** The `resetPassword` function redirects to `/reset-password`, but there is no corresponding route or page in the app. Users who click the reset link in their email will hit a 404.
- **Impact:** Users cannot complete password reset, leading to account lockout.
- **Fix:** Create a `/reset-password` page that accepts the token and lets users set a new password.

### 3. Signup Form - Referral Code Placement
- **Issue:** The "Referral Code" input field is placed between the Password and Confirm Password fields, breaking the natural form flow.
- **Impact:** Users may be confused or think the referral code is required.
- **Fix:** Move the referral code field below the Confirm Password field.

### 4. Delete Account Doesn't Actually Delete Auth User
- **Issue:** The `handleDeleteAccount` function deletes all user data from tables and signs out, but never calls the actual account deletion API. The auth record remains in the system.
- **Impact:** Apple will reject this -- they require full account deletion. Users may also receive emails or be unable to re-register with the same email.
- **Fix:** Create an edge function that uses the service role to call `supabase.auth.admin.deleteUser(userId)` to fully remove the auth record.

### 5. Plaid/Credit Card Integration is a Stub
- **Issue:** The "Link Credit Card" button in Settings and the `CreditCardLinking` component on the Insights page just show a toast saying "Card linking feature is being set up." This is a dead feature.
- **Impact:** Users see a feature promise that doesn't work, creating frustration and eroding trust.
- **Fix:** Either implement the Plaid integration or remove/hide these buttons until the feature is ready.

### 6. No Confirmation Before Deleting Purchases or Goals
- **Issue:** In the History and Goals pages, tapping the delete (trash) button immediately deletes the item with no confirmation dialog.
- **Impact:** Accidental deletions, especially on mobile where mis-taps are common.
- **Fix:** Add an `AlertDialog` confirmation before deleting purchases and goals.

### 7. History Page Has No Back Navigation to Tab Bar
- **Issue:** The History page uses a back arrow (`navigate(-1)`) and has no bottom tab bar. If a user navigates here from a deep link or bookmark, the back button behavior is unpredictable.
- **Impact:** Users may get stuck without clear navigation.
- **Fix:** Include the `AppLayout` wrapper (with tab bar) on the History page, or add a fallback to navigate to `/home` if there's no history.

### 8. Login Redirects to `/dashboard` Instead of `/home`
- **Issue:** After successful login, `Login.tsx` navigates to `/dashboard`, which then redirects to `/home`. This causes an unnecessary route hop.
- **Impact:** Slight delay and a flash during navigation.
- **Fix:** Change the login success redirect from `/dashboard` to `/home`.

### 9. Subscription Gate Shows "SpendWise" Instead of "True Cost"
- **Issue:** The SubscriptionGate paywall text says "Continue your journey to financial wellness with SpendWise Premium" and Settings shows "SpendWise Premium" -- the app is called "True Cost."
- **Impact:** Brand inconsistency confuses users and looks unprofessional.
- **Fix:** Replace all instances of "SpendWise" with "True Cost."

### 10. Advanced Settings (Return Rate, Inflation) Not Persisted
- **Issue:** In Settings, the "Annual Return Rate" slider and "Adjust for Inflation" toggle are stored in local component state. They reset every time the user navigates away and back.
- **Impact:** Users repeatedly configure these without their choices being saved.
- **Fix:** Persist these values either to the profile table or localStorage.

### 11. Empty State on Insights When No Purchases
- **Issue:** If a user visits the Insights tab before adding purchases, they see blank/empty cards with no guidance. There's no empty state prompting them to add purchases first.
- **Impact:** New users feel lost and may churn.
- **Fix:** Add a clear empty state with a CTA linking to Add Purchase when no data exists.

### 12. Daily Budget Tracker Doesn't Account for Offline Purchases
- **Issue:** The today total calculation on the Home page only uses the `purchases` array from the database. Offline-queued purchases are not reflected.
- **Impact:** Users who add purchases offline won't see their budget progress update.
- **Fix:** Include the offline queue count in the daily total calculation.

---

## Part 3: Features to Increase User Engagement

### 1. Push Notifications via Service Worker
- **Current state:** Browser notifications only work when the app is open.
- **Suggestion:** Implement a service worker for proper push notifications. This enables reminders like "You haven't logged today -- keep your streak alive!" which is the number one retention driver in habit-tracking apps.

### 2. Monthly Spending Report / End-of-Month Summary
- **Current state:** Only weekly recaps exist.
- **Suggestion:** Add a monthly summary card that shows total spending vs. income, savings rate, top category, and how much closer/further the user is from their goals. Send this as a push notification on the 1st of each month.

### 3. Social Sharing of Achievements
- **Current state:** Achievements and streaks are private.
- **Suggestion:** Add a "Share" button on achievement badges and streak milestones that generates a shareable image/card (using canvas or a template). This drives organic growth and gives users social validation.

### 4. Spending Heatmap Calendar
- **Current state:** Purchase history is a chronological list.
- **Suggestion:** Add a GitHub-style heatmap calendar view showing daily spending intensity. Green = under budget, yellow = near budget, red = over budget. This creates a visual motivator similar to contribution graphs.

### 5. "No-Spend Day" Challenge
- **Current state:** Challenges focus on weekly savings targets.
- **Suggestion:** Add a specific "No-Spend Day" challenge where users try to have X no-spend days per week. Each successful day earns bonus streak points. This is a popular pattern in budgeting apps (e.g., Cleo, YNAB).

### 6. Category-Specific Budgets
- **Current state:** Only a single daily budget exists.
- **Suggestion:** Let users set monthly budgets per category (e.g., $200/month on dining). Show progress bars on the Insights page for each category budget. This gives users more granular control.

### 7. Savings Milestone Celebrations
- **Current state:** Only goal completion triggers confetti.
- **Suggestion:** Add milestone celebrations at 25%, 50%, 75% of a goal. Show a congratulatory animation and a motivational message. These micro-celebrations keep users engaged through long-term goals.

### 8. Daily Tip / Financial Fact
- **Current state:** Static motivational quotes appear on a couple screens.
- **Suggestion:** Show a rotating daily financial tip or fact on the Home screen (e.g., "Did you know? The average American spends $3,000/year on coffee"). Use AI to personalize tips based on the user's spending patterns.

### 9. Spending Comparison ("You vs. Average")
- **Current state:** Community stats show anonymized participation rates.
- **Suggestion:** Show how the user's spending in each category compares to the national average or to other True Cost users (anonymized). "You spend 40% less on dining than average" is a powerful motivator.

### 10. Recurring Expense Tracker / Subscription Manager
- **Current state:** Recurring detection exists but only suggests frequency during purchase entry.
- **Suggestion:** Add a dedicated "Subscriptions" view that lists all detected recurring expenses (Netflix, Spotify, gym, etc.), shows the monthly total, and suggests which ones to cancel based on usage patterns. This is a high-value feature that drives retention.

---

## Part 4: Remaining App Store Launch Tasks (Cannot Be Done in Lovable)

These items require work outside of Lovable:

1. **Capacitor Setup** -- Requires local CLI to initialize and build the native iOS shell
2. **Apple In-App Purchases (IAP)** -- Must replace or supplement Stripe for iOS subscriptions (Apple requires IAP for digital goods)
3. **App Store Assets** -- 1024x1024 icon (done), but still need device-specific screenshots for all required sizes
4. **App Store Review Compliance** -- Submit for TestFlight beta testing before formal review
5. **Apple Developer Account** -- Requires a $99/year Apple Developer Program membership

---

## Recommended Priority Order for Fixes

1. Fix the subscription check error (active bug blocking core flow)
2. Fix "Delete Account" to actually remove the auth user (Apple requirement)
3. Create the Reset Password page (broken user flow)
4. Fix the login redirect from `/dashboard` to `/home`
5. Fix branding from "SpendWise" to "True Cost"
6. Add delete confirmations for purchases and goals
7. Fix onboarding completion timing
8. Move referral code field in signup form
9. Add empty states to Insights
10. Persist advanced settings
11. Remove or hide stub Plaid integration

