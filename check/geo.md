---
name: GEO
description: Detects stale page.md files, missing curated markdown for public pages, and inconsistencies in the next-geo setup
---

Review this pull request for issues related to the GEO (Generative Engine Optimization) content negotiation system powered by `next-geo`. This system serves clean markdown to LLM crawlers (ChatGPT, Claude, Perplexity, etc.) instead of HTML. Pages can have co-located `page.md` files with curated content, or fall back to automatic HTML-to-markdown conversion.

## Context

The `next-geo` package provides middleware that detects LLM requests (via Accept header, User-Agent, or `.md` URL suffix) and rewrites them to an internal handler. The handler first looks for a `page.md` file co-located with `page.tsx`, and if none exists, auto-converts the HTML.

A `page.md` can also contain a frontmatter `redirect` field to serve another path's markdown — useful for aliased routes that render the same content.

## What to Check

### 1. Stale page.md Detection (Error)

If the PR modifies a `page.tsx` that has a co-located `page.md` in the same directory, but the `page.md` was **not** also modified in the PR, flag it. The curated markdown likely needs updating to reflect the page changes.

**How to check:**
- Look at all modified `page.tsx` files in the diff
- For each one, check if a `page.md` exists in the same directory
- If the `page.md` exists but is not in the diff, flag as Error
- Exception: `page.md` files that only contain a frontmatter `redirect` don't need their *body* updated when the page changes — but verify the redirect target is still correct (e.g., if `page.tsx` changed which route it aliases, the redirect path must be updated too)

### 2. page.md Content Consistency (Warning)

For any `page.md` files touched in the PR, verify the markdown content reasonably reflects what the corresponding `page.tsx` renders:

- **Headings** — Major headings in the page should appear in the markdown
- **Key content** — Features, pricing tiers, CTAs, and important links should be present
- **Accuracy** — No references to removed features or outdated information
- **Links** — URLs in the markdown should be valid and match the page

This is a judgment call — the `page.md` is a curated summary, not a 1:1 copy. Focus on material omissions or inaccuracies.

### 3. Aliased Routes Without Redirect (Warning)

If a route imports its main component from another route's directory, it should have a `page.md` with a frontmatter `redirect` pointing to the canonical route. Without this, the alias will fall back to auto-conversion instead of serving the curated markdown.

**Example fix** — create a `page.md` next to the alias's `page.tsx`:
```markdown
---
redirect: /original-path
---
```

### 4. Public Pages Missing page.md (Info)

If the PR adds or modifies a public-facing page that does **not** have a `page.md`, mention it as informational. Auto-conversion works but curated markdown is better for important pages.

Public pages are typically marketing, docs, pricing, about, or other unauthenticated pages. Dashboard or settings pages behind auth generally don't need curated LLM markdown.

## Severity

- **Error**: `page.tsx` modified without updating co-located `page.md`
- **Warning**: `page.md` content doesn't reflect `page.tsx`, aliased route missing redirect `page.md`
- **Info**: Public page missing curated `page.md`
