# Docflow — Lightweight Collaborative Document Editor

A Google Docs–inspired document editor built as a full-stack assignment. Users can create, edit, and share rich-text documents, import `.txt`/`.md` files, and collaborate by granting other users edit access.

---

## Live Demo

> Add Vercel deployment URL here after deploying

---

## Setup

### Prerequisites
- Node.js ≥ 20
- A [Clerk](https://dashboard.clerk.com) account (free)
- A [Neon](https://console.neon.tech) Postgres database (free tier)

### 1. Clone and install

```bash
git clone <repo-url>
cd ai-native-assignment
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk dashboard → API Keys |
| `DATABASE_URL` | Neon console → Connection string (pooled, `-pooler` hostname) |
| `DIRECT_URL` | Neon console → Connection string (direct, non-pooled hostname) |

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
3. Set all `.env.example` variables as Vercel environment variables
4. Run `npx prisma migrate deploy` against your production Neon DB before or after first deploy

---

## Features

### Document Creation & Editing
- Create new documents from the dashboard
- Click a document title anywhere to rename it inline
- Rich-text editor (TipTap) with: **Bold**, *Italic*, Underline, ~~Strike~~, H1/H2/H3, Bullet list, Numbered list
- Content auto-saves 1 second after the last keystroke with a visible "Saving…" / "Saved" indicator

### File Upload / Import
- Import `.txt` or `.md` files (max 5 MB) via the "Import file" button on the dashboard
- `.md` files have basic syntax stripped (headings and inline formatting preserved as TipTap nodes)
- Supported types clearly labeled in the UI; unsupported types return a 415 error with a message

### Sharing
- Document owners can share via the "Share" button in the editor toolbar
- Enter a collaborator's email address; they must have signed in to Docflow at least once
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
- **Correct access control** — Every API route performs explicit owner-or-share checks. The logic is extracted into `src/lib/access-control.ts` and tested independently.
- **End-to-end usability** — The document creation → edit → share → reload flow works completely.
- **Type safety** — Zero `tsc --noEmit` errors; Prisma v7 generated types used throughout.

### Deliberate scope cuts
| Cut | Reason |
|---|---|
| Real-time multiplayer (Y.js / Liveblocks) | Would add 60+ min of infra setup; single-user save-on-change is reliable and sufficient to show the pattern |
| `.docx` file import | Requires `mammoth` or `docx` parsing library; not worth the dependency for the assignment scope |
| View-only permission enforcement | The `permission` field is stored and returned to clients, but the UI doesn't lock the editor for view shares — edit access is the meaningful use case here |
| Document version history | Out of scope; would require a separate `DocumentRevision` table |
| Email notifications on share | Requires transactional email service — out of scope |

### Tech stack rationale
- **Next.js 16 App Router** — Full-stack in one repo; RSC for dashboard data fetch, client components for interactive editor
- **Clerk** — Provides auth UI, JWT session management, and App Router `auth()` helper with zero custom login code
- **Neon + Prisma** — Free-tier serverless Postgres; Prisma adapter handles connection pooling on Vercel's serverless functions
- **TipTap** — Headless rich-text editor; JSON content model maps cleanly to Prisma's `Json` field type
- **Vitest** — Fast unit testing; mocks Prisma to test access-control logic in isolation

### File structure
```
src/
├── app/
│   ├── api/documents/          # CRUD + upload + share endpoints
│   ├── api/users/search/       # Email search for sharing autocomplete
│   ├── documents/              # Dashboard + editor pages (RSC)
│   ├── sign-in / sign-up/      # Clerk auth pages
│   └── layout.tsx              # ClerkProvider root
├── components/
│   ├── documents/              # DocumentList, DocumentCard, ShareDialog, UploadButton, DocumentView
│   └── editor/                 # Editor (TipTap), Toolbar
├── lib/
│   ├── access-control.ts       # Extracted, testable access logic
│   ├── prisma.ts               # Singleton PrismaClient with Neon adapter
│   └── utils.ts                # cn() helper
└── __tests__/                  # Unit tests
```
