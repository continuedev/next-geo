import { readdir, stat } from "fs/promises";
import { join, resolve } from "path";
import { isPathWithinDirectory, tryReadFile, parseFrontmatter } from "./fs";
import type { LlmsTxtConfig, LlmsTxtEntry } from "./types";

interface CacheEntry {
  content: string;
  expiresAt: number;
}

let llmsTxtCache: CacheEntry | null = null;
let llmsFullTxtCache: CacheEntry | null = null;

/** Clear the in-memory cache (useful for testing) */
export function clearLlmsTxtCache(): void {
  llmsTxtCache = null;
  llmsFullTxtCache = null;
}

/**
 * Create a Next.js route handler for `/llms.txt`.
 *
 * Auto-discovers `page.md` files in the app directory and combines them
 * with manually specified entries. Output follows the llmstxt.org spec.
 */
export function createLlmsTxtHandler(config: LlmsTxtConfig) {
  const httpTtl = config.cacheTtlSeconds ?? 3600;
  const cacheTtl = httpTtl * 1000;

  async function GET(): Promise<Response> {
    const now = Date.now();
    if (llmsTxtCache && now < llmsTxtCache.expiresAt) {
      return textResponse(llmsTxtCache.content, httpTtl);
    }

    const entries = await gatherEntries(config);
    const content = formatLlmsTxt(config, entries);

    llmsTxtCache = { content, expiresAt: now + cacheTtl };
    return textResponse(content, httpTtl);
  }

  return { GET };
}

/**
 * Create a Next.js route handler for `/llms-full.txt`.
 *
 * Concatenates the content of all discovered `page.md` files into a single
 * markdown document. Useful for agents that want all content in one request.
 */
export function createLlmsFullTxtHandler(config: LlmsTxtConfig) {
  const httpTtl = config.cacheTtlSeconds ?? 3600;
  const cacheTtl = httpTtl * 1000;

  async function GET(): Promise<Response> {
    const now = Date.now();
    if (llmsFullTxtCache && now < llmsFullTxtCache.expiresAt) {
      return textResponse(llmsFullTxtCache.content, httpTtl);
    }

    const appDir = config.appDir ?? join(process.cwd(), "app");
    const entries = await gatherEntries(config);

    const sections: string[] = [`# ${config.siteTitle}`];
    if (config.siteDescription) {
      sections.push(`\n> ${config.siteDescription}`);
    }

    for (const entry of entries) {
      const md = await readPageMd(appDir, entry.path);
      if (md) {
        sections.push(`\n---\n\n${md.trim()}`);
      }
    }

    const content = sections.join("\n");
    llmsFullTxtCache = { content, expiresAt: now + cacheTtl };
    return textResponse(content, httpTtl);
  }

  return { GET };
}

/**
 * Gather all entries: auto-discovered `page.md` files + manual entries.
 */
async function gatherEntries(config: LlmsTxtConfig): Promise<LlmsTxtEntry[]> {
  const appDir = config.appDir ?? join(process.cwd(), "app");
  const discovered = await discoverPageMdFiles(appDir);
  const manual = config.entries ?? [];

  // Merge: manual entries override discovered entries by path
  const byPath = new Map<string, LlmsTxtEntry>();
  for (const entry of discovered) {
    byPath.set(entry.path, entry);
  }
  for (const entry of manual) {
    byPath.set(entry.path, entry);
  }

  return Array.from(byPath.values()).sort((a, b) =>
    a.path.localeCompare(b.path),
  );
}

/**
 * Format entries into the llmstxt.org spec format.
 *
 * ```
 * # Site Title
 * > Site description
 *
 * ## Pages
 * - [Title](url): Description
 * ```
 */
function formatLlmsTxt(
  config: LlmsTxtConfig,
  entries: LlmsTxtEntry[],
): string {
  const lines: string[] = [`# ${config.siteTitle}`];

  if (config.siteDescription) {
    lines.push(`\n> ${config.siteDescription}`);
  }

  if (entries.length > 0) {
    lines.push("\n## Pages\n");
    for (const entry of entries) {
      const url = `${config.baseUrl}${entry.path}`;
      const desc = entry.description ? `: ${entry.description}` : "";
      lines.push(`- [${entry.title}](${url})${desc}`);
    }
  }

  return lines.join("\n") + "\n";
}

