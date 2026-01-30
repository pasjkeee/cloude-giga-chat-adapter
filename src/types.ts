/**
 * Configuration for GigaChat adapter
 */
export interface GigaChatConfig {
  /** API endpoint URL */
  baseUrl?: string;
  /** API key for authentication */
  apiKey: string;
  /** Model to use (e.g., "GigaChat", "GigaChat-Plus", "GigaChat-Pro") */
  model?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum tokens in response */
  maxTokens?: number;
  /** Temperature for response generation (0-2) */
  temperature?: number;
}

/**
 * Message format for GigaChat API
 */
export interface GigaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Response from GigaChat API
 */
export interface GigaChatResponse {
  choices: {
    message: {
      role: string;
      content: string;
    };
    index: number;
    finish_reason: string;
  }[];
  created: number;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Streaming chunk from GigaChat API
 */
export interface GigaChatStreamChunk {
  choices: {
    delta: {
      role?: string;
      content?: string;
    };
    index: number;
    finish_reason: string | null;
  }[];
  created: number;
  model: string;
}

/**
 * Plugin context provided by OpenCode
 */
export interface PluginContext {
  /** OpenCode SDK client */
  client: unknown;
  /** Current project information */
  project: {
    path: string;
    name: string;
  };
  /** Current working directory */
  cwd: string;
}

/**
 * Tool definition for OpenCode plugins
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: Record<string, unknown>, ctx: PluginContext) => Promise<unknown>;
}
