

## RevenueCat Webhook Implementation

### Webhook URL
```
https://djtnimphritsoxtoeouh.supabase.co/functions/v1/revenuecat-webhook
```
Paste this into your RevenueCat dashboard under **Project Settings > Integrations > Webhooks**.

### What gets built

**1. New edge function: `supabase/functions/revenuecat-webhook/index.ts`**
- Public endpoint (no JWT required) that receives POST events from RevenueCat
- Validates the webhook using the `REVENUECAT_WEBHOOK_AUTH_KEY` secret (the Authorization header RevenueCat sends)
- Handles these event types:
  - `INITIAL_PURCHASE` -- grant Pro access
  - `RENEWAL` -- extend Pro access
  - `CANCELLATION` -- revoke Pro access
  - `PRODUCT_CHANGE` -- update product info
  - `EXPIRATION` -- revoke Pro access
  - `BILLING_ISSUE_DETECTED` -- log warning
  - `SUBSCRIBER_ALIAS` -- log only
- For grant/revoke events, updates the user's subscription status by querying RevenueCat's REST API for the `Pro_Tier` entitlement and storing the result in the `profiles` table (new columns)

**2. Database migration -- add IAP tracking columns to `profiles`**
- `iap_active` (boolean, default false) -- whether the user has an active in-app purchase
- `iap_product_id` (text, nullable) -- the product identifier
- `iap_expires_at` (timestamptz, nullable) -- when the IAP subscription expires
- `iap_updated_at` (timestamptz, nullable) -- last webhook update time

**3. Update `supabase/config.toml`**
- Add `[functions.revenuecat-webhook]` with `verify_jwt = false` (public webhook endpoint)

**4. Update `check-subscription/index.ts`**
- Read the new `iap_active` column from `profiles` instead of (or in addition to) calling RevenueCat REST API on every check, making subscription checks faster and more reliable

**5. Secret needed**
- `REVENUECAT_WEBHOOK_AUTH_KEY` -- the authorization key you set in RevenueCat's webhook settings (used to verify incoming requests). You can set this to any random string, then paste the same value into RevenueCat dashboard.

### What to configure in RevenueCat dashboard
1. Go to **Project Settings > Integrations > Webhooks**
2. Set the URL to the webhook URL above
3. Set the Authorization header value (this becomes the `REVENUECAT_WEBHOOK_AUTH_KEY` secret)

### Technical details

The webhook edge function flow:
```text
RevenueCat POST --> revenuecat-webhook edge function
  |-> Validate Authorization header
  |-> Parse event type + app_user_id (= Supabase user ID)
  |-> Update profiles.iap_active / iap_product_id / iap_expires_at
  |-> Return 200 OK
```

The `Pro_Tier` entitlement ID matches what's already configured in `useRevenueCat.tsx` and will be checked in the webhook's entitlement validation.

