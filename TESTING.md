# API Testing Guide

## `/api/dispense`

This endpoint is called by the ESP32 microcontroller (no browser session). It authenticates using the compartment's `api_key`.

### Get the Rice compartment API key

Run this query in the Supabase SQL Editor:

```sql
select id, product_name, api_key from compartments where slot_number = 1;
```

Copy the `api_key` value from the result.

### Test a normal dispense

```bash
curl -X POST http://localhost:3000/api/dispense \
  -H "Content-Type: application/json" \
  -d '{"api_key": "ec397016-99b0-44ed-a027-2ebb2a8fb91d", "amount": 1}'
```

**Expected response (200):**

```json
{
  "success": true,
  "compartment_id": "uuid",
  "product_name": "Rice",
  "stock_before": 25,
  "stock_after": 24,
  "low_stock_alert": false
}
```

### Test stock clamping (amount exceeds current stock)

First, dispense until stock is low, or use a large amount in one request:

```bash
curl -X POST http://localhost:3000/api/dispense \
  -H "Content-Type: application/json" \
  -d '{"api_key": "PASTE_API_KEY_HERE", "amount": 999}'
```

**Expected response (200) when clamping occurs:**

```json
{
  "success": true,
  "compartment_id": "uuid",
  "product_name": "Rice",
  "stock_before": 3,
  "stock_after": 0,
  "low_stock_alert": true,
  "warning": "Requested amount exceeds available stock, clamped to 0"
}
```

`stock_before` / `stock_after` will reflect the actual values at the time of the request.

## `/api/refill`

This endpoint requires a logged-in admin session (browser cookies). Test it from the compartment detail page UI, or use curl with session cookies after signing in.

```bash
curl -X POST http://localhost:3000/api/refill \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookies>" \
  -d '{"compartment_id": "PASTE_COMPARTMENT_UUID_HERE"}'
```

**Expected response (200):**

```json
{
  "success": true,
  "compartment_id": "uuid",
  "stock_before": 3,
  "stock_after": 25
}
```

## Environment

Ensure `.env.local` includes:

```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The service role key is required for `/api/dispense` and `/api/refill` server-side writes. Never expose it to the browser.
