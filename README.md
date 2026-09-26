# Bulk Density Sample Collection

Mobile-friendly surveyor app for collecting one soil sample per farmer plot.

Data is stored in Supabase. Photos upload to Supabase Storage. Maps use Google Maps.

## Local development

```bash
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database

Run `supabase/schema.sql` in the Supabase SQL editor, then import farmer/plot rows with:

`farmer_name,farmer_id,village_id,village_name,base,field_type,plot_id,lat,long`

Do not seed `status`. It becomes collected when a sample is submitted.

## GitHub Pages

Secrets alone are not enough. The Pages **source must be GitHub Actions**, not "Deploy from a branch" / `docs`. Branch deploys only publish markdown/docs and never run the Next.js build that injects your secrets.

Live site: [https://chitrali-srinivas.github.io/bulk-density-sample-collection-1/](https://chitrali-srinivas.github.io/bulk-density-sample-collection-1/)

1. **Settings → Secrets and variables → Actions** — add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**
3. Restrict the Google Maps key to `https://chitrali-srinivas.github.io/*`
4. Push to `main`, or open **Actions → Deploy GitHub Pages → Run workflow**

The workflow sets `NEXT_PUBLIC_BASE_PATH` from the repo name automatically (`/bulk-density-sample-collection-1`).
