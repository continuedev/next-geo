import { BOT_USER_AGENTS } from "./constants";
import type { LlmSignal } from "./types";

/**
 * Detect if a request is from an LLM, returning signal details or null.
 * Checks in priority order: .md suffix, Accept header, User-Agent.
 */
export function detectLlmSignal(
  pathname: string,
  accept: string | null,
  userAgent: string | null,
  options?: {
    enableMdSuffix?: boolean;
    enableUserAgentDetection?: boolean;
    additionalBotUserAgents?: string[];
  },
): LlmSignal | null {
  const {
    enableMdSuffix = true,
    enableUserAgentDetection = true,
    additionalBotUserAgents = [],
  } = options ?? {};

  // 1. .md URL suffix (highest priority — explicit intent)
  if (enableMdSuffix && pathname.endsWith(".md")) {
    const originalPath = pathname.slice(0, -3) || "/";
    return { type: "md-suffix", originalPath };
  }

  // 2. Accept: text/markdown header
  if (accept) {
    const quality = parseAcceptMarkdown(accept);
    if (quality > 0) {
      return { type: "accept-header", quality };
    }
  }

  // 3. User-Agent matching (lowest priority — fallback)
  if (enableUserAgentDetection && userAgent) {
    const allPatterns = [...BOT_USER_AGENTS, ...additionalBotUserAgents];
    for (const pattern of allPatterns) {
      if (userAgent.includes(pattern)) {
        return { type: "user-agent", botName: pattern };
      }
    }
  }

  return null;
}

/**
 * Simple boolean check for whether a request is from an LLM.
 */
export function isLlmRequest(
  pathname: string,
  accept: string | null,
  userAgent: string | null,
  options?: {
    enableMdSuffix?: boolean;
    enableUserAgentDetection?: boolean;
    additionalBotUserAgents?: string[];
  },
): boolean {
  return detectLlmSignal(pathname, accept, userAgent, options) !== null;
}

/**
 * Parse an Accept header and return the quality value for text/markdown.
 * Returns 0 if text/markdown is not present.
 */
function parseAcceptMarkdown(accept: string): number {
  const parts = accept.split(",").map((p) => p.trim());
  for (const part of parts) {
    const [mediaType, ...params] = part.split(";").map((s) => s.trim());
    if (mediaType?.toLowerCase() === "text/markdown") {
      const qParam = params.find((p) => p.startsWith("q="));
      if (qParam) {
        const q = parseFloat(qParam.slice(2));
        return isNaN(q) ? 1 : q;
      }
      return 1;
    }
  }
  return 0;
}
