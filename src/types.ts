export interface GeoConfig {
  /** Paths to exclude from LLM detection (glob patterns). Defaults to common API/internal paths. */
  excludePaths?: string[];

  /** Additional User-Agent patterns to treat as LLM bots */
  additionalBotUserAgents?: string[];

  /** Enable .md URL suffix convention (default: true) */
  enableMdSuffix?: boolean;

  /** Enable User-Agent based LLM bot detection (default: true) */
  enableUserAgentDetection?: boolean;

  /** Enable auto-conversion from HTML to markdown (default: true) */
  enableAutoConversion?: boolean;

  /** Base URL for internal fetches during auto-conversion */
  internalBaseUrl?: string;

  /** Preamble to prepend to every markdown response */
  preamble?: string | ((path: string) => string);

  /** Postamble to append to every markdown response */
  postamble?: string | ((path: string) => string);
}

export type LlmSignalType = "md-suffix" | "accept-header" | "user-agent";

export interface LlmSignalMdSuffix {
  type: "md-suffix";
  originalPath: string;
}

export interface LlmSignalAcceptHeader {
  type: "accept-header";
  quality: number;
}

export interface LlmSignalUserAgent {
  type: "user-agent";
  botName: string;
}

export type LlmSignal =
  | LlmSignalMdSuffix
  | LlmSignalAcceptHeader
  | LlmSignalUserAgent;

/** A single entry in the llms.txt file */
export interface LlmsTxtEntry {
  /** URL path (e.g., "/pricing") */
  path: string;
  /** Human-readable title */
  title: string;
  /** Short description */
  description?: string;
}

/** Configuration for llms.txt and llms-full.txt generation */
export interface LlmsTxtConfig {
  /** Site title for the llms.txt header */
  siteTitle: string;
  /** Site description */
  siteDescription?: string;
  /** Base URL (e.g., "https://example.com") */
  baseUrl: string;
  /** Manually specified entries (added alongside auto-discovered ones) */
  entries?: LlmsTxtEntry[];
  /** Cache TTL in seconds (default: 3600) */
  cacheTtlSeconds?: number;
  /** App directory path for auto-discovery (default: process.cwd() + "/app") */
  appDir?: string;
}
