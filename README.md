# Bulk Density Sample Collection

Mobile-friendly surveyor app for collecting one soil sample per farmer plot.

Data is stored in Supabase. Photos upload to Supabase Storage. Maps use Google Maps.
Only allowlisted surveyor emails can sign in. Sample rows store the surveyor name.

## Local development

```bash
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database

1. Run `supabase/schema.sql` in the Supabase SQL editor  
   (or `supabase/surveyor-auth.sql` if `farmer_plots` already exists).
2. Import farmer/plot rows with:

`farmer_name,farmer_id,village_id,village_name,base,field_type,plot_id,lat,long`

Do not seed `status`. It becomes collected when a sample is submitted.

3. Import surveyors with `supabase/surveyors_template.csv`:

`email,name`

Example:

```csv
email,name
alex@company.com,Alex Surveyor
sam@company.com,Sam Field
```

Or insert in SQL:

```sql
insert into public.surveyors (email, name) values
  ('alex@company.com', 'Alex Surveyor')
on conflict (email) do update set name = excluded.name, active = true;
```

When a surveyor submits a sample, `farmer_plots.surveyor_name` and `surveyor_email` are set from this list.

## Auth setup (required)

Login uses **email + password** (no magic-link email / no Pro email templates).

### 1. Enable Email provider

Supabase → **Authentication → Providers → Email** → enable Email.  
You can disable “Confirm email” for simpler field onboarding.

### 2. Create each surveyor login

For every surveyor:

1. **Authentication → Users → Add user**
   - Email: their work email  
   - Password: temporary password you share with them  
   - Auto Confirm User: **ON**
2. Add the same email to the allowlist table `surveyors` (`email`, `name`)

```sql
insert into public.surveyors (email, name) values
  ('alex@company.com', 'Alex Surveyor')
on conflict (email) do update set name = excluded.name, active = true;
```

Both steps are required: Auth user (password) **and** `surveyors` row (name + allowlist).

### 3. URL configuration (optional, for dashboard defaults)

**Authentication → URL configuration**

- Site URL: `https://chitrali-srinivas.github.io/bulk-density-sample-collection-1/`
- Redirect URLs: that URL and `http://localhost:3000/**`

Surveyors open the app and sign in with email + password. Unknown emails are rejected.

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
