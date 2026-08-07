# ConstructionPro — Master Roadmap

> **Last updated**: 2026-08-07
> **Stack**: Expo SDK 54 · Expo Router v6 · RN 0.81 · Zustand v5 · Supabase ·
> PowerSync + op-sqlite · RevenueCat (mobile IAP) · Paddle (web B2B, planned)

---

## Positioning — read before planning any work

**What this is**: the fastest, most reliable way for a site team to produce
**daily reports** and **snag reports** — and, uniquely, a defensible
**contemporaneous record for delay and disruption claims**.

**Primary market**: GCC construction (UAE first), where contracts run on FIDIC
and Extension-of-Time claims live or die on contemporaneous records.

**Sold to both**: individual site engineers buying for themselves, and companies
buying for teams. The individual buyer is the route into the company — this is
the proven growth path in field software, not a compromise.

**What this is NOT**: a Procore competitor. The previous mission ("beat Procore
on speed, Raken on features, Fieldwire on AI") is a three-front war against three
funded companies and is formally retired.

**Frozen scope** — no further investment without an explicit decision:
calculators (19+ exist; move behind a single "Tools" entry), Standards tab,
Explore tab, general AI chat. None of these influence a purchase.

**Buyer vs user**: the field uses it on a phone; the office buys it on a desktop.
Both must work.

---

## Phase status

| Phase | Name | Status |
|:---:|:---|:---:|
| 0–4 | Foundation, backend, realtime, sharing, calculators | ✅ DONE |
| 5a | Offline-first hardening, drawings viewer, repo polish | 🔄 IN PROGRESS |
| **6** | **Security & data-integrity lockdown** | 🔲 **NEXT — blocks everything** |
| 7 | Organisation model & multi-tenancy | 🔲 |
| 8 | Monetisation (dual-rail) | 🔲 |
| 9 | Web app | 🔲 |
| 10 | Arabic / RTL / bilingual reports | 🔲 |
| 11 | Delay & disruption log (the differentiator) | 🔲 |
| 12 | Launch | 🔲 |

---

## Phase 6 — Security & data-integrity lockdown 🔲

**Nothing else ships until this is done.** All items are RELEASE BLOCKERS in
`KNOWN_ISSUES.md`.

- [ ] B1 — Disable PowerSync development tokens
- [ ] B2 — Re-enable Supabase email confirmation
- [ ] B5 — Wire `setupPowerSync()` into app startup
- [ ] B3 — Extend `syncStatus` guard to folders, drawings, activities, calculations
      *(also add the missing update/delete paths for folders and drawings)*
- [ ] B4 — Implement flush-on-reconnect for all `pending` records, with retry +
      exponential backoff. Reuse the S7 deferred-queue pattern.
- [ ] B6 — Migrate photos from base64 → PowerSync attachments + local file URIs
      *(respect Invariant 1: `isRenderablePhoto` keeps accepting all three URI forms)*
- [ ] B7 — Remove or replace `xlsx@0.18.5`
- [ ] H1 — Re-verify `report/create.tsx:434`
- [ ] H2 — Type the `team.tsx` RPC response
- [ ] H4 — Type `insertCalculation`

**Exit criteria** — all must pass manually, on a real device:
1. Airplane mode → create project, report, snag, folder, drawing, calculation →
   reconnect → **all six survive and reach Supabase**
2. Two devices edit the same record offline → reconnect → deterministic
   resolution, no silent loss
3. App killed mid-sync → relaunch → no corruption, no duplicates
4. 40-snag inspection with photos → PDF renders completely;
   **summary count == snags actually in the document**
5. `npm audit` clean of high/critical

---

## Phase 7 — Organisation model 🔲

Do this **before** monetisation — entitlements attach to orgs, and retrofitting
with live customer data is extremely painful.

- [ ] `organizations` table
- [ ] `organization_members` (role: owner | admin | member | viewer)
- [ ] Add `org_id` to every content table; migrate existing rows
- [ ] Rewrite RLS: org-scoped, role-aware
- [ ] **Rewrite every `.eq('user_id', userId)` in `lib/supabaseSync.ts`** — that
      pattern is the current tenancy model and appears in every fetch
- [ ] Fixes H3 by construction (shared projects become visible)
- [ ] **Migrate storage paths `{userId}/...` → `{orgId}/...`** in `uploadPhoto`,
      `uploadDrawingFile`, `uploadAvatar`, and storage RLS; migrate existing objects
- [ ] Auto-create a personal org on signup
- [ ] Invite flow; ownership transfer when a member leaves

**Principle**: one code path. An individual is an organisation with one member.
No separate "personal mode" — divergent paths here will rot.

---

## Phase 8 — Monetisation (dual-rail) 🔲

**Decision (2026-08-07): keep RevenueCat for mobile IAP.** Free to $2,500 MTR,
then 1%. Replacing it means owning Apple/Google receipt validation, notification
webhooks, grace periods, billing retry, restore, refunds and sandbox parity — an
ongoing tax with a catastrophic failure mode (paying user loses access). Bad
trade for a solo developer. RevenueCat is one rail, not the whole system.

- [ ] **`getEntitlements(user, org)` — single source of truth.**
      Reads RevenueCat (mobile IAP) *and* org entitlements from Supabase (web
      purchases), returns one answer. **Every gate in the UI calls this and
      nothing else.** This abstraction is what makes billing providers swappable.
- [ ] Rail A — RevenueCat IAP for individuals (finish the "migration pending" keys
      in `.env.example`)
- [ ] Rail B — Paddle as merchant of record: onboards individuals with no trade
      licence, handles VAT, issues the tax invoices UAE finance departments require
- [ ] Company sign-in flow for web-purchased seats
      *(App Review 3.1.3 enterprise-services carve-out: employees may sign in to
      what their organisation bought. **Do not link to or advertise the external
      purchase path inside the app.** Keep in-app copy neutral.)*

**Tiers**

| Tier | Contents |
|:--|:--|
| Free | 1 active project, limited snags, **watermarked PDF export** — every exported report is marketing landing on a consultant's desk |
| Individual | Unlimited projects/snags, own logo, clean PDFs, offline, AI enrichment. ~$15–25/mo, cheaper annually. Paid personally, so price like a personal purchase |
| Team | Shared projects, roles, assignment, company branding, delay log. **Per project or per company — NOT per seat.** Unlimited field users |
| Enterprise | Custom branding, SSO, support. Invoice and a conversation, not a checkout page |

**Why not per-seat**: it is the loudest complaint in this market and directly
penalises adoption. Free field seats turn the adoption barrier into the pitch.

⚠️ **Free-tier cost risk**: free users on a sync- and photo-heavy offline app cost
real money in storage and bandwidth. Keep limits tight. **Do not launch the free
tier until B6 is done.** Track cost per active user from day one.

---

## Phase 9 — Web app 🔲

Not optional. The consultant reviewing 200 snags will not do it on a phone, and
the person signing the purchase order works at a desk.

- [ ] Verify/repair the `output: "static"` build
- [ ] Guard RevenueCat calls (throws in browser)
- [ ] Responsive review screens: snag list, drawings, report preview
- [ ] Org admin: members, roles, billing

---

## Phase 10 — Arabic / RTL / bilingual 🔲

`expo-localization` is already a dependency and unused.

- [ ] Full RTL layout support
- [ ] AR/EN UI strings
- [ ] **Bilingual reports** — one PDF, both languages.
      *No competitor (PlanRadar, Fieldwire, Procore) offers this. It is the demo
      that closes meetings in the Gulf.*
- [ ] Hijri dates where required
- [ ] WhatsApp as a first-class share action (the actual comms layer of GCC construction)

---

## Phase 11 — Delay & disruption log 🔲 ← **the differentiator**

Highest-value item in the roadmap. Under FIDIC, EOT and disruption claims turn on
**contemporaneous records**, and Clause 20 notice periods are unforgiving.
Contractors lose eight-figure claims on poor site records.

- [ ] Delay events: start/stop timestamps + cause codes
      (weather standby · late information · access denied · client instruction ·
      utility diversion · material shortage · authority approval)
- [ ] Link delays to affected activities and photo evidence
- [ ] Immutable audit trail — **record event time and creation time separately**;
      a record created three weeks later is not contemporaneous and must not
      appear to be
- [ ] Formal EOT-support export
- [ ] Notice-window awareness / reminders

**Positioning**: not a $20/month field tool. Risk documentation for a contractor
with nine figures of exposure. Price and sell accordingly.

---

## Phase 12 — Launch 🔲

- [ ] Store assets, screenshots, privacy policy, terms
- [ ] **Populate the `production` EAS environment** — currently only `preview` has
      variables; production will fail exactly like the preview login bug did
- [ ] `"environment": "production"` in the production build profile
- [ ] Sentry source maps enabled for production (disabled in preview)
- [ ] Design-partner programme: 5–10 UAE contractors/consultants
- [ ] Subcontractor invite loop — free collaborators, the proven growth mechanic

---

## Open non-technical items

- [ ] Dubai freelance permit (~AED 7.5–12K) — unlocks Stripe; defer until revenue
      justifies it. Paddle covers the gap until then.
- [ ] Register a trademark before spending on marketing

---

## Decision log

| Date | Decision | Rationale |
|:--|:--|:--|
| 2026-05-21 | Write-through sync (optimistic local + background push) | Simple, works well |
| 2026-05-21 | Gemini key as Edge Function secret | Never exposed to client; rotatable |
| 2026-05-21 | Compress images 1920px/0.7q before upload | ~70% storage saving |
| 2026-08-07 | Retire "beat Procore/Raken/Fieldwire" mission | Three-front war vs funded competitors, one part-time developer |
| 2026-08-07 | Focus: daily reports + snagging + delay records, GCC/FIDIC first | Founder domain expertise is the only defensible moat |
| 2026-08-07 | Sell to individuals **and** companies from one codebase | Individual buyer is the route into the company; standard field-software growth path |
| 2026-08-07 | **Keep RevenueCat for mobile IAP** | Free <$2.5K MTR then 1%; replacing it means owning receipt validation, webhooks, grace periods, refunds |
| 2026-08-07 | **Add Paddle as second rail for web B2B** | Merchant of record: onboards individuals with no trade licence, handles VAT, issues invoices UAE finance departments require |
| 2026-08-07 | Org-scoped tenancy; individual = org of one | One code path; avoids painful retrofit once customers exist |
| 2026-08-07 | Price per project/company, not per seat | Per-seat is the market's loudest complaint and penalises adoption |
| 2026-08-07 | Freeze calculators / Standards / Explore | Maintenance burden with no influence on purchase |
