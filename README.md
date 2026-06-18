# Smart Stock Monitor

## 1. Project Overview

Smart Stock Monitor is a maintenance dashboard for supermarket dispensing machines. It tracks remaining product stock in real time as customers dispense items via keypad input, and alerts store staff when stock runs low.

The system currently manages **one machine** with **four compartment slots**. Only **Slot 1 (Rice)** is active and connected to the dispense API. Slots 2–4 are reserved for future products and appear on the dashboard as "Not Configured" until activated in the database.

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router, TypeScript), Tailwind CSS |
| Backend | Next.js API Routes (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password, server-side session cookies) |
| Realtime | Supabase Realtime (live stock updates on dashboard) |
| Notifications | web-push (PWA push alerts for low-stock events) |

---

## 3. Local Setup

Follow these steps from a fresh clone to a running dev server.

### Step 1 — Install dependencies

```bash
npm install
```

### Step 2 — Create Supabase project and run migrations

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in the Supabase dashboard.
3. Run each migration file **in order**:

   ```
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_seed_data.sql
   supabase/migrations/003_push_endpoint_unique.sql
   supabase/migrations/004_realtime_logs_and_replica_identity.sql
   supabase/migrations/005_reduce_capacity_to_6kg.sql
   ```

   Migration 001 creates tables and RLS policies. Migration 002 seeds machine #1 and four compartments (Rice active at 6 kg, slots 2–4 inactive). Migration 003 adds a unique constraint on push subscription endpoints. Migration 004 enables realtime on log tables. Migration 005 sets compartment capacity to 6 kg and low-stock threshold to 1 kg (safe to re-run on fresh installs).

### Step 3 — Configure environment variables

Create `.env.local` in the project root:

```env
# Supabase (Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_or_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Web Push / VAPID (see Step 5)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@yourdomain.com
```

