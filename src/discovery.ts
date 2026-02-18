/**
 * Add a `Link` header pointing to the markdown alternate of the current page.
 *
 * Call this in your middleware or response handler to advertise that a markdown
 * version is available. Agents and tools that understand RFC 8288 link headers
 * will follow the alternate link automatically.
 *
 * Skips `.md` paths, `/api/`, and `/_next/` to avoid unnecessary headers.
 */
export function addDiscoveryHeaders(
  response: { headers: { set(name: string, value: string): void } },
  pathname: string,
): void {
  // Don't add discovery for paths that are already markdown or internal
  if (
    pathname.endsWith(".md") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/trpc/")
  ) {
    return;
  }

  const mdPath = pathname === "/" ? "/index.md" : `${pathname}.md`;
  response.headers.set(
    "Link",
    `<${mdPath}>; rel="alternate"; type="text/markdown"`,
  );
}
