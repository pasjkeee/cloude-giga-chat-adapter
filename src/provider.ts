import type {
  LanguageModelV1,
  LanguageModelV1CallOptions,
  LanguageModelV1CallWarning,
  LanguageModelV1FinishReason,
  LanguageModelV1StreamPart,
} from "@ai-sdk/provider";
import type { GigaChatModel } from "./types.js";
import { GigaChatAuth, type GigaChatScope } from "./auth.js";

const DEFAULT_BASE_URL = "https://gigachat.devices.sberbank.ru/api/v1";

export interface GigaChatProviderSettings {
  /**
   * GigaChat API base URL
   * @default "https://gigachat.devices.sberbank.ru/api/v1"
   */
  baseURL?: string;

  /**
   * GigaChat credentials (Client ID:Client Secret or base64 encoded)
   * Used for OAuth token exchange
   */
  credentials?: string;

  /**
   * Pre-obtained access token (if you handle OAuth yourself)
   */
  accessToken?: string;

  /**
   * API scope
   * @default "GIGACHAT_API_PERS"
   */
  scope?: GigaChatScope;

  /**
   * Custom headers
   */
  headers?: Record<string, string>;
}

export interface GigaChatModelSettings {
  /**
   * Temperature (0-2)
   */
  temperature?: number;

  /**
   * Maximum tokens
   */
  maxTokens?: number;

  /**
   * Top P
   */
  topP?: number;
}

/**
 * GigaChat Language Model implementation for AI SDK
 */
class GigaChatLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1" as const;
  readonly provider = "gigachat";
  readonly defaultObjectGenerationMode = "json" as const;

  readonly modelId: GigaChatModel;
  private readonly settings: GigaChatProviderSettings;
  private readonly modelSettings: GigaChatModelSettings;
  private readonly auth: GigaChatAuth | null;

  constructor(
    modelId: GigaChatModel,
    settings: GigaChatProviderSettings,
    modelSettings: GigaChatModelSettings = {}
  ) {
    this.modelId = modelId;
    this.settings = settings;
    this.modelSettings = modelSettings;

    // Initialize OAuth if credentials provided
    if (settings.credentials) {
      this.auth = new GigaChatAuth({
        credentials: settings.credentials,
        scope: settings.scope,
      });
    } else {
      this.auth = null;
    }
  }

  private async getHeaders(): Promise<Record<string, string>> {
    let token: string;

    if (this.auth) {
      token = await this.auth.getToken();
    } else if (this.settings.accessToken) {
      token = this.settings.accessToken;
    } else {
      throw new Error("No credentials or access token provided");
    }

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...this.settings.headers,
    };
  }

  private getBaseURL(): string {
    return this.settings.baseURL ?? DEFAULT_BASE_URL;
  }

  private convertMessages(
    options: LanguageModelV1CallOptions
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    if (options.prompt) {
      for (const msg of options.prompt) {
        if (msg.role === "system") {
          messages.push({
            role: "system",
            content: typeof msg.content === "string" ? msg.content : "",
          });
        } else if (msg.role === "user") {
          let content = "";
          for (const part of msg.content) {
            if (part.type === "text") {
              content += part.text;
            }
          }
          messages.push({ role: "user", content });
        } else if (msg.role === "assistant") {
          let content = "";
          for (const part of msg.content) {
            if (part.type === "text") {
              content += part.text;
            }
          }
          messages.push({ role: "assistant", content });
        }
      }
    }

    return messages;
  }

  async doGenerate(
    options: LanguageModelV1CallOptions
  ): Promise<{
    text?: string;
    toolCalls?: Array<{
      toolCallType: "function";
      toolCallId: string;
      toolName: string;
      args: string;
    }>;
    finishReason: LanguageModelV1FinishReason;
    usage: { promptTokens: number; completionTokens: number };
    rawCall: { rawPrompt: unknown; rawSettings: Record<string, unknown> };
    rawResponse?: { headers?: Record<string, string> };
    warnings?: LanguageModelV1CallWarning[];
  }> {
    const messages = this.convertMessages(options);
    const headers = await this.getHeaders();

    const body = {
      model: this.modelId,
      messages,
      max_tokens: options.maxTokens ?? this.modelSettings.maxTokens,
      temperature: options.temperature ?? this.modelSettings.temperature,
      top_p: options.topP ?? this.modelSettings.topP,
    };

    const response = await fetch(`${this.getBaseURL()}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: options.abortSignal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GigaChat API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as {
      choices: Array<{
        message: { role: string; content: string };
        finish_reason: string;
      }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
      };
    };

    const choice = data.choices[0];
    const finishReason = this.mapFinishReason(choice?.finish_reason);

    return {
      text: choice?.message.content ?? "",
      finishReason,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
      },
      rawCall: {
        rawPrompt: messages,
        rawSettings: body,
      },
    };
  }

  async doStream(
    options: LanguageModelV1CallOptions
  ): Promise<{
    stream: ReadableStream<LanguageModelV1StreamPart>;
    rawCall: { rawPrompt: unknown; rawSettings: Record<string, unknown> };
    rawResponse?: { headers?: Record<string, string> };
    warnings?: LanguageModelV1CallWarning[];
  }> {
    const messages = this.convertMessages(options);
    const headers = await this.getHeaders();

    const body = {
      model: this.modelId,
      messages,
      max_tokens: options.maxTokens ?? this.modelSettings.maxTokens,
      temperature: options.temperature ?? this.modelSettings.temperature,
      top_p: options.topP ?? this.modelSettings.topP,
      stream: true,
    };

    const response = await fetch(`${this.getBaseURL()}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: options.abortSignal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GigaChat API error: ${response.status} - ${error}`);
    }

    const stream = this.createStream(response);

    return {
      stream,
      rawCall: {
        rawPrompt: messages,
        rawSettings: body,
      },
    };
  }

  private createStream(
    response: Response
  ): ReadableStream<LanguageModelV1StreamPart> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is null");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    return new ReadableStream<LanguageModelV1StreamPart>({
      pull: async (controller) => {
        const { done, value } = await reader.read();

        if (done) {
          controller.enqueue({
            type: "finish",
            finishReason: "stop",
            usage: { promptTokens: 0, completionTokens: 0 },
          });
          controller.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const data = trimmed.slice(6);
            if (data === "[DONE]") {
              controller.enqueue({
                type: "finish",
                finishReason: "stop",
                usage: { promptTokens: 0, completionTokens: 0 },
              });
              controller.close();
              return;
            }

            try {
              const parsed = JSON.parse(data) as {
                choices: Array<{
                  delta: { content?: string };
                  finish_reason?: string;
                }>;
              };

              const delta = parsed.choices[0]?.delta;
              if (delta?.content) {
                controller.enqueue({
                  type: "text-delta",
                  textDelta: delta.content,
                });
              }

              if (parsed.choices[0]?.finish_reason) {
                controller.enqueue({
                  type: "finish",
                  finishReason: this.mapFinishReason(
                    parsed.choices[0].finish_reason
                  ),
                  usage: { promptTokens: 0, completionTokens: 0 },
                });
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      },
    });
  }

  private mapFinishReason(reason?: string): LanguageModelV1FinishReason {
    switch (reason) {
      case "stop":
        return "stop";
      case "length":
        return "length";
      case "content_filter":
        return "content-filter";
      case "tool_calls":
        return "tool-calls";
      default:
        return "stop";
    }
  }
}

/**
 * Create a GigaChat provider for AI SDK / OpenCode
 */
export function createGigaChat(settings: GigaChatProviderSettings = {}) {
  const createModel = (
    modelId: GigaChatModel,
    modelSettings: GigaChatModelSettings = {}
  ) => {
    return new GigaChatLanguageModel(modelId, settings, modelSettings);
  };

  const provider = (modelId: GigaChatModel) => createModel(modelId);

  provider.chat = createModel;
  provider.languageModel = createModel;

  return provider;
}

/**
 * Default GigaChat provider instance
 * Uses GIGACHAT_CREDENTIALS environment variable for OAuth
 */
export const gigachat = createGigaChat({
  credentials: process.env.GIGACHAT_CREDENTIALS || process.env.GIGACHAT_API_KEY,
  scope: (process.env.GIGACHAT_SCOPE as GigaChatScope) || "GIGACHAT_API_PERS",
});
