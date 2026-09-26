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

This app is a static Next.js export hosted at:

[https://mati-carbon.github.io/bulk-density-sample-collection/](https://mati-carbon.github.io/bulk-density-sample-collection/)

1. In the GitHub repo, open **Settings → Secrets and variables → Actions** and add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
2. Enable **Settings → Pages → Build and deployment → Source: GitHub Actions**
3. Restrict the Google Maps key to `https://mati-carbon.github.io/*`
4. Push to `main` (or run the **Deploy GitHub Pages** workflow)

The workflow builds with `NEXT_PUBLIC_BASE_PATH=/bulk-density-sample-collection`.
