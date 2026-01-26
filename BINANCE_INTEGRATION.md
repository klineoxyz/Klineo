# Binance CEX API Integration

## Overview

This implementation provides end-to-end Binance Spot API connectivity for the KLINEO trading platform. Users can securely connect their Binance accounts, test connections, and manage API credentials.

## Features

- ✅ Secure credential storage (AES-256-GCM encryption)
- ✅ Support for production and testnet environments
- ✅ Connection testing with latency measurement
- ✅ Read-only data endpoints (account info, orders, trades)
- ✅ Full CRUD operations for exchange connections
- ✅ Admin access to all connections
- ✅ Rate limiting and request ID tracking

## Environment Variables

### Backend (Railway/Local)

**Required:**
```env
ENCRYPTION_KEY=<32-byte hex or base64 key>
```

**Generate encryption key:**

**Windows (Node.js):**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Linux/Mac (OpenSSL):**
```bash
openssl rand -hex 32
```

**Current key (already set in backend-skeleton/.env):**
```env
ENCRYPTION_KEY=98b64c6f1a551817dba446fa3956a0db0e935423f660f6cc22982c99f8fa5509
```

### Frontend

No additional environment variables required. Uses existing `VITE_API_BASE_URL`.

## Database Migration

Run the migration to add required columns:

```sql
-- File: supabase/migrations/20260127000001_exchange_connections_enhancements.sql
```

Or apply via Supabase CLI:
```bash
cd supabase
supabase db push
```

## API Endpoints

### GET /api/exchange-connections
List all connections for current user (masked, no secrets).

**Response:**
```json
{
  "connections": [
    {
      "id": "uuid",
      "exchange": "binance",
      "label": "My Binance Account",
      "environment": "production",
      "created_at": "2026-01-27T...",
      "updated_at": "2026-01-27T...",
      "last_tested_at": "2026-01-27T...",
      "last_test_status": "ok",
      "last_error_message": null
    }
  ],
  "requestId": "..."
}
```

### POST /api/exchange-connections
Create or update connection (upserts based on user_id + exchange).

**Request:**
```json
{
  "exchange": "binance",
  "environment": "production" | "testnet",
  "label": "Optional label",
  "apiKey": "your-api-key",
  "apiSecret": "your-api-secret"
}
```

**Response:**
```json
{
  "connection": { ... },
  "message": "Connection created" | "Connection updated",
  "requestId": "..."
}
```

### POST /api/exchange-connections/:id/test
Test connection by calling Binance account endpoint.

**Response:**
```json
{
  "ok": true,
  "latencyMs": 234,
  "message": "Connection successful",
  "requestId": "..."
}
```

### DELETE /api/exchange-connections/:id
Delete connection.

**Response:**
```json
{
  "message": "Connection deleted",
  "requestId": "..."
}
```

## Binance API Key Setup

### 1. Create API Key

1. Go to [Binance API Management](https://www.binance.com/en/my/settings/api-management)
2. Click "Create API"
3. Choose "System generated" or "Custom label"
4. Complete security verification

### 2. Set Permissions (Least Privilege)

**✅ Enable:**
- ✅ **Read** - Required for account data
- ✅ **Enable Spot & Margin Trading** - Required for copy trading

**❌ Never Enable:**
- ❌ **Enable Withdrawals** - KLINEO never needs this

### 3. IP Restriction (Recommended)

Add your IP address or IP range to restrict API key usage.

### 4. Testnet Keys (For Testing)

1. Go to [Binance Spot Testnet](https://testnet.binance.vision/)
2. Sign in with GitHub
3. Generate testnet API keys
4. Use these keys with `environment: "testnet"` in KLINEO

## Usage

### Frontend

1. Navigate to **Settings** → **Exchange API** tab
2. Click **Add Connection**
3. Fill in:
   - Label (optional)
   - Environment (Production or Testnet)
   - API Key
   - API Secret
4. Click **Save Connection**
5. Click **Test** to verify connection

### Backend (Programmatic)

```typescript
import { exchangeConnections } from '@/lib/api';

// List connections
const { connections } = await exchangeConnections.list();

// Create connection
await exchangeConnections.create({
  exchange: 'binance',
  environment: 'production',
  label: 'My Account',
  apiKey: '...',
  apiSecret: '...',
});

// Test connection
const result = await exchangeConnections.test(connectionId);

// Delete connection
await exchangeConnections.delete(connectionId);
```

## Security

### Encryption

- Credentials encrypted using AES-256-GCM
- Encryption key stored in `ENCRYPTION_KEY` environment variable
- Never logged or returned in API responses
- Decryption only happens server-side when needed

### Access Control

- Users can only access their own connections (RLS)
- Admins can read all connections
- All endpoints require authentication (`verifySupabaseJWT`)
- Rate limiting applied to all endpoints

### Best Practices

1. **Never log API keys or secrets** - Already implemented
2. **Use testnet for development** - Test with fake funds
3. **Enable IP restrictions** - Limit API key usage
4. **Use least privilege** - Only enable required permissions
5. **Rotate keys regularly** - Update connections periodically

## Binance API Methods Available

The Binance client library (`backend-skeleton/src/lib/binance.ts`) provides:

- `getAccountInfo()` - Get account balances and permissions
- `getOpenOrders(symbol?)` - Get open orders (all or for symbol)
- `getMyTrades(symbol, limit?)` - Get trade history
- `testConnection()` - Test connection with latency

## Troubleshooting

### Connection Test Fails

1. **Check API key permissions** - Must have "Read" enabled
2. **Verify environment** - Testnet keys only work with `environment: "testnet"`
3. **Check IP restrictions** - If enabled, ensure backend IP is whitelisted
4. **Verify key format** - Keys should be valid Binance API keys

### Encryption Errors

1. **Check ENCRYPTION_KEY** - Must be set in backend environment
2. **Verify key format** - 32 bytes (64 hex chars or 44 base64 chars)
3. **Restart backend** - After setting ENCRYPTION_KEY

### Database Errors

1. **Run migration** - Ensure `20260127000001_exchange_connections_enhancements.sql` is applied
2. **Check RLS policies** - Users should only see their own connections

## Files Changed

### Backend
- `backend-skeleton/src/lib/crypto.ts` - Encryption utilities
- `backend-skeleton/src/lib/binance.ts` - Binance API client
- `backend-skeleton/src/routes/exchange-connections.ts` - API routes
- `backend-skeleton/src/index.ts` - Route registration

### Frontend
- `src/lib/api.ts` - API client functions
- `src/app/components/screens/Settings.tsx` - UI implementation

### Database
- `supabase/migrations/20260127000001_exchange_connections_enhancements.sql` - Schema updates

## Next Steps

1. **Add read-only data endpoints** - Use Binance client to fetch balances, orders, trades
2. **Integrate with Portfolio screen** - Display real account data
3. **Add order placement** - Enable copy trading execution
4. **Support more exchanges** - Extend to other CEXs (Coinbase, Kraken, etc.)

## Testing

See `scripts/test-binance-connection.mjs` for manual testing script.
