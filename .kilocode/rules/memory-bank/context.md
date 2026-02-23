# Active Context: AI Interview Platform

## Current State

**Application Status**: ✅ Fully implemented — AI-powered interview platform

The application is a complete multi-module interview platform built on Next.js 16 with MySQL, NextAuth v5, and OpenAI.

## Recently Completed

- [x] Base Next.js 16 setup with App Router
- [x] TypeScript configuration with strict mode
- [x] Tailwind CSS 4 integration
- [x] ESLint configuration
- [x] Memory bank documentation
- [x] Recipe system for common features
- [x] **Full AI Interview Platform implementation**:
  - [x] MySQL database schema (Drizzle ORM)
  - [x] First-run setup wizard (`/setup`) — 3-step: admin credentials, DB config, AI/app settings
  - [x] Admin authentication (NextAuth v5 with credentials provider)
  - [x] Admin config panel (`/admin`) — interview list with status indicators
  - [x] Manage Interview panel (`/admin/interviews/[id]`) — full CRUD for prompts, participants, settings
  - [x] Interview chat page (`/interview/[token]`) — participant-facing AI chat interface
  - [x] Results module (`/admin/interviews/[id]/results`) — session list, AI aggregation, CSV download
  - [x] All API routes (interviews, participants, chat, results, download, sessions)
  - [x] Route protection middleware

## Application Architecture

### Modules

| Module | Route | Description |
|--------|-------|-------------|
| Setup Wizard | `/setup` | First-run installer (one-time) |
| Admin Login | `/admin/login` | Password-protected admin access |
| Admin Panel | `/admin` | Interview list and management |
| Manage Interview | `/admin/interviews/[id]` | Full interview configuration |
| Results | `/admin/interviews/[id]/results` | AI analysis + session transcripts + CSV download |
| Interview Chat | `/interview/[token]` | Participant-facing chat interface |

### API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/setup` | POST | First-run setup |
| `/api/interviews` | GET, POST | List/create interviews |
| `/api/interviews/[id]` | GET, PATCH, DELETE | Interview CRUD |
| `/api/interviews/[id]/participants` | GET, POST | Participant management |
| `/api/interviews/[id]/participants/[pid]` | PATCH, DELETE | Edit/remove participant |
| `/api/interviews/[id]/results` | GET, POST | Get results / generate AI aggregation |
| `/api/interviews/[id]/download` | GET | Download CSV of all conversations |
| `/api/interviews/[id]/sessions/[sid]` | GET | Get session transcript |
| `/api/interview/[token]/chat` | GET, POST | Interview chat (participant-facing) |

### Database Tables

- `system_config` — key/value config store
- `admin_users` — admin credentials (bcrypt hashed)
- `interviews` — interview definitions (prompt, token, settings)
- `interview_participants` — email list per interview
- `interview_sessions` — individual participant sessions
- `chat_messages` — all chat messages per session
- `aggregation_results` — cached AI analysis results

## Key Features

- **Setup wizard**: Writes `.env.local` with DB credentials, admin account, OpenAI key, app URL
- **Unique interview links**: 48-char nanoid tokens (`/interview/[token]`)
- **Token limiting**: Per-interview configurable limit (default 5000), enforced per session
- **Multiple simultaneous users**: Each participant gets their own session token
- **AI model selection**: GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo
- **On-demand aggregation**: Admin triggers AI summary of all sessions
- **CSV export**: Download all conversation data
- **Interview activation**: Start/stop controls the link's accessibility

## Current Structure

```
src/
├── app/
│   ├── admin/
│   │   ├── page.tsx                    # Admin panel (interview list)
│   │   ├── login/page.tsx              # Login page
│   │   └── interviews/[id]/
│   │       ├── page.tsx                # Manage interview
│   │       └── results/page.tsx        # Results module
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── setup/route.ts
│   │   ├── interview/[token]/chat/route.ts
│   │   └── interviews/
│   │       ├── route.ts
│   │       └── [id]/
│   │           ├── route.ts
│   │           ├── participants/route.ts
│   │           ├── participants/[pid]/route.ts
│   │           ├── results/route.ts
│   │           ├── download/route.ts
│   │           └── sessions/[sid]/route.ts
│   ├── interview/[token]/page.tsx      # Participant chat page
│   ├── setup/page.tsx                  # Setup wizard
│   ├── layout.tsx
│   ├── page.tsx                        # Redirects to /admin
│   └── globals.css
├── db/
│   ├── schema.ts                       # Drizzle schema
│   └── index.ts                        # DB connection
├── lib/
│   └── auth.ts                         # NextAuth config
└── middleware.ts                       # Route protection
```

## Environment Variables Required

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=interview_app
NEXTAUTH_SECRET=<generated>
NEXTAUTH_URL=https://yourdomain.com
OPENAI_API_KEY=sk-...
SETUP_COMPLETE=true
```

## Session History

| Date | Changes |
|------|---------|
| Initial | Template created with base setup |
| 2026-02-18 | Full AI interview platform implemented |
| 2026-02-22 | Fixed MySQL DDL error (execute→query for DDL statements in setup route) |
| 2026-02-22 | Fixed post-setup redirect loop on Railway: setup API now sets `__setup_complete` cookie + stores `setup_complete` in `system_config` DB table; middleware checks cookie OR env var |
| 2026-02-22 | Fixed NextAuth "Server error / server configuration" on Railway: added `trustHost: true` to auth config (Railway production has no AUTH_URL/AUTH_TRUST_HOST env vars); also fixed admin user INSERT to use ON DUPLICATE KEY UPDATE so partial setup re-runs don't fail |
| 2026-02-22 | Added admin password reset feature: `/admin/reset-password` page + `/api/admin/reset-password` API route (authenticated by DB credentials); added "Forgot password?" link on login page; updated middleware to allow reset-password page without auth; improved auth.ts error logging |
| 2026-02-23 | Added setup reset feature: `/setup/reset` page + `/api/setup/reset` POST route; clears `setup_complete` from DB, deletes `.env.local`, and expires `__setup_complete` cookie; middleware allows `/setup/reset` regardless of setup state |
