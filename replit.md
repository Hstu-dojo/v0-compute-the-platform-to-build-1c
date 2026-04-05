# PilotAI — AI Study Assistant

## Overview
PilotAI is an AI-powered study application built with Next.js 16 (App Router). Users upload documents (PDF or text) and generate study materials — notes, flashcards, multiple choice, fill-in-the-blank, written tests, tutor lessons — via the backend at `https://tutor-ai.up.railway.app`. Admins manage users, plans, credit packs, workers, and model configs through a built-in admin panel.

Dark monochrome aesthetic inherited from the COMPUTE landing page.

## Tech Stack
- **Framework**: Next.js 16.0.10, React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Auth**: Firebase (pilotai-project) — email/password + Google SSO
- **Backend**: `https://tutor-ai.up.railway.app`
- **Package manager**: npm with --legacy-peer-deps

## Environment Variables
| Variable | Purpose |
|---|---|
| NEXT_PUBLIC_FIREBASE_API_KEY | Firebase project API key |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | pilotai-project.firebaseapp.com |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | pilotai-project |
| NEXT_PUBLIC_FIREBASE_APP_ID | Firebase app ID |
| NEXT_PUBLIC_API_URL | https://tutor-ai.up.railway.app |

## Auth Flow
1. User signs in via Firebase (email/password or Google popup)
2. Firebase ID token sent to `POST /api/v1/auth/session` (register-or-login in one step)
3. Response returns `auth.access_token` + `auth.refresh_token` + `session.session_id`
4. Tokens stored in localStorage (`pilotai_access_token`, `pilotai_refresh_token`, `pilotai_token_expires_at`)
5. All protected API calls use `Authorization: Bearer <access_token>`
6. Token auto-refreshes via `POST /api/v1/auth/refresh` when within 30s of expiry or on 401

**Race condition fix**: `onAuthStateChanged` keeps `loading=true` on fresh sign-in until `handleSessionResponse` stores the access token and calls `setLoading(false)`. On page refresh, if a token is already in localStorage, user is unblocked immediately.

## Key Files
- `lib/firebase.ts` — Firebase app init
- `lib/auth-context.tsx` — React context: signIn, signUp, signInWithGoogle, signOut, sessionData
- `lib/api.ts` — All API functions: auth, credits, documents, study-sets, payments, admin
- `components/auth/protected-route.tsx` — Redirects unauthenticated users
- `components/admin/admin-route.tsx` — Admin-only route guard (checks sessionData.user.role)
- `components/dev/token-panel.tsx` — DEV-ONLY: shows app access token + Firebase ID token with copy/send buttons
- `components/dashboard/dash-nav.tsx` — Dashboard sidebar with credits, nav links, admin link for admins

## Routes
| Path | Description |
|---|---|
| `/` | Landing page |
| `/login` | Login (email + Google SSO) |
| `/signup` | Signup |
| `/dashboard` | Documents list |
| `/dashboard/upload` | PDF/text upload |
| `/dashboard/documents/[id]` | Document detail + study set generation |
| `/dashboard/billing` | Subscription plans, credit packs, invoice history |
| `/dashboard/credits` | Credit balance + ledger history |
| `/admin` | Admin overview (admin role only) |
| `/admin/users` | User list with search/filter |
| `/admin/users/[id]` | User detail: billing, credit adjust, plan change, cancel |
| `/admin/plans` | Create/list subscription plans |
| `/admin/credit-packs` | Create/list credit top-up packs |
| `/admin/workers` | Worker health status |
| `/admin/model-configs` | AI model config + routing |
| `/admin/dead-letter` | Dead-letter job queue |

## Backend API Summary
Base: `https://tutor-ai.up.railway.app`

### Auth
- `POST /api/v1/auth/session` — Bootstrap (Firebase token → app access token)
- `POST /api/v1/auth/refresh` — Refresh access token
- `DELETE /api/v1/auth/session` — Logout

### Credits
- `GET /api/v1/credits/balance`
- `GET /api/v1/credits/history`

### Documents
- `GET /api/v1/documents`, `GET /api/v1/documents/{id}`, `DELETE /api/v1/documents/{id}`
- `POST /api/v1/upload/pdf`, `POST /api/v1/upload/text`

### Study Sets
- `POST /api/v1/study-sets/generate` — `{ document_id, types[] }`
- `GET /api/v1/study-sets/batch/{batch_id}`
- `GET /api/v1/study-sets/output/{output_id}/{type}`
- Output types: `notes`, `content`, `tutor_lesson`, `flashcards`, `multiple_choice`, `fill_in_blanks`, `written_test`, `podcast`

### Payments / Billing
- `GET /api/v1/payments/plans` — public plan list
- `GET /api/v1/payments/packs` — public credit packs
- `POST /api/v1/payments/create-checkout` — subscription checkout
- `POST /api/v1/payments/topup` — credit pack checkout
- `GET /api/v1/payments/subscription`
- `POST /api/v1/payments/cancel-subscription`

### Admin
- Users: list, get, patch (is_active)
- Credits: adjust, user credit history
- Plans: list, create
- Credit packs: list, create
- User billing: get, portal session, change plan, cancel, retry invoice, refund
- System: workers, dead-letter jobs
- Model configs: list, create, patch

## Dev Panel
When `NODE_ENV=development`, a floating panel appears in the bottom-right of the dashboard:
- Tab switcher: **App Access Token** (for API calls) vs **Firebase ID Token** (for /auth/session)
- Copy / Refresh Firebase / Send to Server buttons
