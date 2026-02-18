/** Header set on internal fetches to prevent middleware loops */
export const INTERNAL_FETCH_HEADER = "x-llm-internal-fetch";

/** Internal route path for the markdown handler */
export const GEO_ROUTE = "/api/geo";

/** Default paths to exclude from LLM detection */
export const DEFAULT_EXCLUDE_PATHS = [
  "/api/*",
  "/trpc/*",
  "/_next/*",
  "/monitoring*",
];

/** Known LLM bot User-Agent patterns */
export const BOT_USER_AGENTS = [
  "ChatGPT-User",
  "ClaudeBot",
  "GPTBot",
  "PerplexityBot",
  "Applebot-Extended",
  "Google-Extended",
  "CCBot",
  "anthropic-ai",
  "cohere-ai",
  "Claude-SearchTool",
];
