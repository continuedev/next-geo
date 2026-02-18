---
name: Detection Logic
description: Ensures LLM detection priority order, bot list updates, and content negotiation headers stay consistent.
---

# Detection Logic

## Context

The core value of `next-geo` is correctly identifying LLM requests and serving them markdown. Detection uses a deliberate priority order in `src/detect.ts`:

1. `.md` URL suffix (explicit intent — highest priority)
2. `Accept: text/markdown` header (standard content negotiation)
3. User-Agent matching (fallback — lowest priority)

This ordering matters: suffix detection is the most reliable signal, accept-header is standards-based, and user-agent is a heuristic that can false-positive. The bot list in `src/constants.ts`, the middleware path exclusions, and the `Vary` response headers must all stay consistent with the detection logic.

## What to Check

### 1. Detection Priority Order in `src/detect.ts`

The three checks in `detectLlmSignal()` must remain in their current order: md-suffix, then accept-header, then user-agent. Reordering can cause incorrect signal types to be returned (e.g., a `.md` URL being classified as user-agent match if UA check runs first).

### 2. Bot User-Agent List Changes in `src/constants.ts`

When adding or removing entries from `BOT_USER_AGENTS`:

- **New entries** should be actual LLM bot user-agent substrings, not broad patterns that match regular browsers. For example, `"Bot"` alone would match `"Googlebot"` and many non-LLM crawlers.
- **Removed entries** should be verified against real-world traffic — removing an active bot means those requests silently fall back to HTML.
- **Test coverage** in `src/detect.test.ts` should include the new/removed agent string to document the expected behavior.

BAD — overly broad pattern:
```typescript
export const BOT_USER_AGENTS = [
  ...existing,
  "Bot",  // matches Googlebot, Bingbot, etc.
];
```

GOOD — specific pattern:
```typescript
export const BOT_USER_AGENTS = [
  ...existing,
  "NewLLMBot",  // matches "NewLLMBot/1.0" user-agent
];
```

### 3. `Vary` Header Consistency

Both `src/middleware.ts` and `src/handler.ts` set `Vary: Accept, User-Agent` on responses. The `src/config.ts` `withGeo()` wrapper also injects a global `Vary: Accept` header. If detection logic changes (e.g., adding a new signal source like a custom header), the `Vary` headers must be updated to include it — otherwise CDNs will serve cached responses incorrectly.

### 4. Middleware Exclude Paths vs. Handler Paths

`DEFAULT_EXCLUDE_PATHS` in `src/constants.ts` skips detection for `/api/*`, `/trpc/*`, `/_next/*`, `/monitoring*`. The `GEO_ROUTE` (`/api/geo`) is within the excluded `/api/*` range, which is intentional — the handler should not detect itself as an LLM request.

If new exclude patterns are added, verify they don't accidentally exclude paths that should serve markdown. If `GEO_ROUTE` changes, verify it still falls within an excluded pattern.

### 5. `addDiscoveryHeaders()` Path Filtering in `src/discovery.ts`

The discovery header helper independently skips `.md`, `/api/`, `/_next/`, and `/trpc/` paths. These must stay aligned with `DEFAULT_EXCLUDE_PATHS`. If middleware exclusions are updated, discovery exclusions should be reviewed too.

## Key Files to Check

- `src/detect.ts` — detection priority order, signal type correctness
- `src/constants.ts` — `BOT_USER_AGENTS` list, `DEFAULT_EXCLUDE_PATHS`, `GEO_ROUTE`
- `src/detect.test.ts` — test coverage for bot patterns
- `src/middleware.ts` — `Vary` header, exclude path usage
- `src/handler.ts` — `Vary` header in markdown responses
- `src/config.ts` — global `Vary` header injection
- `src/discovery.ts` — path filtering alignment with exclude paths

## Exclusions

- The `additionalBotUserAgents` config option is designed for consumers to add custom patterns — no check needed for that field itself.
- Changes to `enableMdSuffix` or `enableUserAgentDetection` option defaults are config choices, not detection bugs.
