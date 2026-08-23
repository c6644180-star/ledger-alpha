# Ledger Alpha
A premium, responsive personal portfolio tracker for Indian stocks and SIP mutual funds. It uses a transaction-first model: each purchase has a date, units, and price/NAV, allowing the dashboard to distinguish capital invested, current value, and profit over time.

## Run locally

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and fill in the values.
3. In Supabase, run [`supabase/schema.sql`](./supabase/schema.sql) in the SQL editor.
4. In Supabase Authentication, enable Google and X (Twitter) providers. Add your local and production URLs as redirect URLs.
5. Start: `npm run dev`

Without Supabase configuration the app opens a clearly labelled preview flow using sample data. It does not pretend that this preview has authentication or persistence.

## Production checklist

- Register Google OAuth and X OAuth credentials for the exact production domain, then enter them in Supabase Auth provider settings.
- Add the production callback URL shown by Supabase to each OAuth provider.
- Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_TWELVE_DATA_API_KEY` in the hosting provider’s environment settings.
- Deploy the built `dist/` directory to any static host (Vercel, Netlify, Cloudflare Pages, etc.). Ensure SPA rewrites route unknown paths to `index.html` if your host requires it.

## Market-data behaviour

The **Refresh live prices** action requests NSE quote symbols from Twelve Data and persists a portfolio-history point after a successful refresh. Market-data coverage depends on the selected vendor plan; errors remain visible with a retry control. Mutual fund NAVs are intentionally labelled as delayed/manual until an AMFI-compatible NAV adapter is configured.

For a broker-grade production feed, replace the simple request in `src/main.jsx` with a server-side provider proxy; this prevents exposing a market-data key to the browser and lets you normalize exchange symbols, fund scheme codes, and rate limits. The database schema now includes a `transactions` audit table for buys, sells, dividends, and SIP instalments.
