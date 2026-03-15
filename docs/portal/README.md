# App Documentation for docs-api

This directory contains documentation that will be automatically synced to the Busibox docs-api when the app is deployed. The docs-api serves these files to the AI Portal documentation viewer.

## How It Works

1. Place markdown files in this `docs/portal/` directory
2. Each file must have YAML frontmatter (see below)
3. On deploy, the deploy-api copies these files to the docs-api content directory
4. The docs-api serves them under the `apps` category, grouped by `app_id`

## Required Frontmatter

Every markdown file in `docs/portal/` **must** have this YAML frontmatter:

```yaml
---
title: "Page Title"
category: "apps"
order: 1
description: "Brief description of this page"
published: true
app_id: "your-app-id"
app_name: "Your App Name"
---
```

### Field Reference

| Field | Required | Description |
|---|---|---|
| `title` | Yes | Page title displayed in navigation |
| `category` | Yes | Must be `"apps"` for app documentation |
| `order` | Yes | Sort order (1, 2, 3...) within this app's docs |
| `description` | Yes | Brief summary shown in doc listings |
| `published` | Yes | Set `true` to show, `false` to hide |
| `app_id` | Yes | Your app's identifier (must match deployment config) |
| `app_name` | Yes | Human-readable app name for grouping |

## File Naming

- Use `NN-name.md` format for ordered pages (e.g., `01-overview.md`, `02-usage.md`)
- Use `kebab-case` for filenames
- Keep names descriptive and concise

## Example Structure

```
docs/portal/
  README.md          # This file (not served by docs-api)
  01-overview.md     # App overview and features
  02-usage.md        # How to use the app
  03-api.md          # API reference (if applicable)
```

## Tips

- Keep docs focused on end-user functionality
- Include screenshots or diagrams where helpful
- Link to related Busibox platform docs using relative paths
- The docs-api skips files without valid frontmatter, so README.md won't be served
- Test locally by checking the docs-api endpoint: `GET /docs/apps/groups`
