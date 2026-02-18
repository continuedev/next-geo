import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_EXCLUDE_PATHS,
  INTERNAL_FETCH_HEADER,
  GEO_ROUTE,
} from "./constants";
import { detectLlmSignal } from "./detect";
import type { GeoConfig } from "./types";

/**
 * Create a middleware function that detects LLM requests and rewrites them
 * to the internal markdown handler.
 *
 * Returns null for non-LLM requests so you can compose with other middleware.
 */
export function createGeoMiddleware(config?: GeoConfig) {
  const {
    excludePaths = DEFAULT_EXCLUDE_PATHS,
    additionalBotUserAgents = [],
    enableMdSuffix = true,
    enableUserAgentDetection = true,
  } = config ?? {};

  return function geoMiddleware(
    request: NextRequest,
  ): NextResponse | null {
    // Skip internal fetches to prevent loops
    if (request.headers.get(INTERNAL_FETCH_HEADER)) {
      return null;
    }

    const { pathname } = request.nextUrl;

    // Skip excluded paths
    if (isExcluded(pathname, excludePaths)) {
      return null;
    }

    const accept = request.headers.get("accept");
    const userAgent = request.headers.get("user-agent");

    const signal = detectLlmSignal(pathname, accept, userAgent, {
      enableMdSuffix,
      enableUserAgentDetection,
      additionalBotUserAgents,
    });

    if (!signal) {
      return null;
    }

    // Determine the original path to serve markdown for
    const targetPath =
      signal.type === "md-suffix" ? signal.originalPath : pathname;

    // Rewrite to the internal markdown handler.
    // Pass the target path via header because NextResponse.rewrite() does not
    // expose the rewrite URL's search params to the route handler — the handler
    // sees the original request URL instead.
    const url = request.nextUrl.clone();
    url.pathname = GEO_ROUTE;
    url.searchParams.set("path", targetPath);

    const response = NextResponse.rewrite(url, {
      request: {
        headers: new Headers({
          ...Object.fromEntries(request.headers as unknown as Iterable<[string, string]>),
          "x-llm-target-path": targetPath,
        }),
      },
    });
    response.headers.set("Vary", "Accept, User-Agent");
    return response;
  };
}

function isExcluded(pathname: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      if (pathname.startsWith(prefix)) return true;
    } else if (pathname === pattern) {
      return true;
    }
  }
  return false;
}
