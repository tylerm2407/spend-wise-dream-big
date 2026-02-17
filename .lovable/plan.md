

# Nova Wealth SSO Integration

## Overview
Allow Nova Wealth subscribers to authenticate into Cost Clarity and receive Pro tier access automatically. This uses a shared secret (HMAC-SHA256) to securely pass user identity between the two apps.

## How It Works

1. **From Nova Wealth**: A link sends users to Cost Clarity with a signed token in the URL (e.g., `?nw_token=...`)
2. **Direct visitors**: A "Login via Nova Wealth" button on the login page redirects to Nova Wealth, which authenticates and redirects back with a token
3. **Backend validation**: A backend function verifies the token signature, auto-creates a local account if needed, and returns a session
4. **Pro access**: The subscription check recognizes Nova Wealth users and grants Pro access

## Implementation Steps

### Step 1: Store the CROSS_APP_SECRET
Store your secret securely in the backend so the validation function can use it.

### Step 2: Create `validate-nova-token` backend function
A new backend function that:
- Receives the signed token (contains email, timestamp, HMAC signature)
- Verifies the HMAC-SHA256 signature using the shared secret
- Rejects expired tokens (older than 5 minutes) to prevent replay attacks
- Looks up or auto-creates a local Cost Clarity account using the Nova Wealth email (with a random secure password)
- Marks the profile as a Nova Wealth user (adds `nova_wealth_user: true` flag)
- Returns a valid session for the auto-created/found user

### Step 3: Add `nova_wealth_user` column to profiles table
A database migration to add a boolean column `nova_wealth_user` (default `false`) to the profiles table, so the subscription system can identify these users.

### Step 4: Update `check-subscription` function
Modify the existing subscription check to grant Pro access when `nova_wealth_user` is `true` on the user's profile, regardless of Stripe subscription or trial status.

### Step 5: Add token detection on page load
In the main App component, detect the `nw_token` URL parameter on load. If present:
- Call the `validate-nova-token` function
- Set the returned session in the auth state
- Remove the token from the URL
- Redirect to `/home`

### Step 6: Add "Login via Nova Wealth" button to the login page
Add a styled button below the existing Google/Apple sign-in options. When clicked, it redirects to a Nova Wealth URL (configurable) that will authenticate the user and redirect back with a signed token.

---

## Technical Details

### Token Format
The `nw_token` is a Base64-encoded JSON string:
```text
Base64({ email, timestamp, signature })
```
Where `signature = HMAC-SHA256(email + timestamp, CROSS_APP_SECRET)`

### validate-nova-token Edge Function
- Path: `supabase/functions/validate-nova-token/index.ts`
- Config: `verify_jwt = false` (public endpoint since unauthenticated users call it)
- Uses `CROSS_APP_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` to validate and create sessions
- Uses `supabase.auth.admin.createUser()` for auto-creation and `supabase.auth.admin.generateLink()` or sign-in to return a session

### Database Migration
```sql
ALTER TABLE public.profiles 
ADD COLUMN nova_wealth_user boolean NOT NULL DEFAULT false;
```

### Files Modified
- `supabase/functions/validate-nova-token/index.ts` -- new edge function
- `supabase/config.toml` -- add `verify_jwt = false` for the new function
- `supabase/functions/check-subscription/index.ts` -- add Nova Wealth Pro access check
- `src/App.tsx` -- add `NovaWealthTokenHandler` component for token detection
- `src/pages/Login.tsx` -- add "Login via Nova Wealth" button

### Nova Wealth Side (for you to add later)
You will need to add token generation logic to your Nova Wealth project that:
1. Creates a signed token with the user's email and current timestamp
2. Redirects to `https://spend-wise-dream-big.lovable.app/?nw_token=<token>`

