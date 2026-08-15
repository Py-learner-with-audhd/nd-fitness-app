i do# ND Fitness App — Project Brief

Generated via the "interview method" (Claude asks, you answer, then it's turned into a spec) — 2026-08-15.

## One-liner
A mobile training-log app built for how Emmet's brain actually works on a gym day — not a generic fitness tracker with ND accommodations bolted on.

## Who it's for
Emmet first (own PT training). Built so the data model isn't hard-coded to a single user, so it can extend to CoachedByEmmet clients later without a rebuild — but no accounts/multi-user auth in v1.

## The problem (from the interview)
Mainstream apps (Strong, Hevy, MyFitnessPal) didn't stick, for a specific mix of reasons:
- Too much manual data entry per exercise
- Too many choices/screens → decision paralysis
- Rigid fixed programs that don't flex with capacity that day
- RPE/RIR assumed as known — no built-in education for people who don't already know it
- Paywalls on the info that would actually help

Underlying friction (not mutually exclusive — it's a mix): logging consistency, sensory/environment overwhelm at the gym, and decision fatigue about what to actually do that session.

Good signal: skipping a session doesn't create an avoidance spiral for Emmet — so the design does **not** need guilt-recovery mechanics, but should still avoid streaks/red-number shame UI on principle (bad for ND users generally, and cheap to just not build).

## Core loop (MVP)
1. **Capacity check-in** — one tap at session start: Low / Medium / High energy (optionally: noisy/busy gym today?). Scales sets/reps target on low-capacity days rather than cutting whole movement patterns, since the full-body template runs every session (see below).
2. **One exercise at a time** — no full-program list on screen. The app walks through the fixed slot order (see Session Structure) one exercise at a time; you tap which variation from that slot's pool you're doing today rather than choosing from an open exercise list.
3. **Low-friction logging** — weight and reps via +/- steppers, not typing. RIR/RPE as a simple 1–5 tap scale with an inline one-line explainer (fixes the "not everyone knows RPE/RIR" gap directly). Progress shown is always **the same variation vs. its own last time** — never compared across different variations of the same pattern, since load doesn't translate between e.g. belt squat and barbell squat.
4. **Plain history view** — no streaks, no guilt indicators, no gamification. Just what happened.

## Session structure
Full-body, every session, 2-3x/week — same slot template each time, ~18 exercises. Each slot has a default variation plus a pool of swap-ins for equipment/joint-feel adjustability. Isolation "progress" tracks per-variation, same rule as above.

| Slot | Default | Swap-in pool | Isolation partner |
|---|---|---|---|
| Squat | Belt squat | Barbell squat, Landmine hack squat | Leg extension |
| Hinge | RDL | Good morning | Cable single-leg hamstring curl (swaps: cable kickback, adductor, abductor) |
| Vertical pull | Lat pulldown machine | Band-assisted pull-up | — |
| Horizontal pull | Seated cable row | Landmine meadow row (single-arm) | — |
| Vertical push (shoulder) | Overhead press | — | Single-arm cuffed cable lateral raise |
| Horizontal push (chest) | Bench press (barbell) | Dumbbell bench, Cable press | Flye (some sort) |
| Core | — | Rotation movement, cable crunch, cable oblique | (all three run each session, not a rotation) |
| Arms | — | — | Barbell curl + hammer curl (biceps), pushdown + overhead extension (triceps) — all four run each session |
| Calves | Calf raise | — | — |

## Explicitly out of scope for v1
- Multi-user accounts/login
- Social features, streaks, badges, notifications/reminders
- Exercise library browsing/searching (defeats the "reduce choices" goal)
- Nutrition tracking (already covered by the existing CoachedByEmmet macro calculator)

## Data model sketch
- `slots` (name, order) — the fixed 9-slot template: Squat, Hinge, Vertical Pull, Horizontal Pull, Vertical Push, Horizontal Push, Core, Arms, Calves
- `variations` (slot_id, name, is_default) — the pool per slot (e.g. Belt squat/Barbell squat/Landmine hack squat under Squat)
- `sessions` (date, capacity_rating, notes)
- `exercises_in_session` (session_id, slot_id, variation_id, order)
- `sets` (exercise_in_session_id, weight, reps, rir)
- Add a `user_id` field from day one on every table, even with a single hardcoded value now — this is what avoids a rebuild if it later extends to clients.
- Progress/last-time lookups always query `sets` filtered by the same `variation_id`, never by `slot_id` alone — this is what keeps progressive overload honest across swapped variations.

## Platform
Mobile app (Emmet's choice over a web app). Realistic build path for a non-native-coder working with Claude Code: **Expo / React Native** — cross-platform iOS+Android from one codebase, avoids native Swift/Kotlin, faster iteration loop, no App Store review needed to test on your own phone during development (Expo Go).

## Distribution (2026-08-15, revised)
Original plan was dev-only via Expo Go — but that requires Metro running on Emmet's laptop and the phone on the same network, which doesn't work at the gym away from home. Two real options were weighed:
1. Apple Developer account ($99/year) + EAS Build for a standalone native install — works fully offline anywhere, but a recurring cost.
2. **Chosen: web export + "Add to Home Screen"** — matches how the CoachedByEmmet CRM is already used, no Apple Developer fee, hosted for free.

Technical notes from getting this working:
- `expo-sqlite`'s web backend (wa-sqlite, WASM-based) needed a `metro.config.js` adding `wasm` to `resolver.assetExts` — Metro doesn't bundle `.wasm` imports by default, which caused a silent bundling failure (blank screen, no console error).
- The web SQLite backend uses OPFS (`navigator.storage.getDirectory()`), which browsers only expose on **secure contexts** — HTTPS, or `localhost` specifically. It will not work over a plain LAN IP during local testing; this is expected, not a bug, and resolves once deployed to real HTTPS hosting.
- Not yet done: pick a free HTTPS host (Netlify/Vercel/Cloudflare Pages/GitHub Pages) and deploy, then verify OPFS actually works end-to-end on a real HTTPS URL before relying on this for gym use.
- Skipping full offline-first PWA (service worker asset caching via Workbox) for now — Expo's own docs warn it's "known to cause unexpected behavior," and normal mobile data/gym wifi should be enough for v1. Revisit only if patchy signal at the gym turns out to be a real recurring problem.

## Roadmap beyond v1 (2026-08-15)
Considered folding in MyFitnessPal-style nutrition tracking and Stance/Gpath-style velocity-based training (VBT, bar-mounted Bluetooth sensor tracking speed/power/1RM). Deliberately phased out of v1 — not a style preference, a hard constraint:

- **Phase 2 — Nutrition:** don't rebuild a food database. Just link/reference the existing CoachedByEmmet macro calculator from within the app. Trivial addition once v1 exists.
- **Phase 3 — VBT integration:** blocked until Emmet owns a Stance/Gpath/generic BLE bar-speed sensor. Even then, likely needs reverse-engineered Bluetooth integration since these products don't appear to expose a public third-party API — worth checking directly with the vendor before buying hardware on the assumption it'll be scriptable.

## Status
Native app (Expo Go) built and working — full session flow tested end-to-end on Emmet's phone. Pivoting distribution to web/PWA for gym use without a laptop nearby; web export builds and the SQLite-on-web blocker is fixed, still need to deploy to real HTTPS hosting and verify there.
