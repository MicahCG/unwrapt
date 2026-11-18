# Unwrapt

Never miss a moment: Unwrapt remembers the people and occasions that matter, helps pick the gift
(with Thea, the AI gift concierge), and sends it for you.

## Stack
- **Frontend:** Vite + React + TypeScript + Tailwind + shadcn/ui, deployed on Vercel (iOS wrapper via Capacitor)
- **Backend:** Supabase (Postgres, Auth, Edge Functions in Deno)
- **Fulfillment:** Goody · **Payments:** Stripe · **Email:** Resend

## Local development
```sh
git clone <repo-url>
cd unwrapt
npm install
cp .env.example .env   # fill in values
npm run dev            # http://localhost:8080
```

Useful commands: `npm run build`, `npm run lint`, `npm test`.
Edge functions live in `supabase/functions/` and are deployed separately from the frontend
(`npx supabase functions deploy <name> --project-ref <ref>`).
