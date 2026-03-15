# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) and Cursor AI when working with code in this repository.

## Project Overview

**Busibox App Template** is a Next.js 16 application template designed for rapid development of apps that integrate with the Busibox infrastructure. All data storage uses the Busibox data-api service -- no direct database access.

**Key Architecture**: Frontend app with data-api for storage, agent-api for AI, and authz for authentication. No Prisma or direct database access.

## Quick Start

### Development Commands

```bash
# Install dependencies
npm install

# Run development server (port 3002)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Testing
npm test              # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage

# Linting
npm run lint
```

### Environment Setup

```bash
cp env.example .env.local
# Edit .env.local with your settings
```

### Deployment

**From Busibox Admin Workstation**:
```bash
cd /path/to/busibox

# Deploy to production:
make install SERVICE=<app-name>

# Deploy to staging:
make install SERVICE=<app-name> INV=inventory/staging
```

## Architecture

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, TypeScript 5, Tailwind CSS 4
- **Storage**: Busibox data-api (no direct database access)
- **Auth**: Busibox SSO via authz service (JWKS/RS256), `SessionProvider` from `@jazzmind/busibox-app`
- **Shared Components**: `@jazzmind/busibox-app` (^3.0)
- **Deployment**: PM2, nginx (apps-lxc container), Ansible

### Project Structure

```
busibox-template/
├── app/                        # Next.js App Router
│   ├── (authenticated)/        # Route group with Header/nav/Footer
│   │   ├── layout.tsx          # Client layout with useSession()
│   │   ├── page.tsx            # Home page
│   │   └── demo/page.tsx       # Demo features (DELETE for real app)
│   ├── api/                    # API routes
│   │   ├── agent/[...path]/    # Agent-api catch-all proxy
│   │   ├── auth/               # Authentication endpoints
│   │   │   ├── exchange/       # SSO token → cookie exchange
│   │   │   ├── logout/         # GET redirect logout
│   │   │   ├── refresh/        # Token refresh
│   │   │   ├── session/        # Session (createSessionRouteHandlers)
│   │   │   └── token/          # Agent-api token for chat components
│   │   ├── demo/               # Demo routes (DELETE for real app)
│   │   │   ├── agent/          # Demo agent call
│   │   │   └── notes/          # Demo CRUD
│   │   ├── health/             # Health check
│   │   ├── logout/             # App-only cookie clear (POST)
│   │   ├── session/            # Legacy session endpoint
│   │   ├── setup/              # Data document initialization
│   │   ├── sso/                # SSO callback (GET + POST)
│   │   └── version/            # Deployment version info
│   ├── globals.css             # Tailwind CSS
│   └── layout.tsx              # Root layout (SessionProvider, ThemeProvider)
├── lib/                        # Utilities
│   ├── auth-middleware.ts      # requireAuthWithTokenExchange, optionalAuth
│   ├── authz-client.ts         # Zero Trust token exchange client
│   ├── data-api-client.ts      # Data-api schemas and CRUD (demo notes)
│   ├── api-client.ts           # Generic API client
│   └── types.ts                # Shared types
├── busibox.json                # App manifest
├── env.example                 # Environment template
└── scripts/                    # Utility scripts
    ├── validate-manifest.ts    # Validate busibox.json
    ├── update-busibox-app.sh   # Update @jazzmind/busibox-app
    ├── link-local-busibox.sh   # npm link for local dev
    └── unlink-local-busibox.sh # Unlink and reinstall
```

## Authentication

### Auth Architecture

Uses `SessionProvider` from `@jazzmind/busibox-app/components/auth/SessionProvider` in the root layout. This handles SSO token exchange, session management, background token refresh, and 401 retry.

```typescript
// app/layout.tsx (server component)
import { SessionProvider } from "@jazzmind/busibox-app/components/auth/SessionProvider";

<SessionProvider appId={appId} portalUrl={portalUrl} basePath={basePath}>
  {children}
</SessionProvider>

// app/(authenticated)/layout.tsx (client component)
import { useSession } from "@jazzmind/busibox-app/components/auth/SessionProvider";

const { user, isAuthenticated, logout } = useSession();
```

### Token Flow

1. User clicks app in Busibox Portal
2. Portal exchanges session JWT for app-scoped token via authz
3. authz verifies user has app access via RBAC
4. authz issues RS256 token with `app_id` claim and user's roles
5. App validates token via authz JWKS endpoint
6. SessionProvider exchanges token via `/api/auth/session` to set cookies

