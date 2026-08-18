# Supabase & PowerSync Dashboard Configuration Reference

> [!IMPORTANT]
> **Manual Configuration Required**: These settings are configured directly in the Supabase and PowerSync web dashboards and are **not captured in source control migrations**. If the Supabase project is ever recreated, cloned, or if a separate staging project is provisioned, these settings **must be verified and re-applied manually**.

---

## 1. Supabase Auth Settings (Authentication -> Settings)

### JWT Expiry Limit
- **Setting**: `3600` seconds (1 hour — default).
- **Rationale**: Do not increase JWT expiry. Raising the access token lifespan increases the security blast radius if a token is compromised. With the **B9 Offline-Grace Architecture** implemented in the client app, field engineers can work offline seamlessly for up to 30 days without needing an artificially long JWT expiry.

### Time-box User Sessions
- **Setting**: **Disabled** (unchecked).
- **Rationale**: Time-boxing unconditionally revokes user refresh tokens after a hard cutoff regardless of user activity. Enabling this would terminate active field sessions abruptly in the middle of ongoing projects.

### Inactivity Timeout
- **Setting**: **Disabled** (unchecked).
- **Rationale**: Any inactivity timeout shorter than a field team's offline stretch (e.g. working on remote basement sites or tunnels over a multi-day inspection without connectivity) will cause the auth server to invalidate the session on reconnect, destroying offline session resumption and defeating offline-grace mode.

### Single Session Per User
- **Setting**: **Disabled** (unchecked).
- **Rationale**: Site engineers routinely use a mobile phone for quick photo snagging while simultaneously using a tablet (iPad) for drawing markups and detailed PDF inspections under the same account. Single session enforcement would sign out one device whenever the other is used.

### Confirm Email (Release Blocker B2)
- **Setting**: **Enabled**.
- **Rationale**: Prevents unauthorized registration and prevents arbitrary account takeover by requiring verified ownership of the email address prior to first sign-in.

### Detect and Revoke Potentially Compromised Refresh Tokens (Release Blocker B10)
- **Setting**: **Enabled**.
- **Rationale**: Critical auth security protection against token replay / theft attacks. With `processLock` configured in `lib/supabase.ts`, concurrent in-process token refresh calls are serialized, making this protection completely safe from false-positive session revocations.

---

## 2. PowerSync Dashboard Settings

### Development Tokens (Release Blocker B1)
- **Setting**: **Disabled** in production (enable only temporarily during local diagnostic setup).
- **Rationale**: When Development Tokens are enabled, token signature verification is bypassed, allowing arbitrary client connections and exposing multi-tenant data. Production builds must strictly validate Supabase JWKS tokens (`aud: "authenticated"`).

### Client Auth / JWKS Configuration
- **JWKS URI**: `https://<supabase-project-ref>.supabase.co/auth/v1/.well-known/jwks.json` (ECC P-256 signing keys).
- **JWT Audience**: Must include `authenticated` (Supabase signs user JWTs with `aud: "authenticated"`).

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
| **PowerSync** | Dev Tokens | `Disabled` | Enforces secure JWKS token verification (B1) |
| **PowerSync** | JWT Audience | `authenticated` | Authorizes Supabase auth tokens |
