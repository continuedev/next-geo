# next-geo

Serve markdown to LLMs instead of HTML. Drop `page.md` files next to your `page.tsx` files and they'll be served automatically when an LLM requests your pages.

When no `page.md` exists, pages are auto-converted from HTML to markdown on the fly.

## How it works

LLMs and AI agents signal they want markdown in three ways:

1. **Accept header** — `Accept: text/markdown` (used by Claude Code, Cloudflare Markdown for Agents, etc.)
2. **URL suffix** — Append `.md` to any page URL (e.g., `example.com/pricing.md`)
3. **User-Agent** — Known bot identifiers (ChatGPT-User, ClaudeBot, GPTBot, PerplexityBot, etc.)

When detected, requests are rewritten to an internal handler that serves your `page.md` or auto-converts the HTML.

## Quick start

The easiest way to set up is with a coding agent. Install the skill and let it handle the wiring:

```bash
npx skills add continuedev/skills --skill setup-geo
```

Then ask your agent: "Set up next-geo in this project."

### Manual setup

```bash
npm install next-geo
```

Three files to create/update — see [Configuration](#configuration) below for details on each:

1. **Wrap your config** — add `withGeo()` to `next.config.js`
2. **Add middleware** — create `middleware.ts` with `createGeoMiddleware()`
3. **Add route handler** — create `app/api/geo/route.ts` with `createGeoHandler()`

Then write `page.md` files next to any `page.tsx`:

```
app/
  pricing/
    page.tsx    ← what browsers see
    page.md     ← what LLMs see
```

Test it:

```bash
curl -H "Accept: text/markdown" http://localhost:3000/pricing
# or
curl http://localhost:3000/pricing.md
```

## Auto-conversion

Pages without a `page.md` file are automatically converted from HTML to clean markdown using [Turndown](https://github.com/mixmark-io/turndown). The converter:

- Extracts `<main>` or `<article>` content (skips navigation, headers, footers)
- Strips scripts, styles, and decorative elements
- Preserves headings, links, lists, code blocks, and tables
- Adds the page title as an `# h1` if not already present

To disable auto-conversion:

```ts
createGeoHandler({ enableAutoConversion: false });
```

## Configuration

### Middleware options

```ts
createGeoMiddleware({
  // Paths to skip (default: /api/*, /trpc/*, /_next/*, /monitoring*)
  excludePaths: ["/api/*", "/admin/*"],

  // Additional User-Agent patterns to treat as LLM bots
  additionalBotUserAgents: ["MyCustomBot"],

  // Disable the .md URL suffix convention (default: true)
  enableMdSuffix: false,
});
```

### Handler options

```ts
createGeoHandler({
  // Disable auto-conversion fallback (default: true)
  enableAutoConversion: false,

  // Base URL for internal fetches during auto-conversion
  internalBaseUrl: "http://localhost:3000",

  // Add context for LLMs at the top/bottom of every response
  preamble: (path) => `> Markdown for ${path}. Visit the full page for interactive content.`,
  postamble: "---\nPowered by next-geo",
});
```

## How detection works

| Signal | Example | Priority |
|--------|---------|----------|
| `.md` suffix | `GET /pricing.md` | Highest (explicit) |
| Accept header | `Accept: text/markdown, text/html` | Medium (standard) |
| User-Agent | `ClaudeBot/1.0` | Lowest (fallback) |

The middleware checks signals in priority order and rewrites the first match. Normal browser requests are never affected.

## llms.txt

Generate `/llms.txt` and `/llms-full.txt` following the [llmstxt.org](https://llmstxt.org) spec.

```ts
// app/llms.txt/route.ts
import { createLlmsTxtHandler } from "next-geo/llms-txt";

export const { GET } = createLlmsTxtHandler({
  siteTitle: "My Site",
  siteDescription: "What my site does",
  baseUrl: "https://example.com",
  entries: [
    { path: "/docs", title: "Documentation", description: "API reference and guides" },
  ],
});
```

```ts
// app/llms-full.txt/route.ts
import { createLlmsFullTxtHandler } from "next-geo/llms-txt";

export const { GET } = createLlmsFullTxtHandler({
  siteTitle: "My Site",
  baseUrl: "https://example.com",
});
```

The handlers auto-discover `page.md` files in your app directory, extract titles from `#` headings and descriptions from first paragraphs, and handle Next.js route groups (stripping `(group-name)` prefixes from URLs).

## Discovery Headers

Advertise markdown availability via `Link` headers (RFC 8288):

```ts
import { addDiscoveryHeaders } from "next-geo/discovery";

// In your middleware or response handler:
addDiscoveryHeaders(response, pathname);
// Sets: Link: </pricing.md>; rel="alternate"; type="text/markdown"
```

## Caching & Security

- **Static `page.md`** responses: `Cache-Control: public, max-age=300, s-maxage=3600`
- **Auto-converted** responses: `Cache-Control: private, max-age=300` (cookies are forwarded, so response may be user-specific)
- **`Vary: Accept`** is added globally via the config wrapper so CDNs maintain separate caches
- **`Vary: User-Agent`** is added only to markdown responses
- **Auto-conversion** guards against SSRF (same-host validation, same-host-only redirect following, size limits)

## Utilities

You can also use the detection logic directly:

```ts
import { isLlmRequest, detectLlmSignal } from "next-geo";

// Simple boolean check
if (isLlmRequest(pathname, acceptHeader, userAgent)) {
  // ...
}

// Detailed signal info
const signal = detectLlmSignal(pathname, acceptHeader, userAgent);
// { type: 'accept-header', quality: 1.0 }
// { type: 'user-agent', botName: 'ClaudeBot' }
// { type: 'md-suffix', originalPath: '/pricing' }
// null
```

## Redirects

When multiple routes render the same content (e.g., `/` and `/home` both show the homepage), you can use a frontmatter `redirect` in `page.md` to serve another path's markdown instead of duplicating it:

```markdown
---
redirect: /
---
```

When the handler finds a `redirect` field, it resolves the target path's markdown (including its `page.md` or auto-conversion) and serves that. Redirect chains are followed up to 3 hops. Any frontmatter is stripped from served content — only the markdown body is returned.

This is useful for aliased routes, vanity URLs, or any case where two paths should serve identical LLM content.

## Route groups

Next.js route groups (e.g., `(main-layout)`, `(marketing)`) are handled automatically. The handler scans all `(...)` directories at the app root to find `page.md` files regardless of which route group they belong to.

## License

MIT
