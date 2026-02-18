import { readFile, readdir } from "fs/promises";
import { join, resolve } from "path";

/** Verify a resolved file path stays within the expected directory */
export function isPathWithinDirectory(
  filePath: string,
  directory: string,
): boolean {
  return filePath.startsWith(directory + "/") || filePath === directory;
}

/**
 * Search for a page.md file co-located with page.tsx for the given path.
 * Handles Next.js route groups like (main-layout), (homepage).
 */
export async function findPageMd(requestPath: string): Promise<string | null> {
  // Determine the app directory (relative to cwd)
  const appDir = join(process.cwd(), "app");

  // Normalize the path: "/" -> "", "/pricing" -> "pricing"
  const normalizedPath =
    requestPath === "/" ? "" : requestPath.replace(/^\//, "");
  const segments = normalizedPath ? normalizedPath.split("/") : [];

  // Try direct path first, with path traversal guard
  const directPath = resolve(appDir, ...segments, "page.md");
  if (!isPathWithinDirectory(directPath, appDir)) return null;
  const direct = await tryReadFile(directPath);
  if (direct !== null) return direct;

  // Try with route groups at the top level
  // Scan for (xxx) directories in the app root
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
    if (content !== null) return content;
  }

  return null;
}

export async function tryReadFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Parse frontmatter from markdown content.
 * Returns the frontmatter fields and the body without the frontmatter block.
 */
export function parseFrontmatter(content: string): {
  redirect?: string;
  body: string;
} {
  if (!content.startsWith("---")) return { body: content };

  const endIndex = content.indexOf("---", 3);
  if (endIndex === -1) return { body: content };

  const frontmatter = content.slice(3, endIndex);
  const body = content.slice(endIndex + 3).replace(/^\r?\n/, "");

  let redirect: string | undefined;
  for (const line of frontmatter.split("\n")) {
    const match = line.match(/^\s*redirect\s*:\s*(.+?)\s*$/);
    if (match) {
      redirect = match[1];
      break;
    }
  }

  return { redirect, body };
}
