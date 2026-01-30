import { GigaChatAdapter } from "./adapter.js";
import type { GigaChatConfig, PluginContext, ToolDefinition } from "./types.js";

/**
 * Plugin configuration options
 */
export interface PluginOptions {
  /** GigaChat configuration */
  gigachat: GigaChatConfig;
}

/**
 * OpenCode Plugin interface
 */
export interface Plugin {
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Available tools */
  tools: ToolDefinition[];
  /** Cleanup function */
  cleanup?: () => Promise<void>;
}

/**
 * Create an OpenCode plugin for GigaChat integration
 *
 * @example
 * ```typescript
 * import { createPlugin } from "opencode-giga-chat-adapter";
 *
 * export default createPlugin({
 *   gigachat: {
 *     apiKey: process.env.GIGACHAT_API_KEY!,
 *     model: "GigaChat-Pro",
 *   },
 * });
 * ```
 */
export function createPlugin(options: PluginOptions): (ctx: PluginContext) => Plugin {
  return (_ctx: PluginContext): Plugin => {
    const adapter = new GigaChatAdapter(options.gigachat);

    const tools: ToolDefinition[] = [
      {
        name: "gigachat_chat",
        description: "Send a message to GigaChat and get a response",
        parameters: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "The message to send to GigaChat",
            },
            systemPrompt: {
              type: "string",
              description: "Optional system prompt to set context",
            },
          },
          required: ["message"],
        },
        execute: async (params: Record<string, unknown>) => {
          const message = params.message as string;
          const systemPrompt = params.systemPrompt as string | undefined;

          const messages = [];
          if (systemPrompt) {
            messages.push({ role: "system" as const, content: systemPrompt });
          }
          messages.push({ role: "user" as const, content: message });

          const response = await adapter.chat(messages);
          return {
            content: response.choices[0]?.message.content ?? "",
            usage: response.usage,
          };
        },
      },
      {
        name: "gigachat_models",
        description: "List available GigaChat models",
        parameters: {
          type: "object",
          properties: {},
        },
        execute: async () => {
          const models = await adapter.listModels();
          return { models };
        },
      },
      {
        name: "gigachat_configure",
        description: "Update GigaChat adapter configuration",
        parameters: {
          type: "object",
          properties: {
            model: {
              type: "string",
              description: "Model to use",
            },
            temperature: {
              type: "number",
              description: "Temperature for response generation (0-2)",
            },
            maxTokens: {
              type: "number",
              description: "Maximum tokens in response",
            },
          },
        },
        execute: async (params: Record<string, unknown>) => {
          adapter.updateConfig({
            model: params.model as string | undefined,
            temperature: params.temperature as number | undefined,
            maxTokens: params.maxTokens as number | undefined,
          });
          return { config: adapter.getConfig() };
        },
      },
    ];

    return {
      name: "opencode-giga-chat-adapter",
      version: "0.1.0",
      tools,
      cleanup: async () => {
        // Cleanup resources if needed
      },
    };
  };
}
