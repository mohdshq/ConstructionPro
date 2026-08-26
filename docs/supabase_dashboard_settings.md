# Supabase & PowerSync Dashboard Configuration Reference

> [!IMPORTANT]
> **Manual Configuration Required**: These settings are configured directly in the Supabase and PowerSync web dashboards and are **not captured in source control migrations**. If the Supabase project is ever recreated, cloned, or if a separate staging project is provisioned, these settings **must be verified and re-applied manually**.
>
> **Last Verified**: 2026-08-26 (Instance `6a26a0380ef84ed6719ff419`)

---

## 1. Supabase Auth Settings (Authentication -> Settings)

### JWT Expiry Limit
- **Setting / Observed**: `3600` seconds (1 hour — default).
- **Rationale**: Do not increase JWT expiry. Raising the access token lifespan increases the security blast radius if a token is compromised. With the **B9 Offline-Grace Architecture** implemented in the client app, field engineers can work offline seamlessly for up to 30 days without needing an artificially long JWT expiry.

### Time-box User Sessions
- **Setting / Observed**: **Disabled** (unchecked).
- **Rationale**: Time-boxing unconditionally revokes user refresh tokens after a hard cutoff regardless of user activity. Enabling this would terminate active field sessions abruptly in the middle of ongoing projects.

### Inactivity Timeout
- **Setting / Observed**: **Disabled** (unchecked).
- **Rationale**: Any inactivity timeout shorter than a field team's offline stretch (e.g. working on remote basement sites or tunnels over a multi-day inspection without connectivity) will cause the auth server to invalidate the session on reconnect, destroying offline session resumption and defeating offline-grace mode.

### Single Session Per User
- **Setting / Observed**: **Disabled** (unchecked).
- **Rationale**: Site engineers routinely use a mobile phone for quick photo snagging while simultaneously using a tablet (iPad) for drawing markups and detailed PDF inspections under the same account. Single session enforcement would sign out one device whenever the other is used.

### Confirm Email (Release Blocker B2)
- **Setting / Observed**: **On** (checked / enabled — verified 2026-08-26).
- **Rationale**: Prevents unauthorized registration and prevents arbitrary account takeover by requiring verified ownership of the email address prior to first sign-in. `app/(auth)/register.tsx` handles the null-session signup response by presenting "Please check your email to verify your account" and returning to login via `router.dismissTo('/(auth)/login')`.

### Detect and Revoke Potentially Compromised Refresh Tokens (Release Blocker B10)
- **Setting / Observed**: **On** (enabled).
- **Rationale**: Critical auth security protection against token replay / theft attacks. With `processLock` configured in `lib/supabase.ts`, concurrent in-process token refresh calls are serialized, making this protection completely safe from false-positive session revocations.

---

## 2. PowerSync Dashboard Settings (Instance `6a26a0380ef84ed6719ff419`)

### Client Authentication & Token Mode (Release Blocker B1)
- **Development Tokens**: **Off** (unchecked — deployed state verified 2026-08-26).
- **Use Supabase Auth**: **On** (with Legacy JWT secret present).
- **JWKS URI**: `https://nalbazjndjozdksulbwx.supabase.co/auth/v1/.well-known/jwks.json` (ECC P-256 keys).
- **JWT Audience**: `authenticated` (matches Supabase JWT `aud` claim).
- **Rationale**: When Development Tokens are disabled, PowerSync strictly validates Supabase-issued user JWTs against the Supabase JWKS endpoint. Client code in `lib/powersync/Connector.ts` transmits `session.access_token` with audience `authenticated`.

---

## 3. Supabase Storage Settings & RLS Policies (Release Blocker B4)

### Buckets Configuration
- **`avatars`**: **Public** bucket (allows fast CDN reads for profile pictures).
- **`report-photos`**: **Private** bucket (contains sensitive project cover photos and report inspection photos).
- **`drawings`**: **Private** bucket (contains project architectural drawings and contract documents).

### Storage RLS Policies
> [!NOTE]
> Permissive policies combine with `OR`. Existing legacy user-scoped policies (`(storage.foldername(name))[1] = auth.uid()::text`) are preserved so legacy uploads remain readable, while new project-scoped policies enable shared project collaboration for `drawings` and `report-photos`.
>
> Tracked in migration: `supabase/migrations/20260819120000_b4_collaborative_storage_policies.sql`.

```sql
-- ==============================================================================
-- B4: Collaborative Storage Policies & Project Access Helper
-- Buckets: drawings, report-photos
-- Path Structure: <projectId>/<filename>
-- ==============================================================================

-- 1. Helper Function: SECURITY DEFINER check for project access
CREATE OR REPLACE FUNCTION public.can_access_project(p_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id::text = p_id
      AND pm.user_id = (SELECT auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = p_id
      AND p.user_id = (SELECT auth.uid())
  );
$$;

-- 2. SELECT: Project members and owners can read project media
CREATE POLICY "Project members can read project media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('drawings', 'report-photos')
  AND public.can_access_project((storage.foldername(name))[1])
);

-- 3. INSERT: Project members and owners can upload project media
CREATE POLICY "Project members can upload project media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('drawings', 'report-photos')
  AND public.can_access_project((storage.foldername(name))[1])
);

-- 4. UPDATE: Project members and owners can update/upsert project media
CREATE POLICY "Project members can update project media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id IN ('drawings', 'report-photos')
  AND public.can_access_project((storage.foldername(name))[1])
);

-- 5. DELETE: Project members and owners can delete project media
CREATE POLICY "Project members can delete project media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('drawings', 'report-photos')
  AND public.can_access_project((storage.foldername(name))[1])
);
```


---

## Summary Checklist for New Environments

| Service | Setting | Required Value | Purpose |
| :--- | :--- | :--- | :--- |
| **Supabase** | JWT Expiry | `3600` seconds | Standard secure access token lifespan |
| **Supabase** | Time-box Sessions | `Disabled` | Prevents arbitrary session expiration |
| **Supabase** | Inactivity Timeout | `Disabled` | Preserves offline-grace field sessions |
| **Supabase** | Single Session Per User | `Disabled` | Allows simultaneous Phone + Tablet usage |
| **Supabase** | Confirm Email | `Enabled` | Enforces email verification on signup (B2) |
| **Supabase** | Detect Compromised Refresh Tokens | `Enabled` | Prevents token reuse attacks; safe via `processLock` (B10) |
| **Supabase Storage** | `avatars` Bucket | `Public` | Fast CDN access for user avatars |
| **Supabase Storage** | `drawings` Bucket | `Private` + Project RLS | Collaborative project document access (B4) |
| **Supabase Storage** | `report-photos` Bucket | `Private` + Project RLS | Collaborative report & cover media access (B4) |
| **PowerSync** | Dev Tokens | `Disabled` | Enforces secure JWKS token verification (B1) |
| **PowerSync** | JWT Audience | `authenticated` | Authorizes Supabase auth tokens |
