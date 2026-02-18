---
name: Security Guards
description: Ensures SSRF protections, path traversal guards, and memory limits are not weakened or bypassed.
---

# Security Guards

## Context

This library fetches internal pages on behalf of LLM crawlers (auto-conversion in `src/handler.ts`), resolves file paths from user-controlled URL segments (`src/fs.ts`), and follows redirects. Several security-critical patterns prevent SSRF, path traversal, open-redirect cookie leakage, and memory exhaustion. Weakening any of these can expose the host application to serious vulnerabilities.

## What to Check

### 1. SSRF and Open-Redirect Guards in `src/handler.ts`

The handler fetches internal pages with `redirect: "manual"` and validates that redirect targets stay on the same host. Changes here must preserve:

- **`isValidPath()` validation** on the raw path before any fetch occurs. The path must be root-relative (`/...`), reject `//` prefix (protocol-relative URLs), reject `://` (absolute URLs), and reject `..`/`.` segments.
- **Same-host check** after constructing the `URL` object: `url.host !== base.host` must return null, not proceed.
- **`redirect: "manual"`** on the internal fetch. If this changes to `"follow"`, cookies will leak to external redirect targets.
- **Same-host validation on redirect `location`** header. The `redirectUrl.host === base.host` check must remain before following any redirect.
- **Redirect depth limit** (`MAX_REDIRECTS = 3`). Raising this significantly or removing it enables redirect loops.

BAD — removes same-host check on redirects:
```typescript
if (location) {
  return resolveMarkdown(request, new URL(location, url).pathname, { ... });
}
```

GOOD — validates host before following:
```typescript
if (location) {
  const redirectUrl = new URL(location, url);
  if (redirectUrl.host === base.host) {
    return resolveMarkdown(request, redirectUrl.pathname, { ... });
  }
}
```

### 2. Path Traversal Guards in `src/fs.ts` and `src/llms-txt.ts`

Both `findPageMd()` and `readPageMd()` resolve file paths from URL segments. Changes must preserve:

- **`isPathWithinDirectory()` check** after `resolve()` — ensures the resolved path stays under the app directory. Removing or weakening this allows `../../etc/passwd` style attacks.
- **Route group scanning** must only match directories matching `(xxx)` pattern, not arbitrary directories.
- **`segments.some(s => s === ".." || s === ".")` check** in `readPageMd()` — provides defense-in-depth before `resolve()`.

BAD — skips containment check:
```typescript
const directPath = resolve(appDir, ...segments, "page.md");
const direct = await tryReadFile(directPath);
```

GOOD — validates containment:
```typescript
const directPath = resolve(appDir, ...segments, "page.md");
if (!isPathWithinDirectory(directPath, appDir)) return null;
const direct = await tryReadFile(directPath);
```

### 3. Memory Exhaustion Guard in `src/handler.ts`

Auto-conversion fetches HTML and converts it to markdown. The `MAX_HTML_SIZE` (5 MB) limit prevents OOM on large pages. Changes must preserve:

- The `content-length` pre-check before reading the body.
- The `html.length > MAX_HTML_SIZE` post-check after `response.text()`.
- Both checks are needed — `content-length` may be absent or lie.

### 4. Middleware Loop Prevention

`src/middleware.ts` skips requests with the `INTERNAL_FETCH_HEADER`, and `src/handler.ts` sets this header on internal fetches. Changes must not break this handshake — removing either side creates an infinite request loop.

## Key Files to Check

- `src/handler.ts` — SSRF guards, redirect validation, memory limits, internal fetch header
- `src/fs.ts` — path traversal guards, `isPathWithinDirectory()`
- `src/llms-txt.ts` — path traversal guards in `readPageMd()`
- `src/middleware.ts` — internal fetch header check, loop prevention
- `src/constants.ts` — `INTERNAL_FETCH_HEADER` constant

## Exclusions

- Changes to test files (`*.test.ts`) that mock or test security behavior are fine.
- Adding new `excludePaths` patterns in `src/constants.ts` is fine — these reduce attack surface.
