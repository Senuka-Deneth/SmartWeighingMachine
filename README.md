# Smart Stock Monitor

Maintenance dashboard for smart weighing/dispensing machines used in supermarkets.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Supabase Setup

1. Create a Supabase project and add credentials to `.env.local`
2. Run `supabase/migrations/001_initial_schema.sql` in the SQL editor
3. Run `supabase/migrations/002_seed_data.sql` in the SQL editor
4. Create an admin user in Supabase Auth

## Tech Stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- Supabase (PostgreSQL, Auth, Realtime)
