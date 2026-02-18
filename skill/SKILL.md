---
name: setup-geo
description: Set up next-geo to serve markdown to LLMs via content negotiation. Installs the package, creates middleware, adds the route handler, and scaffolds example page.md files.
metadata:
  author: continuedev
  version: "1.0.0"
---

# Setup next-geo

You are setting up `next-geo` in a Next.js App Router project. This package serves markdown to LLMs instead of HTML using HTTP content negotiation.

## Prerequisites

Verify the project uses Next.js App Router (not Pages Router):
- Check for an `app/` directory with `page.tsx` files
- Check `next.config.js` or `next.config.ts` exists
- If using Pages Router (`pages/` directory), inform the user that this package requires App Router

## Step 1: Install the package

```bash
npm install next-geo
```

If it fails (package not yet published), check if it exists locally in the monorepo at `packages/next-geo/`. If so, add it as a workspace dependency.

## Step 2: Wrap the Next.js config

Open the project's `next.config.js` (or `.ts` or `.mjs`).

Add `withGeo` to the config wrapper chain:

```js
const { withGeo } = require("next-geo/config");
```

Then wrap the exported config. If the config already uses wrappers (e.g., Sentry, bundle-analyzer), compose them:

```js
// Before:
module.exports = withBundleAnalyzer(nextConfig);

// After:
module.exports = withBundleAnalyzer(withGeo(nextConfig));
```

If the config uses ES modules (`export default`), adjust the import/export style accordingly.

## Step 3: Create or update middleware.ts

Check if `middleware.ts` already exists at the app root (next to `next.config.js`).

**If no middleware exists**, create it:

```ts
// middleware.ts
import { createGeoMiddleware } from "next-geo/middleware";
import { NextRequest, NextResponse } from "next/server";

const geo = createGeoMiddleware();

export function middleware(request: NextRequest) {
  const geoResponse = geo(request);
  if (geoResponse) return geoResponse;
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
```

**If middleware already exists**, integrate the GEO check at the top of the existing middleware function. The key pattern is:

```ts
const geo = createGeoMiddleware();

export function middleware(request: NextRequest) {
  // GEO content negotiation (must be first)
  const geoResponse = geo(request);
  if (geoResponse) return geoResponse;

  // ... existing middleware logic ...
}
```

If the existing middleware excludes paths via `config.matcher`, ensure the matcher doesn't accidentally exclude page routes that should support markdown.

## Step 4: Create the route handler

Create the file `app/api/geo/route.ts` (adjusting the path based on where the app directory lives):

```ts
import { createGeoHandler } from "next-geo/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET } = createGeoHandler();
```

If the user wants to customize the response (e.g., add a preamble), pass options:

```ts
export const { GET } = createGeoHandler({
  preamble: (path) =>
    `> Markdown version of [${path}](https://example.com${path}).`,
});
```

## Step 5: Create example page.md files

Identify 1-3 important public pages in the project (e.g., homepage, pricing, docs landing). For each, create a `page.md` file alongside the existing `page.tsx`:

```
app/
  pricing/
    page.tsx     # existing
    page.md      # new - create this
```

Write clean, informative markdown that summarizes the page content. Focus on what an LLM would find useful: structured data, clear headings, links to related pages. Skip visual/interactive elements.

If a route is an alias of another (e.g., `/home` renders the same component as `/`), use a frontmatter redirect instead of duplicating content:

```markdown
---
redirect: /
---
```

Ask the user which pages they'd like to create `page.md` files for.

## Step 6: Add llms.txt routes (optional)

Ask the user if they'd like to add `/llms.txt` and `/llms-full.txt` endpoints (following the [llmstxt.org](https://llmstxt.org) spec).

If they say yes, create two route files:

```ts
// app/llms.txt/route.ts
import { createLlmsTxtHandler } from "next-geo/llms-txt";

export const { GET } = createLlmsTxtHandler({
  siteTitle: "My Site",
  siteDescription: "What my site does",
  baseUrl: "https://example.com",
  entries: [
    { path: "/", title: "Home", description: "Main page" },
    // Add important pages here
  ],
});
```

```ts
// app/llms-full.txt/route.ts
import { createLlmsFullTxtHandler } from "next-geo/llms-txt";

export const { GET } = createLlmsFullTxtHandler({
  siteTitle: "My Site",
  siteDescription: "What my site does",
  baseUrl: "https://example.com",
});
```

The handlers auto-discover `page.md` files in the app directory. Manual `entries` override auto-discovered entries by path.

## Step 7: Add discovery headers (optional)

Ask the user if they'd like to advertise markdown availability via `Link` headers. This helps agents discover that `.md` versions of pages exist.

If they say yes, add to the middleware (after the GEO check):

```ts
import { addDiscoveryHeaders } from "next-geo/discovery";

// In the response handler, before returning:
addDiscoveryHeaders(response, pathname);
```

This sets `Link: </pricing.md>; rel="alternate"; type="text/markdown"` on non-API responses.

## Step 8: Add a PR check (optional)

Ask the user if they'd like to add a Continue check that keeps `page.md` files in sync with page changes. This check runs on PRs and flags stale markdown, missing redirects for aliased routes, and public pages without curated content.

If they say yes, copy the check template from the package into the project:

```
.continue/checks/geo.md
```

The template is located at `check/geo.md` relative to the `next-geo` package root (i.e., `node_modules/next-geo/check/geo.md`, or in the monorepo at `packages/next-geo/check/geo.md`). Copy its contents into `.continue/checks/geo.md`.

After copying, review the check and tailor it to the project if needed — for example, noting which directories contain public pages vs. authenticated pages.

## Step 9: Verify

Run the dev server and test:

```bash
# Should return markdown
curl -H "Accept: text/markdown" http://localhost:3000/

# Should return markdown (URL suffix)
curl http://localhost:3000/.md

# Should return normal HTML
curl http://localhost:3000/
```

If auto-conversion is working, even pages without `page.md` should return markdown when requested.

## Troubleshooting

- **404 on markdown requests**: Ensure the middleware matcher includes the requested path, and the `/api/geo/route.ts` file exists
- **Infinite redirect loop**: The middleware must check for the `x-llm-internal-fetch` header (the `createGeoMiddleware` function handles this automatically)
- **Empty markdown from auto-conversion**: The page might require authentication. Auto-conversion forwards cookies from the original request, but unauthenticated bots will see the signed-out version
- **Middleware not running**: In Next.js, `middleware.ts` must be at the project root (next to `next.config.js`), not inside the `app/` directory
