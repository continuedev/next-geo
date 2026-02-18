import { NextRequest, NextResponse } from "next/server";
import { INTERNAL_FETCH_HEADER } from "./constants";
import { htmlToMarkdown } from "./convert";
import { findPageMd, parseFrontmatter } from "./fs";
import type { GeoConfig } from "./types";

/** Validate that path is a safe, root-relative path (no protocol, no traversal) */
function isValidPath(path: string): boolean {
  // Must start with exactly one / (reject protocol-relative URLs like //evil.com)
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  // Must not contain protocol scheme (prevents SSRF via absolute URLs)
  if (path.includes("://")) return false;
  // Must not contain path traversal segments
  const segments = path.split("/");
  if (segments.some((s) => s === ".." || s === ".")) return false;
  return true;
}

/**
 * Create a route handler that serves markdown for LLM requests.
 *
 * Usage in app/api/geo/route.ts:
 *   export const runtime = 'nodejs';
 *   export const dynamic = 'force-dynamic';
 *   export const { GET } = createGeoHandler();
 */
export function createGeoHandler(config?: GeoConfig) {
  const { enableAutoConversion = true, preamble, postamble } = config ?? {};

  async function GET(request: NextRequest): Promise<NextResponse> {
    // Read target path from header (set by middleware rewrite) or query param
    // (direct access). The header is needed because NextResponse.rewrite() does
    // not expose the rewrite URL's search params to the route handler.
    const rawPath =
      request.headers.get("x-llm-target-path") ??
      request.nextUrl.searchParams.get("path");
    if (!rawPath) {
      return new NextResponse("Missing path parameter", { status: 400 });
    }

    if (!isValidPath(rawPath)) {
      return new NextResponse("Invalid path parameter", { status: 400 });
    }
    const path = rawPath;

    const markdown = await resolveMarkdown(request, path, {
      enableAutoConversion,
      config,
    });
    if (markdown !== null) {
      return markdownResponse(markdown.content, path, {
        preamble,
        postamble,
        cacheControl: markdown.cacheControl,
      });
    }

    return new NextResponse(`No markdown available for ${path}`, {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return { GET };
}

/**
 * Run the full markdown resolution pipeline for a path:
 * 1. Look for a co-located page.md file (following frontmatter redirects)
 * 2. Auto-convert the page's HTML to markdown (following same-host redirects)
 */
async function resolveMarkdown(
  request: NextRequest,
  path: string,
  options: {
    enableAutoConversion: boolean;
    config?: GeoConfig;
    /** Track redirect depth to prevent loops */
    redirectDepth?: number;
  },
): Promise<{ content: string; cacheControl: string } | null> {
  const { enableAutoConversion, config, redirectDepth = 0 } = options;
  const MAX_REDIRECTS = 3;

  // Step 1: Try to find a page.md file
  const pageMd = await findPageMd(path);
  if (pageMd !== null) {
    const { redirect, body } = parseFrontmatter(pageMd);

    // Follow frontmatter redirect to another path's markdown
    if (redirect) {
      if (!isValidPath(redirect) || redirectDepth >= MAX_REDIRECTS) return null;
      return resolveMarkdown(request, redirect, {
        enableAutoConversion,
        config,
        redirectDepth: redirectDepth + 1,
      });
    }

    return {
      content: body,
      cacheControl: "public, max-age=300, s-maxage=3600",
    };
  }

  // Step 2: Auto-convert HTML to markdown
  // Auto-conversion forwards cookies so response may be user-specific → private cache
  if (!enableAutoConversion) return null;

  try {
    const baseUrl =
      config?.internalBaseUrl ??
      `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const url = new URL(path, baseUrl);

    // Guard against SSRF: ensure the URL stays on the same host
    const base = new URL(baseUrl);
    if (url.host !== base.host) return null;

    // Forward cookies for auth, add internal header to bypass middleware
    const headers: Record<string, string> = {
      [INTERNAL_FETCH_HEADER]: "1",
      Accept: "text/html",
    };

    const cookie = request.headers.get("cookie");
    if (cookie) {
      headers["Cookie"] = cookie;
    }

    // Don't follow redirects automatically — a redirect could point to an
    // external host, leaking forwarded cookies (open-redirect SSRF).
    const response = await fetch(url.toString(), {
      headers,
      redirect: "manual",
    });

    // Follow same-host redirects by re-running the full pipeline for the
    // redirect target. This lets /explore → /integrations serve the right
    // markdown (including any page.md at the target path).
    if (
      redirectDepth < MAX_REDIRECTS &&
      response.status >= 300 &&
      response.status < 400
    ) {
      const location = response.headers.get("location");
      if (location) {
        const redirectUrl = new URL(location, url);
        if (redirectUrl.host === base.host) {
          return resolveMarkdown(request, redirectUrl.pathname, {
            enableAutoConversion,
            config,
            redirectDepth: redirectDepth + 1,
          });
        }
      }
      return null;
    }

    if (!response.ok) return null;

    // Guard against memory exhaustion from very large pages
    const MAX_HTML_SIZE = 5 * 1024 * 1024; // 5 MB
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_HTML_SIZE) {
      return null;
    }

    const html = await response.text();
    if (!html.trim() || html.length > MAX_HTML_SIZE) return null;

    return {
      content: htmlToMarkdown(html),
      cacheControl: "private, max-age=300",
    };
  } catch {
    return null;
  }
}

function markdownResponse(
  content: string,
  path: string,
  options: {
    preamble?: string | ((path: string) => string);
    postamble?: string | ((path: string) => string);
    cacheControl: string;
  },
): NextResponse {
  let markdown = content;

  if (options.preamble) {
    const pre =
      typeof options.preamble === "function"
        ? options.preamble(path)
        : options.preamble;
    markdown = `${pre}\n\n${markdown}`;
  }

  if (options.postamble) {
    const post =
      typeof options.postamble === "function"
        ? options.postamble(path)
        : options.postamble;
    markdown = `${markdown}\n\n${post}`;
  }

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      Vary: "Accept, User-Agent",
      "Cache-Control": options.cacheControl,
    },
  });
}
