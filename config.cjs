/**
 * CommonJS entry point for next.config.js usage.
 * This file exists because next.config.js uses require() which can't load .ts files.
 *
 * Usage:
 *   const { withGeo } = require("next-geo/config");
 */

/** @param {Record<string, unknown>} nextConfig */
function withGeo(nextConfig) {
  const existingHeaders = nextConfig.headers;

  const wrappedHeaders = async () => {
    const existing =
      typeof existingHeaders === "function"
        ? await existingHeaders()
        : existingHeaders ?? [];

    // Find or create the catch-all source entry
    const catchAllIndex = existing.findIndex((h) => h.source === "/:path*");

    const varyHeader = { key: "Vary", value: "Accept" };

    if (catchAllIndex >= 0) {
      const entry = existing[catchAllIndex];
      const varyIndex =
        entry.headers?.findIndex((h) => h.key.toLowerCase() === "vary") ?? -1;
      if (varyIndex >= 0) {
        // Merge Accept into existing Vary header if not already present
        const current = entry.headers[varyIndex];
        const values = current.value
          .split(",")
          .map((v) => v.trim().toLowerCase());
        if (!values.includes("accept")) {
          entry.headers[varyIndex] = {
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

module.exports = { withGeo };