/**
 * Recursively discover `page.md` files in the Next.js app directory.
 * Strips route group prefixes like `(main-layout)` to compute URL paths.
 * Skips pages whose frontmatter has a `redirect` and no meaningful body
 * (prevents alias duplicates like `/home` appearing alongside `/`).
 */
async function discoverPageMdFiles(
  appDir: string,
  relativePath: string = "",
): Promise<LlmsTxtEntry[]> {
  const entries: LlmsTxtEntry[] = [];
  const currentDir = join(appDir, relativePath);

  let dirEntries: string[];
  try {
    dirEntries = await readdir(currentDir);
  } catch {
    return entries;
  }

  // Check for page.md in current directory
  if (dirEntries.includes("page.md")) {
    const filePath = join(currentDir, "page.md");
    const content = await tryReadFile(filePath);
    if (content) {
      const { redirect, body } = parseFrontmatter(content);

      // Skip redirect-only pages (no meaningful body) to avoid alias duplicates
      const isRedirectOnly = redirect && !body.trim();
      if (!isRedirectOnly) {
        const urlPath = routePathToUrl(relativePath);
        const title = extractTitle(body) ?? (urlPath === "/" ? "Home" : urlPath);
        const description = extractDescription(body);
        entries.push({ path: urlPath || "/", title, description });
      }
    }
  }

  // Recurse into subdirectories
  for (const name of dirEntries) {
    // Skip Next.js internal directories and API routes
    if (name.startsWith("_") || name === "api" || name === "node_modules") {
      continue;
    }

    const childPath = relativePath ? `${relativePath}/${name}` : name;
    const fullPath = join(appDir, childPath);

    // Check if it's a directory (skip files)
    try {
      const s = await stat(fullPath);
      if (!s.isDirectory()) continue;
    } catch {
      continue;
    }

    const childEntries = await discoverPageMdFiles(appDir, childPath);
    entries.push(...childEntries);
  }

  return entries;
}

/**
 * Convert a filesystem relative path to a URL path.
 * Strips route group prefixes like `(main-layout)`.
 *
 * Example: `(main-layout)/pricing` → `/pricing`
 */
export function routePathToUrl(relativePath: string): string {
  if (!relativePath) return "/";

  const segments = relativePath
    .split("/")
    .filter((s) => !s.startsWith("(") || !s.endsWith(")"));

  return "/" + segments.join("/");
}

/** Extract the first `# Heading` from markdown content */
export function extractTitle(markdown: string): string | undefined {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim();
}

/** Extract the first paragraph (non-heading, non-empty line) from markdown */
export function extractDescription(markdown: string): string | undefined {
  const lines = markdown.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) continue;
    if (trimmed.startsWith(">")) continue;
    if (trimmed.startsWith("-") || trimmed.startsWith("*")) continue;
    if (trimmed.startsWith("```")) continue;
    if (trimmed.startsWith("---")) continue;
    // Return the first paragraph-like line
    return trimmed;
  }
  return undefined;
}

/** Read a page.md file for a given URL path, checking route groups */
async function readPageMd(
  appDir: string,
  urlPath: string,
): Promise<string | null> {
  const normalizedPath = urlPath === "/" ? "" : urlPath.replace(/^\//, "");
  const segments = normalizedPath ? normalizedPath.split("/") : [];

  // Guard against path traversal
  if (segments.some((s) => s === ".." || s === ".")) return null;

  // Try direct path
  const directPath = resolve(appDir, ...segments, "page.md");
  if (!isPathWithinDirectory(directPath, appDir)) return null;
  const direct = await tryReadFile(directPath);
  if (direct) return direct;

  // Try with route groups at top level
  let topDirs: string[];
  try {
    topDirs = await readdir(appDir);
  } catch {
    return null;
  }

  const routeGroups = topDirs.filter(
    (d) => d.startsWith("(") && d.endsWith(")"),
  );

  for (const group of routeGroups) {
    const groupPath = resolve(appDir, group, ...segments, "page.md");
    if (!isPathWithinDirectory(groupPath, appDir)) continue;
    const content = await tryReadFile(groupPath);
    if (content) return content;
  }

  return null;
}

function textResponse(content: string, cacheTtlSeconds = 3600): Response {
  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": `public, max-age=${cacheTtlSeconds}`,
    },
  });
}
