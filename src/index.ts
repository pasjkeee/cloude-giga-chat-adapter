/**
 * OpenCode GigaChat Adapter
 *
 * This adapter provides integration with GigaChat for OpenCode.
 */

// AI SDK Provider (for OpenCode)
export {
  createGigaChat,
  gigachat,
  type GigaChatProviderSettings,
  type GigaChatModelSettings,
} from "./provider.js";

// Standalone adapter
export { GigaChatAdapter } from "./adapter.js";

// Types
export type {
  GigaChatConfig,
  GigaChatModel,
  GigaChatMessage,
  GigaChatResponse,
} from "./types.js";

// Default export for OpenCode provider
export { createGigaChat as default } from "./provider.js";
