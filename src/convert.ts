import TurndownService from "turndown";

let _turndown: TurndownService | null = null;

function getTurndown(): TurndownService {
  if (_turndown) return _turndown;

  _turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });

  // Remove non-content elements
  _turndown.remove([
    "script",
    "style",
    "nav",
    "header",
    "footer",
    "iframe",
    "noscript",
  ]);

  // Remove aria-hidden elements
  _turndown.addRule("aria-hidden", {
    filter: (node) => node.getAttribute?.("aria-hidden") === "true",
    replacement: () => "",
  });

  return _turndown;
}

/**
 * Convert an HTML string to clean markdown.
 * Extracts <main> or <article> content preferentially, falls back to <body>.
 * Extracts <title> and prepends as # heading if no h1 exists.
 */
export function htmlToMarkdown(html: string): string {
  const turndown = getTurndown();

  // Extract title
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
  const title = titleMatch?.[1]?.trim();

  // Try to extract main content area
  let contentHtml = extractElement(html, "main");
  if (!contentHtml) contentHtml = extractElement(html, "article");
  if (!contentHtml) contentHtml = extractElement(html, "body");
  if (!contentHtml) contentHtml = html;

  let markdown = turndown.turndown(contentHtml);

  // Clean up excessive whitespace
  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();

  // Prepend title as h1 if no h1 exists in the markdown
  if (title && !markdown.match(/^# /m)) {
    markdown = `# ${title}\n\n${markdown}`;
  }

  return markdown;
}

function extractElement(html: string, tag: string): string | null {
  // Match the outermost element of the given tag
  const regex = new RegExp(
    `<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
    "i",
  );
  const match = html.match(regex);
  return match?.[1] ?? null;
}
