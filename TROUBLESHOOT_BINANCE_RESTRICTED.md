# Binance "Restricted Location" Error

If you see:

> **Service unavailable from a restricted location according to 'b. Eligibility'**  
> or **Your server IP (Railway) is in a region Binance restricts**

…then Binance is blocking requests from your **backend server's IP address**, not your personal location. Railway and many cloud hosts run in regions Binance restricts (e.g., US, certain EU countries).

## Solution: Use a Proxy

Route Binance API calls through an HTTP(S) proxy whose IP is in an **allowed region** (e.g., Singapore, Hong Kong).

### 1. Get a Proxy

Options:

- **Residential/datacenter proxy** (e.g. Bright Data, Oxylabs, SmartProxy)
- **VPS in an allowed region** (e.g. DigitalOcean Singapore) and run a simple HTTP proxy (e.g. Squid)
- **Cloud function / serverless** in an allowed region that forwards requests

### 2. Set `BINANCE_HTTPS_PROXY` on Railway

In **Railway** → your backend service → **Variables**:

```
BINANCE_HTTPS_PROXY=http://user:password@proxy-host:port
```

Examples:

- `http://proxy.example.com:8080`
- `http://user:pass@proxy.example.com:3128`
- `https://proxy.example.com:443` (if the proxy supports HTTPS)

### 3. Redeploy

Redeploy the backend after adding the variable so it takes effect.

### 4. Test Again

Run **Test Spot** again. Requests will go through the proxy, and Binance will see the proxy’s IP instead of Railway’s.

---

## Why This Happens

- Binance blocks by **request origin IP**.
- The origin is the **server making the request** (your backend on Railway).
- Railway IPs are often in regions Binance restricts.
- A proxy in an allowed region makes requests appear to come from there.

## Security

- Use a trusted proxy provider.
- Prefer proxies that support authentication (`user:pass@host`).
- Do not log proxy credentials.
