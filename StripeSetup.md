# Stripe Setup — Unified Chat Hub

## Overview

This document covers how to set up Stripe for selling message credits in Unified Chat Hub.
**$X.00 = ## messages.** No credit card data is ever stored on our servers — Stripe handles the entire payment flow on their hosted checkout page.

---

## Table of Contents

1. [Create a Stripe Account](#create-a-stripe-account)
2. [Get Your API Keys](#get-your-api-keys)
3. [Configure Your Application (.env)](#configure-your-application-env)
4. [Set Up Webhooks (Production)](#set-up-webhooks-production)
5. [Testing Locally](#testing-locally)
   - [Install Stripe CLI](#install-stripe-cli)
   - [Run Local Test](#run-local-test)
   - [Test Card Numbers](#test-card-numbers)
6. [Going Live (Production)](#going-live-production)
7. [Admin Credit Management](#admin-credit-management)
8. [Troubleshooting](#troubleshooting)

---

## Create a Stripe Account

1. Go to **[https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)**
2. Sign up with your email (e.g., `35sites.manager@gmail.com`)
3. Fill in your business/legal information
4. You can start in **Test mode** immediately — no business verification is needed to test

---

## Get Your API Keys

### Test Keys (for development)

1. In the Stripe Dashboard, at the top right, make sure **"Live mode" is OFF** (toggle it off if needed)
2. Go to **Developers → API Keys**
3. Copy both keys:
   - **Publishable key** → starts with `pk_test_...`
   - **Secret key** → starts with `sk_test_...`

### Live Keys (for production)

1. Toggle **"Live mode" ON** at the top right of the dashboard
2. Go to **Developers → API Keys**
3. Copy both keys:
   - **Publishable key** → starts with `pk_live_...`
   - **Secret key** → starts with `sk_live_...`

> ⚠️ **Never commit your Secret key (`sk_live_...`) to version control.** It goes in `.env` only.

---

## Configure Your Application (.env)

Open your `.env` file and add/update the following lines:

```env
# ==========================================
# Stripe Payment Configuration
# ==========================================
STRIPE_SECRET_KEY=sk_test_your_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Key usage

| Variable | Where it's used | Notes |
|----------|-----------------|-------|
| `STRIPE_SECRET_KEY` | Server-side: creates checkout sessions, verifies webhook signatures | Must be the **Secret key** (sk_test or sk_live) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Not currently used client-side (future: Stripe Elements). Safe to expose. | Must be the **Publishable key** (pk_test or pk_live) |
| `STRIPE_WEBHOOK_SECRET` | Server-side: verifies webhook event signatures | Differs for test vs production (see below) |

---

## Set Up Webhooks (Production)

Webhooks let Stripe notify your app when a payment completes so credits can be added automatically.

### Steps

1. Go to the Stripe Dashboard: **[https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)**
2. Or navigate: **Settings** (gear icon ️) → **"Add destination"** under Webhooks
3. Click **"+ Add destination"** or **"Add endpoint"**
4. Fill in:

| Field | Value |
|-------|-------|
| **Event destination scope** | `Your account` |
| **API version** | Leave default (any version works) |
| **Events** | Select **only** `checkout.session.completed` (search for "checkout") |
| **Destination name** | Something like `fascinating-wonder` (auto-generated) |
| **Endpoint URL** | `https://uchathub.35sitesai.com/api/checkout/webhook` (your production URL) |
| **Description** | `Unified Chat Hub - Credit purchase webhook for adding message balance` |

5. Click **Save**
6. On the endpoint details page, find the **Signing secret** section
7. Click **"Reveal"** and copy the value (starts with `whsec_...`)
8. Add it to your production `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_live_xxxxxxxxx
```

### Important notes

- The endpoint URL **must be HTTPS** — Stripe will not send to `http://`
- The webhook endpoint in the code is: `POST /api/checkout/webhook`
- It only listens for `checkout.session.completed` events
- On successful payment, it increments `messageBalance` by 50

---

## Testing Locally

You don't need the Dashboard webhook for local testing. Instead, use the **Stripe CLI** to forward events from Stripe's servers to your localhost.

### Install Stripe CLI

The CLI is already installed at:
```
C:\LocalData\Dev\ChatLibrary\unified-chat\.tools\stripe\stripe.exe  (v1.42.13)
```

If you need to reinstall it in the future:
```powershell
# Download (requires 7-Zip or manual extraction)
# URL: https://github.com/stripe/stripe-cli/releases/download/v1.42.13/stripe_1.42.13_windows_x86_64.zip
# Extract stripe.exe to .\tools\stripe\
```

Alternatively, on a system with scoop:
```powershell
scoop install stripe
```

Or winget (when available in catalog):
```powershell
winget install Stripe.stripe
```

### Authenticate CLI with Stripe

```powershell
cd C:\LocalData\Dev\ChatLibrary\unified-chat
& ".tools\stripe\stripe.exe" login
```

A browser window will open asking to authorize the CLI with your Stripe account. Click **Confirm**.

### Run Local Test

You need **2 terminal windows**:

#### Terminal 1 — Dev server
```powershell
cd C:\LocalData\Dev\ChatLibrary\unified-chat
npm run dev
```

#### Terminal 2 — Webhook forwarding
```powershell
cd C:\LocalData\Dev\ChatLibrary\unified-chat
& ".tools\stripe\stripe.exe" listen --forward-to http://localhost:3031/api/checkout/webhook --events checkout.session.completed
```

The output will show a **temporary webhook signing secret**:
```
> Ready! Your webhook signing secret is whsec_test_xxxxx (^C to quit)
```

**Copy that `whsec_test_...` value** and update your `.env`:

```env
STRIPE_SECRET_KEY=sk_test_xxx      # from Stripe Dashboard (test mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxx   # ← FROM STRIPE LISTEN OUTPUT, NOT DASHBOARD!
```

> ⚠️ **Critical:** The webhook secret for local testing comes from `stripe listen`, **NOT** from the Stripe Dashboard. They are different values.

#### Terminal 3 (optional) — Trigger webhook events manually
```powershell
& ".tools\stripe\stripe.exe" trigger checkout.session.completed
```

### Make a test payment

1. Ensure `stripe listen` is running (Terminal 2)
2. Ensure your `.env` uses the `stripe listen` webhook secret
3. Restart `npm run dev` if you changed `.env`
4. Log in at `http://localhost:3031`
5. Navigate to `http://localhost:3031/checkout`
6. Click **"Buy Credits with Stripe"**
7. On the Stripe checkout page, use these test card details:

---

### Test Card Numbers

Stripe provides test card numbers that simulate different outcomes:

| Card Number | Result | Use for |
|-------------|--------|---------|
| `4242 4242 4242 4242` | ✅ **Successful payment** | Normal flow |
| `4000 0000 0000 9995` | ❌ **Card declined** | Test error handling |
| `4000 0000 0000 0002` | ❌ **Charge declined** | Test declined flow |
| `4000 0000 0000 0036` | ❌ **Insufficient funds** | Test failure |
| `4000 0025 0000 3155` | ️ **Requires authentication (3DS)** | Test 3D Secure |
| `4000 0000 0025 0004` | ✅ **Successful payment** | Alternative success card |

**Other test fields (any values work):**
- Expiry: `12/30`
- CVC: `123`
- ZIP: `12345`
- Name: anything (e.g., `Test User`)

### Verify the test worked

After a successful test payment:

1. **Browser** should show the success page at `/checkout?success=true`
2. **Terminal 2** (`stripe listen`) should show:
   ```
   <-- checkout.session.completed [evt_xxx]
   ==> 200 http://localhost:3031/api/checkout/webhook
   ```
3. **Side badge** on the chat should update to show +50 credits
4. **Dashboard** (Stripe, test mode) → **Payments** will show the test payment

---

## Going Live (Production)

When you're ready to accept real payments:

### 1. Switch to Live mode keys in `.env`

1. In Stripe Dashboard, toggle **"Live mode" ON** (top right)
2. Go to **Developers → API Keys**
3. Copy your `sk_live_...` and `pk_live_...` keys

Update `.env`:
```env
STRIPE_SECRET_KEY=sk_live_xxx          # ← LIVE key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx    # ← LIVE key
```

### 2. Update the webhook secret

Use the `whsec_live_...` key from the webhook endpoint you created earlier in the Stripe Dashboard (not the `stripe listen` one).

```env
STRIPE_WEBHOOK_SECRET=whsec_live_xxx   # ← From Dashboard webhook endpoint
```

### 3. Verify your webhook endpoint

- The webhook URL on the Dashboard must point to your production domain:
  ```
  https://uchathub.35sitesai.com/api/checkout/webhook
  ```
- Stripe requires HTTPS — ensure your domain has a valid SSL certificate

### 4. Deploy

```powershell
npm run build
# Deploy with your normal Docker/deployment process
```

### 5. Test production payment with a real card

Use a **real credit card** to make a $3.00 purchase. You can immediately refund it from the Stripe Dashboard if desired:
- **Pay → Transactions** → find the payment → **Refund**

Or use Stripe's test cards at `https://uchathub.35sitesai.com/check` with live mode OFF to test the full flow safely.

---

## Admin Credit Management

Once a user has made a purchase, an admin can manage their credits from the **Settings → User Management** panel:

| Button | What it Does |
|--------|-------------|
| **Reset Credits** (green) | Resets `freeUses` to 0, giving the user a fresh set of 15 free messages |
| **Zero Balance** (amber) | Sets `messageBalance` to 0, removing all purchased credits |
| **Reset Pwd** (blue) | Generates a new password for the user |
| **Delete** (red) | Removes the user and all their data (threads, messages, settings) |

Admins can also directly add credits by making a test purchase and not zeroing the balance, or via the database:
```javascript
// In MongoDB:
db.users.updateOne(
  { email: "user@example.com" },
  { $inc: { messageBalance: 50 } }  // Add 50 credits
)
```

### Credit flow for non-API-key users

1. **New user** starts with `freeUses: 0` (gets up to 15 free messages via the global API key)
2. After 15 free messages → the app draws from `messageBalance` (purchased credits)
3. When `messageBalance` drops below 3 → shows a **red badge** in the sidebar with a buy-credits prompt
4. When `messageBalance = 0` → user is blocked and must either purchase credits or add their own API key

### Admins bypass all credit checks (unlimited messages)

### Users with their own OpenRouter API key bypass credit checks entirely (unlimited)

---

## Troubleshooting

### "Your card was declined" (test mode, using test card)

**Cause:** Your app is using `sk_live_...` keys with test card numbers. Stripe rejects this.

**Fix:** Make sure you're in **Test mode** in the Dashboard and using `sk_test_...` / `pk_test_...` keys in `.env`.

### Webhook returns 400

**Cause:** Wrong `STRIPE_WEBHOOK_SECRET` in `.env`.

**Fix:** The webhook secret must match what's sending the event:
- **Local testing:** Use the `whsec_test_...` from `stripe listen` output
- **Production:** Use the `whsec_live_...` from your Dashboard webhook endpoint settings

After changing, **restart `npm run dev`** for the new `.env` values to take effect.

### Webhook returns 500

**Cause:** Missing Stripe keys in `.env`, or the Stripe package is not installed.

**Fix:** Verify all three lines are in `.env`:
```env
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxx
```

### Credits not added after successful payment

1. Check `stripe listen` terminal — did the webhook return `200`?
2. Check the dev server terminal — look for:
   ```
   Stripe webhook: added 50 credits to user xxxxx
   ```
   Or an error:
   ```
   Stripe webhook signature verification failed: ...
   Stripe webhook: missing userId in session metadata
   Stripe webhook DB error: ...
   ```
3. Check the database:
   ```javascript
   // In MongoDB (mongosh):
   db.users.findOne({ email: "user@example.com" }, { name: 1, messageBalance: 1, freeUses: 1 })
   ```

### User is logged out after Stripe redirect

**Cause (now fixed):** The `auth_token` cookie was set with `sameSite: 'strict'` which blocked it from being sent on the cross-site redirect from `checkout.stripe.com`.

**Fix (already applied):** Cookie is now `sameSite: 'lax'` which allows top-level GET redirects from other sites while still protecting POST requests from CSRF.

### "Stripe is not configured" error

The app returns this when `STRIPE_SECRET_KEY` is empty. Restart the dev server after updating `.env`.

### Can't find Webhooks in Stripe Dashboard

Navigate directly to: **[https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)**

Or: Click the Settings gear (⚙️) → look for "Webhooks" or go to **Developers** → **Webhooks**.

---

## Quick Reference

### File/Code Map

| What | Path |
|------|------|
| Checkout page (frontend) | `src/app/checkout/page.tsx` |
| Create checkout session | `src/app/api/checkout/session/route.ts` |
| Receive Stripe webhook | `src/app/api/checkout/webhook/route.ts` |
| Check session status | `src/app/api/checkout/status/route.ts` |
| Credit logic (chat) | `src/app/api/chat/route.ts` |
| User credit display | `src/app/components/ThreadSidebar.tsx` |
| Admin zero balance | `src/app/api/admin/users/zero-balance/route.ts` |
| Admin reset credits | `src/app/api/admin/users/credits/route.ts` |
| Admin user management | `src/app/settings/page.tsx` |
| Package version | `package.json` (0.4.11+) |

### Environment Variables Summary

```env
# Required for Stripe integration
STRIPE_SECRET_KEY=sk_test_...       # Server-side key (test or live)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Client-safe key
STRIPE_WEBHOOK_SECRET=whsec_...     # Signature verification secret
```

### URLs

| Purpose | URL |
|---------|-----|
| Local checkout page | `http://localhost:3031/checkout` |
| Production checkout | `https://uchathub.35sitesai.com/checkout` |
| Stripe test Dashboard | `https://dashboard.stripe.com/test/payments` |
| Stripe live Dashboard | `https://dashboard.stripe.com/payments` |
| Webhook config | `https://dashboard.stripe.com/webhooks` |
| API keys | `https://dashboard.stripe.com/apikeys` |
| Stripe CLI docs | `https://docs.stripe.com/stripe-cli` |
