export { detectLlmSignal, isLlmRequest } from "./detect";
export { createGeoMiddleware } from "./middleware";
export { createGeoHandler } from "./handler";
export { withGeo } from "./config";
export { htmlToMarkdown } from "./convert";
export { createLlmsTxtHandler, createLlmsFullTxtHandler } from "./llms-txt";
export { addDiscoveryHeaders } from "./discovery";
export type {
  GeoConfig,
  LlmSignal,
  LlmSignalAcceptHeader,
  LlmSignalMdSuffix,
  LlmSignalUserAgent,
  LlmsTxtConfig,
  LlmsTxtEntry,
} from "./types";
