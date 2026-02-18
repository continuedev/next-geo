---
name: Public API Surface
description: Ensures package exports, barrel re-exports, and TypeScript types stay in sync when modules change.
---

# Public API Surface

## Context

`next-geo` exposes its API through three layers that must stay in sync:

1. **`package.json` `"exports"` map** — defines the subpath imports consumers use (e.g., `next-geo/middleware`)
2. **`src/index.ts` barrel** — re-exports all public functions and types from the main `"."` entry point
3. **`src/types.ts`** — defines all public TypeScript interfaces and type aliases

When a contributor adds a new module, renames an export, or changes a function signature, all three layers must be updated together. A mismatch causes confusing import errors or missing types for consumers.

## What to Check

### 1. New Module Missing from `package.json` Exports

If a new `.ts` file is added to `src/` that exports public API (not a test file, not a helper), verify it has a corresponding entry in `package.json` `"exports"`. Each entry needs `"import"` and `"types"` subfields pointing to the compiled `dist/` output.

Current export map structure:
```json
"./middleware": {
  "import": "./dist/middleware.js",
  "types": "./dist/middleware.d.ts"
}
```

### 2. New Export Missing from `src/index.ts`

If a new public function or type is added to any module, verify it is re-exported from `src/index.ts`. The barrel file should export all public functions and all public types separately.

BAD — new function added to `src/detect.ts` but not re-exported:
```typescript
// src/detect.ts
export function detectLlmSignal(...) { ... }
export function isLlmRequest(...) { ... }
export function newPublicFunction(...) { ... }  // added

// src/index.ts — unchanged, missing newPublicFunction
export { detectLlmSignal, isLlmRequest } from "./detect";
```

GOOD — barrel updated:
```typescript
export { detectLlmSignal, isLlmRequest, newPublicFunction } from "./detect";
```

### 3. New Interface/Type Missing from `src/types.ts` Export

If a new public-facing interface or type alias is introduced (e.g., for a config option or return type), verify it is:
- Defined in `src/types.ts` (not scattered across implementation files)
- Re-exported from `src/index.ts` in the `export type { ... }` block

### 4. Breaking Signature Changes Without Major Version Bump

If a PR changes the signature of an exported function (adding required parameters, changing return types, renaming exports), flag it. This is a semver-breaking change for a published package. The commit message should use `feat!:` or `BREAKING CHANGE:` to trigger a major version bump via semantic-release.

## Key Files to Check

- `package.json` — `"exports"` map
- `src/index.ts` — barrel re-exports
- `src/types.ts` — public type definitions
- Any new or renamed `src/*.ts` files (excluding `*.test.ts`)

## Exclusions

- Internal helpers (unexported functions, private utilities) do not need to appear in the barrel or exports map.
- Test files (`*.test.ts`) and `src/constants.ts` are internal and do not need package.json export entries.
- The `config.cjs` CommonJS wrapper is a special case already handled in `package.json`.
