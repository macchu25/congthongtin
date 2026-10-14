# Connection Check

A privacy-first IP and browser connection checker with an administrator analytics dashboard. Built with Next.js App Router, TypeScript, Tailwind CSS, Mongoose, and MongoDB.

## Local setup

1. Install Node.js 20 or newer and MongoDB Atlas (or a local MongoDB instance).
2. Copy `.env.example` to `.env.local` and set `MONGODB_URI`, `SESSION_SECRET`, and `ANALYTICS_SECRET`. Generate two independent secrets with `openssl rand -base64 32`.
3. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (at least 12 characters). Run `npm install` and `npm run seed:admin` to provision the administrator. There is no public registration flow.
4. Run `npm run dev`, then open `http://localhost:3000`.

IP geolocation uses IPinfo when `IPINFO_TOKEN` is configured. Without it, the app uses the ipapi.co free endpoint. The public page records a visit automatically as it renders. Set an IPinfo token for predictable quota and production service terms.

## Vercel deployment

Import the repository into Vercel and set these Environment Variables for Production and Preview as appropriate:

- `MONGODB_URI` — MongoDB Atlas connection URI. Add Vercel's outbound connectivity per your Atlas network policy.
- `SESSION_SECRET` and `ANALYTICS_SECRET` — independent random secrets, each at least 32 bytes.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` — initial administrator credentials, used by the seed script.
- `IPINFO_TOKEN` — optional but recommended geolocation service token.
- `NEXT_PUBLIC_APP_URL` — deployed HTTPS origin.

After deployment, run `npm run seed:admin` from a trusted local environment configured with the production MongoDB URI and administrator credentials. The seed script creates or updates the single configured administrator; never expose database credentials in client variables. Build command is `npm run build`; Vercel detects Next.js automatically.

## Privacy and security behavior

- The public summary is rendered from request headers, user-agent parsing, and an approximate IP lookup. A public IP is necessarily processed to answer the visitor's request.
- Each request to the public homepage automatically creates an analytics event. The page clearly tells visitors what is stored and why.
- Raw events store the full client IP address for display to the administrator, plus a truncated network prefix and a keyed HMAC visitor identifier that rotates monthly. These records are personal and pseudonymous data, not anonymous data.
- MongoDB TTL index deletes event records after 30 days. Daily counters retain aggregate visit and device totals.
- Admin sessions use a signed, eight-hour HTTP-only, SameSite=Lax cookie. Mutating API routes validate the Origin; admin sign-in is rate limited. In-memory rate limiting is best-effort and resets on serverless instance recycling, so use Vercel Firewall/WAF for stronger cross-instance throttling at scale.
- Geo lookup vendors receive the visitor IP as necessary to provide the requested location/provider summary. Review the selected provider's data terms and include them in your privacy notice before launch.

## Data models

Mongoose creates `admins`, `analyticsevents`, and `dailystats`. Event TTL and query indexes are defined in `lib/models.ts`; MongoDB creates them on model initialization.