| Variable | Used by | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Safe to expose |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | Safe to expose (RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | API routes only | **Never expose to the browser** |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Dashboard (push subscribe) | Safe to expose |
| `VAPID_PRIVATE_KEY` | Server push sending | **Never expose to the browser** |
| `VAPID_SUBJECT` | Server push sending | Contact URI, e.g. `mailto:you@example.com` |

### Step 4 — Create an admin user

1. In Supabase dashboard, go to **Authentication → Users**.
2. Click **Add user** and create an email/password account.
3. Use these credentials to sign in at `/login`.

### Step 5 — Generate VAPID keys

The project depends on `web-push`. Generate a key pair:

```bash
npx web-push generate-vapid-keys
```

Copy the **public** and **private** keys into `.env.local` as `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`. Set `VAPID_SUBJECT` to a `mailto:` address for your team.

### Step 6 — PWA icons

Placeholder icons are already included:

- `public/icon-192.png`
- `public/icon-512.png`

These are simple green squares with "SM" text. Replace them with branded icons when ready; the manifest references both files.

### Step 7 — Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`, then `/dashboard` after signing in.

---

## 4. Database Schema Reference

Full SQL is in [`supabase/migrations/`](supabase/migrations/). Summary:

| Table | Purpose |
|-------|---------|
| `machines` | Physical dispensing units. One row per machine (`machine_number` is unique). Tracks online/offline status. |
| `compartments` | Product slots on a machine. Stores product name, stock level, capacity, low-stock threshold, `api_key` (for ESP32 auth), and `active`/`inactive` status. |
| `dispense_logs` | Audit trail of every dispense: amount (kg), stock before/after, timestamp. Written by `/api/dispense`. |
| `refill_logs` | Audit trail of admin refills: stock before refill, who refilled, timestamp. Written by `/api/refill`. |
| `push_subscriptions` | Browser push endpoints for admins who enabled low-stock alerts. One row per device/browser subscription. |

**Relationships:** Each machine has multiple compartments. Each compartment has many dispense/refill logs. Push subscriptions are tied to an auth user.

---

## 5. ESP32 / Hardware Integration Guide

This section is the primary reference for connecting physical keypads. No knowledge of this codebase is assumed.

### 5.1 What the ESP32 needs to do

Each active compartment has its own dedicated keypad and ESP32 microcontroller. When a customer selects a quantity (for example, types `1` and presses confirm), the ESP32 must send **one HTTP POST request** to this system's dispense endpoint.

The server will:

1. Authenticate the request using the compartment's `api_key`
2. Subtract the dispensed amount from `current_stock`
3. Log the event in `dispense_logs`
4. Update the maintenance dashboard in real time (via Supabase Realtime)
5. Optionally trigger a low-stock push notification if stock crosses the threshold

The ESP32 does **not** need Supabase credentials, browser login, or any session cookies — only the compartment `api_key`.

### 5.2 Endpoint details

| Property | Value |
|----------|-------|
| **Production URL** | `https://<your-deployed-domain>/api/dispense` |
| **Local testing URL** | `http://<your-computer-local-ip>:3000/api/dispense` |
| **Method** | `POST` |
| **Headers** | `Content-Type: application/json` |

> **Important:** The ESP32 cannot reach `localhost` or `127.0.0.1`. For local dev, use your computer's LAN IP (e.g. `192.168.1.42`).

**Request body (JSON):**

```json
{
  "api_key": "<compartment's unique api_key>",
  "amount": 1
}
```

| Field | Type | Description |
|-------|------|-------------|
| `api_key` | string | Unique secret for this compartment. Never share across slots. |
| `amount` | number | Kilograms dispensed. Integer or decimal (e.g. `1`, `0.5`). Must be > 0. |

**Example (curl):**

```bash
curl -X POST http://192.168.1.42:3000/api/dispense \
  -H "Content-Type: application/json" \
  -d '{"api_key": "your-rice-api-key-here", "amount": 1}'
```

### 5.3 Getting the API key for Slot 1 (Rice)

Run this in the **Supabase SQL Editor**:

```sql
select id, product_name, api_key from compartments where slot_number = 1;
```

Copy the `api_key` value and store it securely in the ESP32 firmware configuration.

Each compartment has its own `api_key`. When Slots 2–4 are activated later, query by `slot_number` and configure each ESP32 with its respective key.

### 5.4 Response handling

#### Success (HTTP 200)

```json
{
  "success": true,
  "compartment_id": "f64d6ada-015a-4534-a92d-4b91c922919e",
  "product_name": "Rice",
  "stock_before": 6,
  "stock_after": 5,
  "low_stock_alert": false
}
```

| Field | Meaning |
|-------|---------|
| `success` | Dispense was recorded |
| `compartment_id` | UUID of the compartment |
| `product_name` | Product label (e.g. "Rice") |
| `stock_before` | Stock (kg) before this dispense |
| `stock_after` | Stock (kg) after this dispense |
| `low_stock_alert` | `true` if this dispense caused stock to cross below the low-stock threshold |

**Optional field when amount exceeds available stock:**

```json
{
  "warning": "Requested amount exceeds available stock, clamped to 0"
}
```

Stock is never allowed to go negative; it is clamped to `0`.

#### Error responses

| HTTP | Body | Cause |
|------|------|-------|
| **400** | `{ "error": "Invalid request" }` | Missing/invalid `api_key` or `amount` (not a positive number) |
| **401** | `{ "error": "Invalid API key" }` | `api_key` does not match any compartment |
| **403** | `{ "error": "Compartment is not active" }` | Compartment `status` is `inactive` |
| **500** | `{ "error": "..." }` | Server/database error |

**ESP32 firmware guidance (out of scope for this repo):** On non-200 responses, handle gracefully — e.g. show an error on a small display or blink an LED. Retry logic should avoid duplicate dispenses if the customer already received product (consider idempotency in your hardware design).

### 5.5 Network requirements

| Scenario | Requirement |
|----------|-------------|
| **Local dev** | ESP32 and dev computer on the same WiFi/LAN. Use computer's local IP, not `localhost`. Ensure firewall allows inbound TCP on port 3000. |
| **Production (Vercel)** | ESP32 needs internet access. HTTPS is automatic — use your Vercel deployment URL directly. |
| **HTTPS** | Required in production for browser push alerts. The dispense API itself works over HTTP on local LAN for hardware testing. |

**Find your local IP:**

- macOS: `ipconfig getifaddr en0` (WiFi) or check System Settings → Network
- Windows: `ipconfig` → look for IPv4 Address
- Linux: `hostname -I`

### 5.6 Activating Slots 2–4 (future expansion)

To activate Slot 2 as "Sugar" (example):

```sql
update compartments
set product_name = 'Sugar', status = 'active', current_stock = 6
where slot_number = 2
  and machine_id = (select id from machines where machine_number = 1);
```

Then retrieve its API key:

```sql
select id, product_name, api_key from compartments where slot_number = 2;
```

After this:

- The dashboard automatically shows Slot 2 as an active card (no code changes)
- Configure the new ESP32 with that compartment's `api_key`
- Repeat for slots 3 and 4 as products are added

To deactivate a slot:

```sql
update compartments set status = 'inactive', product_name = null where slot_number = 3;
```

---

## 6. Web Push Alerts

### How it works

1. Each compartment has a `low_stock_threshold` (default 1 kg).
2. When `/api/dispense` reduces stock such that it **crosses from above to at or below** the threshold, `low_stock_alert: true` is returned.
3. The server asynchronously sends a push notification to all subscribed admins: *"{product} is running low: {X}kg remaining"*.
4. Notifications use `requireInteraction: true` so they stay visible until dismissed.

### How to enable (admin)

1. Sign in and open the dashboard.
2. If prompted, click **Enable** on the "Enable low-stock alerts" banner.
3. Allow browser notification permission when asked.
4. The subscription is saved to `push_subscriptions`.

If permission was already granted, the banner is hidden.

### Requirements

- **HTTPS** in production (Vercel provides this automatically).
- **localhost** works for development.
- The browser does not need to stay on the dashboard tab, but the OS/browser must allow background notifications for the site.

---

## 7. Known Limitations / Future Improvements

- **Single admin model** — No role-based permissions (all authenticated users see and manage everything).
- **No QR/session tracking** — Dispense events are not tied to customer QR codes; that is handled by a separate sub-system.
- **Browser-dependent push** — Push alerts require a subscribed browser/PWA context, not a native mobile app.
- **No analytics UI** — History is available as raw log tables on compartment detail pages; no charts or aggregated reports.
- **Trust-based stock** — Stock decrements based on the amount reported by the keypad/ESP32. There is no physical weight-sensor validation in this system.
- **One machine** — The dashboard is hardcoded to `machine_number = 1`. Multi-machine support would need UI and query changes.

---

## 8. Project Structure

```
SmartWeighingMachine/
├── public/
│   ├── sw.js                 # Service worker (push notifications, click → dashboard)
│   ├── manifest.json         # PWA manifest
│   ├── icon-192.png          # PWA icon (placeholder)
│   └── icon-512.png          # PWA icon (placeholder)
├── supabase/
│   └── migrations/           # Database schema + seed data (run in order)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── dispense/     # ESP32 webhook — decrement stock
│   │   │   ├── refill/       # Admin refill — reset stock to capacity
│   │   │   └── push/
│   │   │       └── subscribe/  # Save browser push subscription
│   │   ├── dashboard/
│   │   │   ├── page.tsx      # Main dashboard (server)
│   │   │   ├── DashboardClient.tsx  # Realtime cards + push enable banner
│   │   │   └── compartment/[id]/    # Compartment detail + refill UI
│   │   ├── login/            # Admin login (server action)
│   │   ├── layout.tsx        # Root layout, PWA manifest link
│   │   └── page.tsx          # Redirects to /dashboard
│   ├── components/
│   │   ├── CompartmentCard.tsx
│   │   ├── CompartmentDetailClient.tsx
│   │   └── ServiceWorkerRegister.tsx
│   ├── types/
│   │   └── database.ts       # TypeScript interfaces for DB tables
│   └── utils/
│       ├── supabase/         # Supabase clients (browser, server, admin, middleware)
│       ├── webpush.ts        # VAPID configuration for web-push
│       └── send-low-stock-push.ts  # Push notification sender
├── middleware.ts             # Auth session refresh + route protection
├── TESTING.md                # curl examples for API testing
└── .env.local                # Local secrets (not committed)
```

### Key API routes

| Route | Auth | Called by |
|-------|------|-----------|
| `POST /api/dispense` | `api_key` in body | ESP32 keypad |
| `POST /api/refill` | Supabase session cookie | Dashboard refill button |
| `POST /api/push/subscribe` | Supabase session cookie | Dashboard "Enable alerts" |

### Key pages

| Path | Description |
|------|-------------|
| `/login` | Admin sign-in |
| `/dashboard` | Live overview of all 4 compartment slots |
| `/dashboard/compartment/[id]` | Stock detail, refill, threshold editor, dispense/refill history |

---

## Additional resources

- [`TESTING.md`](TESTING.md) — curl commands for manual API testing
- [Supabase docs](https://supabase.com/docs) — database, auth, realtime
- [web-push library](https://github.com/web-push-libs/web-push) — VAPID key generation and protocol details
