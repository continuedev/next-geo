# Contributing to next-geo

Thanks for your interest in contributing! This guide will help you get started.

## Development setup

```bash
git clone https://github.com/continuedev/next-geo.git
cd next-geo
npm install
```

### Useful commands

| Command | Description |
|---------|-------------|
| `npm test` | Run the test suite |
| `npm run build` | Build the package |
| `npm run tsc:check` | Type-check without emitting |

## Project structure

```
src/
  index.ts          # Public API — isLlmRequest, detectLlmSignal
  detect.ts         # LLM detection logic (Accept, User-Agent, .md suffix)
  middleware.ts      # Next.js middleware factory
  handler.ts         # Route handler factory (page.md lookup + auto-conversion)
  config.ts          # withGeo() Next.js config wrapper
  llms-txt.ts        # /llms.txt and /llms-full.txt handlers
  discovery.ts       # Link header utilities
  html-to-markdown.ts # Turndown-based HTML → markdown converter
skill/
  SKILL.md           # Agent skill for setting up next-geo in a project
check/
  geo.md             # PR check for page.md consistency
```

## Making changes

1. **Fork and branch** — Create a feature branch from `main`.
2. **Write tests** — Add or update tests in `__tests__/` for any behavior changes.
3. **Follow conventions** — Use [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` for new features (triggers minor release)
   - `fix:` for bug fixes (triggers patch release)
   - `docs:` for documentation-only changes
   - `test:` for test-only changes
   - `BREAKING CHANGE:` in the commit body for breaking changes (triggers major release)
4. **Check your work**:
   ```bash
   npm run tsc:check
   npm test
   npm run build
   ```

## Pull request process

1. Open a PR against `main` with a clear description of the change.
2. Ensure all checks pass (tests, type-check, build).
3. A maintainer will review your PR — please be patient, we'll get to it.

## Reporting bugs

Use the [bug report template](https://github.com/continuedev/next-geo/issues/new?template=bug_report.yml) to file issues.

