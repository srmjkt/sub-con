# Pusiknas Data Module

This small module provides utilities to fetch and normalize crime data from Pusiknas (pusiknas.polri.go.id).

Files added in this scaffold:

- `src/lib/pusiknas/client.ts` — core fetchers and normalization functions (placeholders for real endpoints)
- `src/lib/pusiknas/index.ts` — simple re-exports
- `src/lib/pusiknas/sample_responses/sample.json` — a small sample response you can use for local testing
- `src/components/CrimeSummary.tsx` — example React component that consumes the client
- `tests/pusiknas.test.ts` — small test file reading the sample and running normalizeRecord
- `.env.example` — environment variable examples

Usage

1. Discover real endpoints:
   - Open your browser DevTools → Network → XHR/Fetch
   - Visit https://pusiknas.polri.go.id/data_kejahatan and interact with filters
   - Copy the request URL(s) that return JSON or CSV

2. Update `src/lib/pusiknas/client.ts`:
   - Replace the placeholder path `/api/data_kejahatan` with the real endpoint
   - If the site requires headers/cookies, update `fetchUrl` calls to include them

3. Use the module in your app:

```ts
import { fetchByYear } from '@/lib/pusiknas';

const crimes = await fetchByYear(2025);
```

Caching & Preview

- By default the module writes a small file cache to `.cache/pusiknas` when run server-side (Next.js server functions)
- Set `PUSIKNAS_BASE` and `CACHE_TTL` in environment for preview/production builds

Notes

- The scaffold uses a minimal CSV parser; if master CSV files contain quoted fields or commas in fields, swap in a robust CSV parser (csv-parse / papaparse).
- Do not hardcode production secrets. Add any required environment variables to Vercel Preview/Production settings.
