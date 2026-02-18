/**
 * Next.js config wrapper for GEO (Generative Engine Optimization) support.
 *
 * Injects a global `Vary: Accept` header so CDNs maintain separate caches
 * for HTML and markdown responses without requiring middleware to set it
 * on every response individually.
 *
 * Usage in next.config.js:
 *   const { withGeo } = require("next-geo/config");
 *   module.exports = withGeo(nextConfig);
 */
export function withGeo<T extends Record<string, unknown>>(
  nextConfig: T,
): T {
  const existingHeaders = (nextConfig as any).headers;

  const wrappedHeaders = async () => {
    const existing: any[] =
      typeof existingHeaders === "function"
        ? await existingHeaders()
        : existingHeaders ?? [];

    // Find or create the catch-all source entry
    const catchAllIndex = existing.findIndex(
      (h: any) => h.source === "/:path*",
    );

    const varyHeader = { key: "Vary", value: "Accept" };

    if (catchAllIndex >= 0) {
      const entry = existing[catchAllIndex];
      const varyIndex =
        entry.headers?.findIndex(
          (h: any) => h.key.toLowerCase() === "vary",
        ) ?? -1;
      if (varyIndex >= 0) {
        // Merge Accept into existing Vary header if not already present
        const current = entry.headers![varyIndex];
        const values = current.value
          .split(",")
          .map((v: string) => v.trim().toLowerCase());
        if (!values.includes("accept")) {
          entry.headers![varyIndex] = {
            ...current,
            value: `${current.value}, Accept`,
          };
        }
      } else {
        entry.headers = [...(entry.headers ?? []), varyHeader];
      }
    } else {
      existing.push({
        source: "/:path*",
        headers: [varyHeader],
      });
    }

    return existing;
  };

  return { ...nextConfig, headers: wrappedHeaders };
}
