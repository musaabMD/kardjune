<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Backend

This project uses Cloudflare as the production backend:

- R2 for question banks and uploads.
- D1 for users, subscriptions, sessions, progress, feedback, and AI metadata.
- KV for free-tier quota counters.

## MCP servers

Configured in `.cursor/mcp.json` (read-focused, authenticated):

| Server | Auth | Use when |
|--------|------|----------|
| **clerk** | OAuth | Clerk SDK snippets for Next.js auth, middleware, webhooks |
| **cloudflare-docs** | none | OpenNext, Workers, R2 documentation |
| **cloudflare-bindings** | OAuth | Live R2 buckets, Workers, KV/D1 bindings |
| **cloudflare-builds** | OAuth | Worker build status |
| **cloudflare-observability** | OAuth | Worker logs and metrics |
| **cloudflare-api** | OAuth | Full Cloudflare API (prefer read scopes) |

See `.cursor/rules/mcp-servers.mdc` for tool routing.
