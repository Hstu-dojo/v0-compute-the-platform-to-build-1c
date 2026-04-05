# PilotAI — AI Study Assistant

## Overview
PilotAI is an AI-powered study application built with Next.js 16 (App Router). Users can upload documents (PDF or text) and generate study materials: notes, flashcards, multiple choice quizzes, fill-in-the-blank exercises, written tests, and tutor lessons — all via the live backend at `https://tutor-ai.up.railway.app`.

The UI inherits the dark monochrome aesthetic of the original COMPUTE landing page.

## Tech Stack
- **Framework**: Next.js 16.0.10, React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Auth**: Firebase (pilotai-project) — email/password + Google SSO
- **Backend**: `https://tutor-ai.up.railway.app` (FastAPI, bearer token auth)
- **Package manager**: npm with --legacy-peer-deps

## Environment Variables (NEXT_PUBLIC_ — shared)
| Variable | Purpose |
|---|---|
| NEXT_PUBLIC_FIREBASE_API_KEY | Firebase project API key |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | pilotai-project.firebaseapp.com |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | pilotai-project |
| NEXT_PUBLIC_FIREBASE_APP_ID | Firebase app ID |
| NEXT_PUBLIC_API_URL | https://tutor-ai.up.railway.app |

## Auth Flow
1. User signs in via Firebase (email/password or Google popup)
2. After Google sign-in, the full `UserCredential` and raw ID token are `console.log`'d (always, not just dev)
3. POST `/api/v1/auth/register` with `{ display_name }` (ignores 409 if already registered)
4. POST `/api/v1/auth/session` with `Authorization: Bearer <token>` → returns `session_id`
5. `session_id` stored in `localStorage` as `pilotai_session_id`
6. All API calls use `Authorization: Bearer <token>` + `x-session-id` headers

## Key Files
- `lib/firebase.ts` — Firebase app init, auth helpers
- `lib/auth-context.tsx` — React context with `useAuth()`, console logging of creds
- `lib/api.ts` — Typed fetch wrappers for all backend endpoints
- `components/auth/protected-route.tsx` — Redirects unauthenticated users to /login
- `components/dev/token-panel.tsx` — DEV-ONLY floating panel: shows ID token, copy + send-to-server buttons
- `app/login/page.tsx` — Login page (email + Google SSO)
- `app/signup/page.tsx` — Signup page (email + Google SSO)
- `app/dashboard/` — Authenticated area (layout + page)

## Routes
| Path | Description |
|---|---|
| `/` | Landing page (PilotAI branded) |
| `/login` | Login (redirects to /dashboard if already signed in) |
| `/signup` | Signup (redirects to /dashboard if already signed in) |
| `/dashboard` | Protected — redirects to /login if not signed in |

## Backend API
Base: `https://tutor-ai.up.railway.app`  
Auth: `Authorization: Bearer <Firebase ID token>` + `x-session-id` header

Key endpoints (all under `/api/v1/`):
- `POST /auth/register` — register new user `{ display_name }`
- `POST /auth/session` — create session `{ device_type, device_name }`
- `DELETE /auth/session` — terminate session
- `POST /upload/pdf` — multipart PDF upload
- `POST /upload/text` — JSON text upload `{ title, text }`
- `GET /documents` — list documents
- `POST /study-sets/generate` — `{ document_id, types[] }` → returns batch_id
- `GET /study-sets/batch/{batch_id}` — poll job status
- `GET /study-sets/output/{output_id}/{type}` — fetch generated output
- `GET /credits/balance` — credit balance

Output types: `notes`, `content`, `tutor_lesson`, `flashcards`, `multiple_choice`, `fill_in_blanks`, `written_test`, `podcast`

## Dev Panel
When `NODE_ENV=development`, a floating panel appears in the bottom-right corner of the dashboard showing:
- Current Firebase ID token in a scrollable textarea (click to select all)
- Copy Token button
- Refresh Token button
- Send to Server button (POSTs to /api/v1/auth/session and displays JSON response)