### Auth API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/session` | GET, POST | Session check, SSO exchange, token refresh |
| `/api/auth/exchange` | POST | Store SSO token in httpOnly cookie |
| `/api/auth/refresh` | POST | Refresh access token via authz |
| `/api/auth/logout` | GET | Clear cookies, redirect to portal login |
| `/api/auth/token` | GET | Return agent-api token for chat components |
| `/api/sso` | GET, POST | SSO handlers from `@jazzmind/busibox-app` |
| `/api/session` | GET | Legacy session endpoint (backward compat) |
| `/api/logout` | POST | Clear app cookies only |

## API Service Patterns

All backend calls use Zero Trust token exchange via `requireAuthWithTokenExchange()` with the appropriate audience.

### Data API (`data-api`)

For structured data storage. Use `ensureDocuments`, `queryRecords`, `insertRecords`, etc. from `@jazzmind/busibox-app`:

```typescript
import { requireAuthWithTokenExchange } from "@/lib/auth-middleware";
import { ensureDataDocuments, listNotes } from "@/lib/data-api-client";

export async function GET(request: NextRequest) {
  const auth = await requireAuthWithTokenExchange(request, "data-api");
  if (auth instanceof NextResponse) return auth;

  const documentIds = await ensureDataDocuments(auth.apiToken);
  const { notes } = await listNotes(auth.apiToken, documentIds.notes);
  return NextResponse.json({ notes });
}
```

### Agent API (`agent-api`)

**Chat pattern** -- Use the `/api/agent/[...path]` catch-all proxy. Client code calls `/api/agent/<path>` and the proxy forwards to `AGENT_API_URL/<path>` with proper token exchange. Handles streaming SSE responses.

**Token pattern** -- For client-side chat components (e.g., `SimpleChatInterface`), use `/api/auth/token` to get a bearer token:

```typescript
const res = await fetch('/api/auth/token');
const { token } = await res.json();
<SimpleChatInterface token={token} agentId="my-agent" />
```

**Structured output pattern** -- For programmatic tasks that need deterministic JSON (scoring, classification, extraction, summarization), use `POST /runs/invoke` with `response_schema`. This bypasses the chat system and forces schema-validated JSON output with retry.

```typescript
// In a Next.js API route:
const auth = await requireAuthWithTokenExchange(request, "agent-api");

const SCORE_SCHEMA = {
  name: "item_scores",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["scores"],
    properties: {
      scores: {
        type: "array",
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "score", "reasoning"],
          properties: {
            id: { type: "string" },
            score: { type: "number" },
            reasoning: { type: "string" },
          },
        },
      },
    },
  },
};

const res = await fetch(`${AGENT_API_URL}/runs/invoke`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${auth.apiToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    agent_name: "record-extractor",
    input: { prompt: "Score these items..." },
    response_schema: SCORE_SCHEMA,
    agent_tier: "complex",
  }),
});

const { output, error } = await res.json();
// output is validated JSON matching SCORE_SCHEMA.schema
```

Key rules:
- Use `agent_name: "record-extractor"` (built-in no-tool agent) or your own custom agent
- `response_schema` must have `name`, `strict: true`, and `schema` with `additionalProperties: false`
- Include `required` arrays on all objects and `maxItems` on arrays
- `agent_tier`: `"simple"` (30s), `"complex"` (5min), `"batch"` (30min)
- Do NOT use `/llm/completions` (no validation/retry) or `/chat/message` (1000-char limit, conversational)

See `docs/developers/architecture/06-agents.md` in the busibox repo for full documentation.

### Search API (`search-api`)

Same pattern as data-api, but with `"search-api"` audience:

```typescript
const auth = await requireAuthWithTokenExchange(request, "search-api");
// Use auth.apiToken to call search service
```

### Custom Backend

For proxying to a custom backend API, use `lib/api-client.ts`:

```typescript
import { api } from "@/lib/api-client";
const result = await api.get<MyType>("/endpoint", token);
```

## Key Patterns

### Server vs Client Components

**Default to Server Components**:
```typescript
export default async function ItemsPage() {
  const items = await fetchItems();
  return <ItemList items={items} />;
}
```

**Use Client Components for interactivity**:
```typescript
'use client';
import { useSession } from "@jazzmind/busibox-app/components/auth/SessionProvider";

export function MyComponent() {
  const { user } = useSession();
  // ...
}
```

### Dynamic Route Parameters (Next.js 16)

Route params are async and must be awaited:

```typescript
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ItemPage({ params }: PageProps) {
  const { id } = await params;
  // ...
}
```

### API Route Params

```typescript
interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  // ...
}
```

### Data Storage Pattern

All data is stored via the Busibox data-api using the `@jazzmind/busibox-app` client:

