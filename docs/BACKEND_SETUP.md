# Backend Setup — Supabase

This guide walks through the one-time setup required to connect ConstructionPro to a Supabase project. Time required: **~15 minutes**.

---

## 1. Create the Supabase project

1. Go to https://supabase.com → **New Project**
2. Name: `ConstructionPro` (or whatever you prefer)
3. Database password: use the password generator and save it in your password manager
4. Region: pick the one closest to your users (UAE → `eu-west` or `me-south` if available)
5. Plan: **Free** is fine for development; upgrade to Pro ($25/mo) before launch

When the project finishes provisioning (~2 min), you'll land on the dashboard.

---

## 2. Get your API credentials

1. Sidebar → **Project Settings → API**
2. Copy:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **`anon` `public` key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. Paste both into your local `.env` file (copy from `.env.example` if you haven't yet)

> ⚠️ **Never paste the `service_role` key into the client.** It bypasses RLS and is server-only. Use it only inside Supabase Edge Functions.

---

## 3. Apply the database schema

1. Sidebar → **SQL Editor** → **+ New query**
2. Open `db/schema.sql` from this repo, copy the **entire** contents
3. Paste into the editor, click **Run**

You should see a green "Success. No rows returned" message. This creates:

| Table | Purpose |
|---|---|
| `profiles` | Editable display info per user (1:1 with `auth.users`) |
| `organizations` | Top-level tenant (your construction company) |
| `organization_members` | Users in each org, with role |
| `projects` | Construction projects |
| `reports` | Daily / HSE / Snagging / Quick-Log reports |
| `snags` | First-class snag entity (extracted from snagging reports) |
| `drawing_folders` | Drawing folder hierarchy |
| `drawings` | Drawing files (storage path only, contents in Storage) |

Row-Level Security is enabled on all business tables. A user can only see rows belonging to an org where they are a member.

---

## 4. Create the Storage bucket for files

1. Sidebar → **Storage** → **New bucket**
2. Name: `constructionpro`
3. Public: **OFF** (the app generates signed URLs per request)
4. Click **Save**

### Bucket policies

Go to **Storage → Policies → New policy** on the `constructionpro` bucket and create these four policies:

**SELECT (read):**
```sql
bucket_id = 'constructionpro'
and (
  storage.foldername(name))[1] = 'orgs'
  and exists (
    select 1 from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id::text = (storage.foldername(name))[2]
  )
)
```

**INSERT / UPDATE / DELETE:** use the **same** expression with the appropriate operation toggled. (Supabase lets you tick multiple operations on a single policy.)

Effect: only authenticated users who are members of org `X` can read/write paths starting with `orgs/X/`.

---

## 5. Configure authentication

1. Sidebar → **Authentication → Providers**
2. Enable **Email** (turn on "Confirm email" if you want email verification; off for fastest dev cycle)
3. (Optional, but recommended for launch) Enable:
   - **Apple** — required if you offer any other provider on iOS (App Store rule)
   - **Google** — best conversion in MENA market
4. Sidebar → **Authentication → URL Configuration**
   - **Site URL**: `constructionpro://` (the Expo deep-link scheme from `app.json`)
   - Add redirect URLs for any web deployments later

---

## 6. (Phase 2 prep) Edge Function secrets

When you ship the AI proxy (Phase 2), add these in **Project Settings → Functions → Secrets**:

| Key | Source |
|---|---|
| `GEMINI_API_KEY` | https://aistudio.google.com/ → Get API key |
| `OPENWEATHER_API_KEY` | https://openweathermap.org/api (free tier) |
| `RESEND_API_KEY` | https://resend.com (3 k emails/mo free) |

Edge Functions read these via `Deno.env.get(...)`. The client never sees them.

---

## 7. Verify the connection

In the app:

```bash
npm run start
```

If `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set, `isSupabaseConfigured` from `lib/supabase.ts` will be `true` and the client is ready. You can also test in the dashboard:

```sql
-- In the SQL Editor:
select id, email from auth.users limit 5;
```

---

## Migrations

For future schema changes, add a new file under `db/migrations/` with the next number (e.g. `0002_add_company_logo.sql`) and run it the same way (paste into SQL Editor). When the team grows, switch to the [Supabase CLI](https://supabase.com/docs/guides/cli) for proper migration management:

```bash
brew install supabase/tap/supabase
supabase link --project-ref <your-ref>
supabase db push
```
