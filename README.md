# Docflow — Lightweight Collaborative Document Editor

A Google Docs–inspired document editor built as a full-stack assignment. Users can create, edit, and share rich-text documents, import `.txt`/`.md` files, and collaborate in real time with other users.

---

## Live Demo

https://ai-native-kappa.vercel.app

---

## Setup

### Prerequisites

- Node.js ≥ 20
- A [Clerk](https://dashboard.clerk.com) account (free)
- A [Neon](https://console.neon.tech) Postgres database (free tier)
- A [Liveblocks](https://liveblocks.io/dashboard) account (free tier)

### 1. Clone and install

```bash
git clone https://github.com/Lolillya/ai-native.git
cd ai-native-assignment
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable                            | Where to get it                                                |
| ----------------------------------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys                                     |
| `CLERK_SECRET_KEY`                  | Clerk dashboard → API Keys                                     |
| `DATABASE_URL`                      | Neon console → Connection string (pooled, `-pooler` hostname)  |
| `DIRECT_URL`                        | Neon console → Connection string (direct, non-pooled hostname) |
| `LIVEBLOCKS_SECRET_KEY`             | Liveblocks dashboard → API Keys (`sk_dev_...`)                 |

The remaining `NEXT_PUBLIC_CLERK_*` variables can be left as-is from `.env.example`.

### 3. Run database migrations

```bash
npx prisma migrate dev --name init
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Running Tests

```bash
npm test
```

8 unit tests cover the access-control logic (can a user read/edit a document?).

---

## Deploying to Vercel

1. Push to GitHub
2. Import into Vercel
3. Set all `.env.example` variables as Vercel environment variables (including `LIVEBLOCKS_SECRET_KEY`)
4. Add your Vercel domain in the Clerk dashboard → Domains
5. Run `npx prisma migrate deploy` against your production Neon DB before or after first deploy

---

## Features

### Document Creation & Editing

- Create new documents from the dashboard
- Click a document title anywhere to rename it inline
- Rich-text editor (TipTap) with: **Bold**, _Italic_, Underline, ~~Strike~~, H1/H2/H3, Bullet list, Numbered list
- Content auto-saves 1 second after the last keystroke with a visible "Saving…" / "Saved" indicator

### Real-Time Collaboration

- Multiple users editing the same document see each other's changes instantly
- Powered by [Liveblocks](https://liveblocks.io) + Y.js (CRDT — conflict-free concurrent edits)
- Online users shown as colored presence avatars in the editor toolbar
- Access-controlled: only the document owner and invited users can join a room
- Content persists to Postgres via debounced auto-save regardless of real-time activity

### File Upload / Import

- Import `.txt` or `.md` files (max 5 MB) via the "Import file" button on the dashboard
- `.md` files have basic syntax stripped (headings and inline formatting preserved as TipTap nodes)
- Supported types clearly labeled in the UI; unsupported types return a 415 error with a message

### Sharing

- Document owners can share via the "Share" button in the editor
- Enter a collaborator's email address — works for any user with a Clerk account, even before they've visited the app (resolved via Clerk backend API)
- Live email autocomplete as you type (searches registered users)
- Shared users receive edit access and see the document in their "Shared with Me" list with the owner's name shown
- Owners can revoke access at any time from the Share dialog
- Owned vs. shared documents are visually distinct on the dashboard

### Persistence

- All documents and sharing state stored in Neon Postgres via Prisma
- TipTap content stored as JSON (full node structure), preserving all formatting on reload
- Sharing relationships survive page refresh

---

## Architecture & Tradeoffs

### What I prioritized

- **Correct access control** — Every API route performs explicit owner-or-share checks. The logic is extracted into `src/lib/access-control.ts` and tested independently. Liveblocks room tokens are also gated by the same Prisma access check.
- **End-to-end usability** — The document creation → edit → share → real-time collaborate → reload flow works completely.
- **Type safety** — Zero `tsc --noEmit` errors; Prisma v7 generated types used throughout.

### Deliberate scope cuts

| Cut                              | Reason                                                                                                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.docx` file import              | Requires `mammoth` or `docx` parsing library; not worth the dependency for the assignment scope                                                            |
| View-only permission enforcement | The `permission` field is stored and returned to clients, but the UI doesn't lock the editor for view shares — edit access is the meaningful use case here |
| Document version history         | Out of scope; would require a separate `DocumentRevision` table                                                                                            |
| Email notifications on share     | Requires transactional email service — out of scope                                                                                                        |

### Tech stack rationale

- **Next.js 16 App Router** — Full-stack in one repo; RSC for dashboard data fetch, client components for interactive editor
- **Clerk** — Provides auth UI, JWT session management, and App Router `auth()` helper with zero custom login code
- **Neon + Prisma** — Free-tier serverless Postgres; Prisma adapter handles connection pooling on Vercel's serverless functions
- **TipTap** — Headless rich-text editor; JSON content model maps cleanly to Prisma's `Json` field type
- **Liveblocks** — Managed real-time WebSocket infrastructure; Y.js CRDT handles conflict-free merging; `@liveblocks/react-tiptap` integrates directly with the TipTap editor
- **Vitest** — Fast unit testing; mocks Prisma to test access-control logic in isolation

### File structure

```
src/
├── app/
│   ├── api/documents/          # CRUD + upload + share endpoints
│   ├── api/liveblocks-auth/    # Liveblocks room token endpoint (access-controlled)
│   ├── api/users/search/       # Email search for sharing autocomplete
│   ├── documents/              # Dashboard + editor pages (RSC)
│   ├── sign-in / sign-up/      # Clerk auth pages
│   └── layout.tsx              # ClerkProvider root
├── components/
│   ├── documents/              # DocumentList, DocumentCard, ShareDialog, UploadButton,
│   │                           # DocumentView, DocumentRoom (Liveblocks provider wrapper)
│   └── editor/                 # CollaborativeEditor (Liveblocks + TipTap), Toolbar
├── lib/
│   ├── access-control.ts       # Extracted, testable access logic
│   ├── ensure-user.ts          # Upserts Clerk user into Postgres on first seen
│   ├── prisma.ts               # Singleton PrismaClient with Neon adapter
│   └── utils.ts                # cn() helper
└── __tests__/                  # Unit tests
```