```typescript
// 1. Define document schemas in lib/data-api-client.ts
export const itemSchema: AppDataSchema = {
  fields: {
    id: { type: 'string', required: true, hidden: true },
    name: { type: 'string', required: true, label: 'Name' },
  },
  displayName: 'Items',
  sourceApp: 'my-app',
  visibility: 'personal',
};

// 2. Ensure documents exist
const documentIds = await ensureDataDocuments(auth.apiToken);

// 3. CRUD operations
const items = await queryRecords(token, documentIds.items, { ... });
await insertRecords(token, documentIds.items, [newItem]);
```

## Environment Variables

### Required

```bash
APP_NAME=my-app              # Token audience and cookie prefix
PORT=3002
NEXT_PUBLIC_BASE_PATH=       # e.g., /myapp for nginx proxy
NEXT_PUBLIC_BUSIBOX_PORTAL_URL=http://localhost:3000
AUTHZ_BASE_URL=http://localhost:8010
```

### Backend Services

```bash
DATA_API_URL=http://localhost:8002
AGENT_API_URL=http://localhost:8000
DEFAULT_API_AUDIENCE=data-api
```

### Optional

```bash
TEST_SESSION_JWT=...          # For local dev without Portal
VERBOSE_AUTHZ_LOGGING=false
NEXT_PUBLIC_PORTAL_BASE_PATH=/portal
```

## Development Workflow

### Adding a New Feature

1. Define data model schemas in `lib/data-api-client.ts`
2. Define types in `lib/types.ts`
3. Create API routes in `app/api/`
4. Build UI pages in `app/(authenticated)/`
5. Add navigation links in `app/(authenticated)/layout.tsx`

### Adding Agents

1. Create agent definitions (see recruiter's `lib/recruiter-agents.ts` for example)
2. Create a seed script in `scripts/seed-agents.ts`
3. Run with `npx tsx scripts/seed-agents.ts`
4. Use `SimpleChatInterface` from `@jazzmind/busibox-app` for chat UI

## Busibox Integration

### Shared Components

The `@jazzmind/busibox-app` package provides:

- **SessionProvider**: SSO auth, token refresh, session management
- **ThemeProvider**: Dark/light mode
- **CustomizationProvider**: Branding from portal
- **FetchWrapper**: Auth-aware fetch with 401 retry
- **Header, Footer, VersionBar**: Standard layout components
- **SimpleChatInterface**: Chat UI for agent-api
- **Data API Client**: `ensureDocuments`, `queryRecords`, `insertRecords`, etc.

### Important Import Paths

```typescript
// Auth components
import { SessionProvider, useSession } from "@jazzmind/busibox-app/components/auth/SessionProvider";

// Auth utilities (server-side)
import { getTokenFromRequest, isTokenExpired } from "@jazzmind/busibox-app/lib/authz";
import { createSSOGetHandler, createSSOPostHandler } from "@jazzmind/busibox-app/lib/authz";
import { createSessionRouteHandlers } from "@jazzmind/busibox-app/lib/authz/session-route-handlers";

// Layout & UI
import { ThemeProvider, CustomizationProvider, FetchWrapper, VersionBar } from "@jazzmind/busibox-app";
import { Header, Footer } from "@jazzmind/busibox-app";

// Data API
import { ensureDocuments, queryRecords, insertRecords } from "@jazzmind/busibox-app";

// Token exchange
import { exchangeTokenZeroTrust, getAuthHeaderZeroTrust } from "@jazzmind/busibox-app";
```

**Note**: The correct import path for auth utilities is `@jazzmind/busibox-app/lib/authz` (NOT `lib/auth`).

## Troubleshooting

### Auth Issues

```bash
# Check AuthZ service
curl http://authz:8010/health

# Check JWKS endpoint
curl http://authz:8010/.well-known/jwks.json
```

### Data-API Issues

```bash
# Check data-api health
curl http://data-api:8002/health
```

### Build Issues

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Related Projects

- **Busibox**: Infrastructure and deployment automation
- **Busibox Portal**: Main dashboard application
- **Busibox-App**: Shared component library (`@jazzmind/busibox-app`)
- **Busibox Agents**: Reference implementation
- **Busibox Recruiter**: Reference data-api + agent-api implementation

## Important Notes

1. **No direct database access**: All storage goes through data-api
2. **Authentication**: Uses Busibox SSO via `SessionProvider` -- no custom auth needed
3. **Import paths**: Use `lib/authz` (not `lib/auth`) for auth utilities
4. **Deployment**: Always use `make install SERVICE=<app-name>` from busibox repo
5. **Port**: Default port is 3002 (adjust in env if needed)
6. **Base Path**: Configure `NEXT_PUBLIC_BASE_PATH` for nginx proxy routing
7. **Appbuilder**: This template is used by the appbuilder to scaffold new apps
