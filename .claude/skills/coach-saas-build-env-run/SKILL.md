---
name: coach-saas-build-env-run
description: Build, environment, and run runbook for the supportcoach-ai repo (SupportCoach AI Manager Dashboard — Next.js 16 + Supabase + OpenAI + Paddle, deployed on Vercel at https://www.supportcoach.io). Load this to recreate the dev environment from scratch, run npm install (BOTH package-lock.json and pnpm-lock.yaml exist — do not clean up), learn where env vars are SET and how to bootstrap app/.env.local (names only, never values; for what each variable DOES and what breaks without it use coach-saas-config-and-flags instead), understand npm run dev / build / start / lint anatomy, start the app locally and trigger the analysis worker, or understand the Vercel deploy model (push to main = production, no staging) and the one live Supabase project (schema not in git). Symptoms that route here — fresh-clone setup, "which package manager", build or dev server won't start, port 3000 questions, lint exits non-zero, "where do env vars live". For landing a change use coach-saas-change-control; live-failure triage → coach-saas-debugging-playbook; design invariants → coach-saas-architecture-contract; verification detail → coach-saas-validation-and-qa; the extension repo's build/release → coach-ext-build-release-env in the sibling repo.
---

# Build, environment, and run — supportcoach-ai

Everything below verified directly against the repo on 2026-07-17 (HEAD `93de005`, 2026-07-03, 104 commits, single branch `main`). Owner: Johny Patrick, solo dev. Repo root contains only `README.md` + `app/` — **every command in this file runs from `app/`**, i.e. `C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app`. All commands are Windows PowerShell 5.1 compatible (no `&&` — parser error there; run lines separately).

## 0. The one-sentence model

There is no local database, no seed data, no docker, no CI, and no staging: "running locally" means the Next.js dev server on your machine talking to the **same live Supabase project and live OpenAI account as production**, and `git push origin main` IS the production deploy — so treat local runs as production-adjacent and pushes as releases.

## 1. Repo geography and stray files

| Path (repo-relative) | What it is |
|---|---|
| `app/` | The entire Next.js app. `package.json`, `src/`, `docs/`, `middleware.ts`, `public/` all live here. |
| `app/src/app/` | App Router pages + API routes. All real API routes are under `app/src/app/api/`. |
| `app/docs/` | Docs of record (rules.md, context.md, codex-orchestration.md, supportcoach-ai-context.md) — read per `coach-saas-change-control` before changing anything. |
| `app/.env.local` | Live secrets. Exists locally, gitignored (`.env*`). **Never read its values — variable names only** (owner standing rule). |
| `app/.next/` | Build/dev output. Gitignored. Safe to delete to force a clean rebuild. |
| `app/gitlog.txt` | TRACKED stale snapshot of an old git log. Historical artifact — ignore, do not update, do not delete unasked. |
| `app/structure.txt`, `app/backup/` | Gitignored local artifacts (`backup/3-10-2026/src` is a manual pre-git-discipline snapshot of `src/`). Ignore. |
| `app/api/`, `app/reclassify-topics/` | EMPTY untracked local directories at app root (verified 2026-07-17). Not routes, not tracked — the real routes are `app/src/app/api/...`. Do not mistake them for code; do not delete unasked. |
| `app/tsconfig.tsbuildinfo` | Gitignored TypeScript build artifact. |

There is **no** `vercel.json`, no `.github/`, no `Dockerfile`, no `supabase/` directory, no migration files, no `.env.example`, no `.nvmrc` (all verified by directory listing 2026-07-17).

## 2. Toolchain and install

- **Node**: no `engines` field in `app/package.json` and no `.nvmrc`. The binding constraint is Next.js 16.1.6, whose own `engines` requires **Node >= 20.9.0** (verified in `app/node_modules/next/package.json`). The owner's machine runs Node v24.14.0 / npm 11.9.0 (verified 2026-07-17) — anything >= 20.9 should work.
- **TypeScript 5, Tailwind CSS 4 (via `@tailwindcss/postcss`), ESLint 9, React 19.2.3, Next 16.1.6** — all installed as part of `npm install`; no global tools needed.
- Path alias: `@/*` → `app/src/*` (`app/tsconfig.json` line 22).

### The two-lockfile situation (do NOT clean up)

BOTH lockfiles exist in `app/` and BOTH are tracked in git (verified 2026-07-17):

| Lockfile | Added | Last touched | Consistent with package.json? |
|---|---|---|---|
| `package-lock.json` | `7dc14a7` (2026-03-07, first commit) | `e8928ed` (2026-03-18) | Yes — contains `next` 16.1.6 |
| `pnpm-lock.yaml` (lockfileVersion 9.0) | `838f571` (2026-03-18) | `838f571` (2026-03-18) | Yes — contains `next` 16.1.6 |

`package.json` itself was last changed 2026-03-18 (`838f571`), so both lockfiles are in sync with it. The local `node_modules` carries markers of BOTH managers: `node_modules/.package-lock.json` (npm) AND `node_modules/.pnpm/` (pnpm) both exist (verified 2026-07-17). **The canonical package manager is UNCERTAIN** — there is no `packageManager` field and no doc names one. Which manager Vercel uses at deploy time with both lockfiles present is UNVERIFIED. Standing guidance (mirrors coach-saas-change-control Section 3): do not delete, regenerate, or "clean up" either lockfile unasked; ask the owner before any dependency change.

### Fresh-clone install (recommended: npm — matches `app/README.md`'s `npm run dev` instructions and the lockfile that has existed since the first commit)

```powershell
cd C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app
node -v          # expect >= 20.9
npm install
```

Do NOT run `npm ci` casually: it deletes `node_modules` wholesale, wiping the pnpm install state that currently coexists there. Plain `npm install` is the low-blast-radius choice.

## 3. Environment variables — where they are SET and how they load (NAMES ONLY)

Where they are set: locally in `app/.env.local` (exists, gitignored); in production in the **Vercel dashboard** (`app/docs/codex-orchestration.md` lines 363 and 384: "Environment variables configured in Vercel dashboard" / "set in .env.local and Vercel"). There is no `.env.example` — the name list below IS the template for a fresh clone. Get values from the owner or the Vercel dashboard, never from this repo. **Owner standing rule: never read secret VALUES from `.env.local`; refer to names only.** Rule 19 (`app/docs/rules.md`): never expose `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET` client-side.

The 9 names, enumerated from `process.env.*` references in code (grep over `app/` excluding `node_modules`, 2026-07-17):

- **Code-read (7):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (SECRET), `OPENAI_API_KEY` (SECRET), `PADDLE_WEBHOOK_SECRET` (SECRET), `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `NEXT_PUBLIC_SITE_URL` (falls back to `http://localhost:3000` — the port-3000 trap, Section 5).
- **Docs-only (2), zero `process.env` references in code** (verified grep 2026-07-17 — docs `context.md:45` / `codex-orchestration.md:384` list them as configured): `PADDLE_API_KEY` (still treat as secret, rule 19) and `NEXT_PUBLIC_PADDLE_ENVIRONMENT` (likely orphaned by the recorded Paddle.Initialize past mistake). Do not remove either from Vercel unasked.

**Full per-variable inventory — consumers, what breaks without each, guards: `coach-saas-config-and-flags` Section 1 (the single owner of that table).** Misconfig-symptom mapping for live debugging: `coach-saas-debugging-playbook` Section 9.

Notes:
- Env clients are created at module scope with `!` non-null assertions (e.g. `src/lib/supabase.ts:4-5`) — a missing var surfaces as a runtime crash, not a build-time error message. Whether `npm run build` succeeds with no `.env.local` at all is UNVERIFIED.
- Both `next dev` and `next build` print `- Environments: .env.local` when they load it (verified 2026-07-17) — a quick check that your env file was picked up.

## 4. Command anatomy (`app/package.json` scripts — the complete list)

There are exactly four scripts: `dev`, `build`, `start`, `lint`. No test script, no test files, no CI (verified 2026-07-17).

| Command | Underlying | Verified behavior (2026-07-17, HEAD `93de005`) |
|---|---|---|
| `npm run dev` | `next dev` | Banner: `Next.js 16.1.6 (Turbopack)`; serves `http://localhost:3000`; loads `.env.local`; ready in ~3s. No `-p` flag configured. |
| `npm run build` | `next build` | Turbopack build; **runs TypeScript type-checking** ("Running TypeScript ..."); does **NOT** run ESLint; outputs to `app/.next/`; prerenders 45 pages. **Passes cleanly at HEAD.** Static (`○`): `/`, `/extension`, `/login`, `/signup`, `/onboarding`, `/select-plan`, `/upload`, `/dashboard/billing`, legal pages, sitemap/robots. Dynamic (`ƒ`): all `/api/*`, `/dashboard`, `/analysis/[id]`, `/jobs`, `/settings`. Middleware compiles as "Proxy (Middleware)". |
| `npm run start` | `next start` | Serves the production build from `.next/` on port 3000. Requires `npm run build` first. |
| `npm run lint` | bare `eslint` (NOT `next lint` — Next 16 removed it) | Flat config `app/eslint.config.mjs` (eslint-config-next core-web-vitals + typescript; ignores `.next/`, `out/`, `build/`, `next-env.d.ts`). **Currently FAILS at HEAD: 635 problems (139 errors, 496 warnings)**, dominated by `@typescript-eslint/no-explicit-any`. |

Two consequences of the lint reality (both verified):
1. Lint errors do NOT block deploys — `next build` skips ESLint and Vercel ships HEAD as-is (production is live at HEAD despite 139 errors).
2. The practical lint gate is therefore differential: your change must add no NEW errors in the files you touched. Do NOT mass-fix the 139 pre-existing errors — that is an unrequested refactor (rules 2-3) and a huge diff. `coach-saas-change-control` Section 3 lists `npm run lint` as a gate; interpret it this way — expect a nonzero exit from pre-existing debt.

The real merge gate is `npm run build` succeeding (it re-runs on Vercel at deploy time), plus the manual "Test:" checklist — see `coach-saas-change-control` Section 3 and `coach-saas-validation-and-qa`.

```powershell
cd C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app
npm run lint
npm run build
```

## 5. Running the thing locally

```powershell
cd C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app
npm run dev
```

Then open `http://localhost:3000`.

- **You are on live data.** The docs describe exactly one Supabase project shared by this product and the Chrome extension (`app/docs/context.md` line 297), and `.env.local` + Vercel are documented as holding the same variable set (`codex-orchestration.md:384`). No separate dev project is mentioned anywhere. Whether `.env.local` points at a second project cannot be confirmed without reading its values (forbidden) — assume it does not. Uploading a transcript locally writes real rows and spends real OpenAI credit; do not run destructive experiments. The owner's test org is `8e71dc46-e674-4131-8709-506223a35d7e` (context.md line 259 documents its reset SQL — owner runs that, not you).
- **Auth is required** for `/dashboard`, `/upload`, `/jobs`, `/analysis` (`middleware.ts` matcher, lines 159-169; subscription/trial lock at lines 61-148, fail-open by design — do not "fix"). Public without login: `/`, `/login`, `/signup`, `/extension`, `/terms`, `/privacy`, `/refund`, `/support`. You need real Supabase credentials from the owner to get past `/login`.
- **The analysis worker is not a process — it is a route you trigger.** Pipeline: `/upload` page → `POST /api/create-analysis-job` → `GET /api/process-jobs` (the route exports only `GET`, `route.ts:749`; `runtime = "nodejs"`, line 10). The upload page auto-triggers it after upload (`upload/page.tsx:113`), and `src/components/WorkerTriggerButton.tsx` (used on `jobs/[id]` and upload pages) triggers it manually. There is NO cron: the master doc's "Option B: Vercel Cron" was never implemented (no `vercel.json`). If jobs sit queued, hit `GET /api/process-jobs` in a logged-in browser or click the trigger button.
- **Port 3000 is load-bearing.** `dashboard/page.tsx:239` does a server-side self-fetch to `${NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/team-summary`. If port 3000 is occupied and Next silently picks 3001, the dashboard team summary breaks locally. Free the port instead of changing config:

```powershell
netstat -ano | Select-String ":3000"
taskkill /F /T /PID <pid-from-netstat>
```

- Smoke check after any change (recommended practice, mirrors change-control): load `/`, `/login`, `/dashboard`, plus every page you touched; watch for white screens and console errors.

## 6. Deploy model — Vercel

- **`git push origin main` = instant production deploy.** Vercel auto-deploys on push; there is one branch, no staging, no preview-gating workflow in the docs (`context.md`: "committed and pushed, auto-deploys via Vercel"; `codex-orchestration.md:361`). Commit freely; push ONLY when the owner asks (owner standing rule; full protocol in `coach-saas-change-control` Sections 2 and 4a).
- Production URL: `https://www.supportcoach.io` — the **www host is load-bearing** (non-www 308-redirects; Paddle webhooks do not follow redirects — incident detail in `coach-saas-failure-archaeology` / change-control Section 4d).
- Vercel-side configuration (env vars, domains) lives in the **Vercel dashboard**, not in the repo (no `vercel.json`). Any dashboard change is invisible to git — record it in `app/docs/context.md`.
- Vercel re-runs `next build` (with TypeScript check) at deploy; a change that builds locally on the same Node major should build there. Which package manager / Node version Vercel's build uses is UNVERIFIED (no `packageManager` field, no pinning file).

## 7. Supabase relationship

- One hosted Supabase project serves BOTH this Manager Dashboard and the Chrome extension product (`context.md:297`). The extension's own backend (sibling repo `C:\Users\CHIST\Desktop\GitRepo\support-coach-extension`, Railway) talks to the same project — coordinate cross-product schema concerns there via its `coach-ext-*` skills.
- **The schema is NOT in git.** No migration files exist. Schema changes are labeled SQL blocks the owner runs manually in the Supabase SQL Editor, and the docs (context.md / codex-orchestration.md) are the only schema record. Full rules in `coach-saas-change-control` Section 4b.
- RLS is enabled on all tables, but `SUPABASE_SERVICE_ROLE_KEY` bypasses it — which is why most server code uses the admin client AND must still filter `organization_id` at application level (rules 14-16).
- There is no `supabase` CLI setup, no local emulator, no seed script. You cannot spin up a private copy of the data; you work against the live project or not at all (as of 2026-07-17).

## 8. Known traps (Windows and otherwise)

| Trap | Detail |
|---|---|
| `&&` in PowerShell 5.1 | Parser error. Docs write `git add -A && git commit ...` — run as two lines. Applies to every chained command in the docs. |
| Case-insensitive doc filenames | Docs reference `docs/RULES.md` / `docs/CONTEXT.md`; on-disk names are lowercase `rules.md` / `context.md`. Same file on Windows; a literal path on a case-sensitive system (or a strict tool) misses. Only docs are affected — no code imports differ by case (Vercel builds prove it). |
| VS Code phantom TS error | "Cannot find module `@/components/AppNav`" is a documented stale-cache false positive (`context.md` KNOWN ISSUES) — it does not affect `npm run build` or Vercel. Restart the TS server before believing it. |
| Two lockfiles | Section 2. Do not delete either; do not switch managers; plain `npm install`, not `npm ci`. |
| Port 3000 self-fetch | Section 5. Dev server must be on 3000 (or `NEXT_PUBLIC_SITE_URL` set) or the dashboard team summary breaks. |
| Lint exits non-zero at HEAD | Section 4. 139 pre-existing errors; not your job to fix; check only your files. |
| Stray dirs/files at `app/` root | `api/`, `reclassify-topics/` (empty, untracked), `gitlog.txt` (tracked, stale), `backup/`, `structure.txt` (ignored). None are live code. |
| `.env.local` | Contains live production keys. Never read values, never commit, never print. Names-only inventory is Section 3. |
| Local run touches production | Section 5. There is no sandbox. Every upload/analysis/settings change you make locally lands in the live database. |

## 9. Fresh-machine bring-up checklist

1. Install Node >= 20.9 (owner runs v24.14.0). `git clone` the repo.
2. `cd C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app` then `npm install` (Section 2 — not `npm ci`, not pnpm unless the owner says so).
3. Create `app\.env.local` with the 7 code-read variable names from Section 3 (+ the 2 docs-listed Paddle vars if doing billing work). Obtain values from the owner or the Vercel dashboard — never from the repo.
4. `npm run build` — must pass (it passes at HEAD as of 2026-07-17); this validates toolchain + env wiring.
5. `npm run dev` → open `http://localhost:3000`, confirm the landing page renders. Log in with owner-provided credentials to reach `/dashboard`.
6. Read `app/docs/rules.md` → `context.md` → `codex-orchestration.md` before changing anything (mandated; see `coach-saas-change-control`).

## When NOT to use this skill

- Classifying, gating, or landing a change (savepoints, doc updates, push protocol) → `coach-saas-change-control`.
- A live failure or error symptom to diagnose → `coach-saas-debugging-playbook`; settled incident history → `coach-saas-failure-archaeology`.
- System design, data flow, invariants → `coach-saas-architecture-contract`.
- Values of flags, thresholds, plan constants → `coach-saas-config-and-flags`.
- Writing/executing test checklists → `coach-saas-validation-and-qa`.
- Transcript-parsing or prompt semantics → `transcript-analysis-domain-reference`; plan-gating build work → `coach-saas-plan-gating-campaign`; growth/SEO → `supportcoach-growth-frontier`.
- Anything in the Chrome extension repo (its build uses pnpm + turbo, a different world) → `coach-ext-build-release-env` in `C:\Users\CHIST\Desktop\GitRepo\support-coach-extension`.

## Provenance and maintenance

Authored 2026-07-17. Sources: `app/package.json`, `app/eslint.config.mjs`, `app/tsconfig.json`, `app/next.config.ts`, `app/.gitignore`, `app/middleware.ts`, `app/src/lib/supabase.ts`, `app/src/app/api/process-jobs/route.ts`, `app/src/app/upload/page.tsx`, `app/src/components/WorkerTriggerButton.tsx`, `app/docs/{rules,context,codex-orchestration,supportcoach-ai-context}.md`, git log (`7dc14a7`, `e8928ed`, `838f571`, `93de005`), a full `process.env` grep, and live runs of `npm run lint`, `npm run build`, and `npm run dev` on 2026-07-17 (dev server killed after banner capture; nothing pushed, no live data mutated).

Volatile facts — re-verify before relying on them:

| Fact (as of 2026-07-17) | Re-verify with (from `app\`) |
|---|---|
| HEAD `93de005`, 104 commits, `main` only | `git log --oneline -3`; `git rev-list --count HEAD` |
| Scripts are exactly dev/build/start/lint; `lint` = bare `eslint` | `Get-Content package.json` |
| Build passes at HEAD; Turbopack; TS checked; no ESLint in build | `npm run build` |
| Lint fails: 635 problems (139 errors) | `npm run lint` |
| Both lockfiles present; node_modules has `.package-lock.json` AND `.pnpm` | `Get-ChildItem -Filter *lock*`; `Get-ChildItem node_modules -Force -Filter .p*` |
| 7 code-read env vars, 2 docs-only (PADDLE_API_KEY, NEXT_PUBLIC_PADDLE_ENVIRONMENT) | `Get-ChildItem src,middleware.ts -Recurse -Include *.ts,*.tsx \| Select-String -Pattern "process\.env\.[A-Z_]+"` |
| `process-jobs` is GET-only at line 749; upload auto-trigger at `upload/page.tsx:113` | `Select-String -Path src\app\api\process-jobs\route.ts -Pattern "export async function"` |
| localhost:3000 fallback in logout route + dashboard self-fetch | `Select-String -Path src\app\api\logout\route.ts,src\app\dashboard\page.tsx -Pattern "localhost:3000"` |
| No vercel.json / .github / supabase dir / .env.example / .nvmrc | `Get-ChildItem . -Force`; `Get-ChildItem .. -Force` |
| Node >= 20.9.0 required by next 16.1.6; owner machine v24.14.0 | `Get-Content node_modules\next\package.json \| Select-String engines -Context 0,2`; `node -v` |
| Empty stray dirs `api/`, `reclassify-topics/` at app root | `Get-ChildItem api,reclassify-topics` |
