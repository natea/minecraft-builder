# Busibox App Template - Cursor Rules

This directory contains rules for AI agents (Cursor, Claude Code, etc.) to follow when working on apps built from this template.

## Purpose

These rules ensure:
- **Consistency** - Code follows Next.js 16 App Router best practices
- **Architecture** - All data storage via data-api
- **Quality** - Components and APIs are properly structured
- **Maintainability** - Code is organized predictably

## Rule Files

| File | Purpose |
|------|---------|
| `000-core.mdc` | Meta-rule for creating/updating rules |
| `001-architect.mdc` | Planning and architecture decisions |
| `002-nextjs-patterns.mdc` | Next.js 16 App Router patterns |
| `003-component-org.mdc` | Component organization |
| `004-database.mdc` | Data API storage patterns |
| `005-api-routes.mdc` | API route patterns |
| `006-authentication.mdc` | Busibox SSO authentication |
| `007-error-handling.mdc` | Error handling approach |
| `008-testing.mdc` | Testing standards |

## Key Principle: Data API Storage

All apps use the Busibox data-api for storage:

- Define schemas in `lib/data-api-client.ts`
- Use `ensureDataDocuments()` before CRUD operations
- Use `requireAuthWithTokenExchange(request, 'data-api')` for auth
- No direct database access needed

## Quick Reference

### "Where should I create this component?"
- **Shared** -> `components/`
- **Feature-specific** -> `components/[feature]/`
- **Page-only** -> `app/[page]/components/`

### "How do I handle authentication?"
```typescript
// API routes
const auth = await requireAuthWithTokenExchange(request, 'data-api');
if (auth instanceof NextResponse) return auth;

// Use auth.apiToken for data-api calls
```

### "How do I handle route params?"
```typescript
// ALWAYS await params in Next.js 16
const { id } = await params;
```

## Related Files

- **CLAUDE.md** - Main AI guidance file
- **README.md** - Project documentation
- **env.example** - Environment variables
