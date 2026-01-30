import type {
  GigaChatConfig,
  GigaChatMessage,
  GigaChatResponse,
  GigaChatStreamChunk,
} from "./types.js";

const DEFAULT_BASE_URL = "https://gigachat.devices.sberbank.ru/api/v1";
const DEFAULT_MODEL = "GigaChat-2";
const DEFAULT_TIMEOUT = 30000;

/**
 * GigaChat API Adapter
 *
 * Provides methods for interacting with GigaChat API,
 * compatible with OpenCode's provider interface.
 */
export class GigaChatAdapter {
  private config: Required<GigaChatConfig>;

  constructor(config: GigaChatConfig) {
    this.config = {
      baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
      apiKey: config.apiKey,
      model: config.model ?? DEFAULT_MODEL,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      maxTokens: config.maxTokens ?? 4096,
      temperature: config.temperature ?? 0.7,
    };
  }

  /**
   * Get default headers for API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.config.apiKey}`,
    };
  }

  /**
   * Send a chat completion request
   */
  async chat(messages: GigaChatMessage[]): Promise<GigaChatResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.config.model,
          messages,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`GigaChat API error: ${response.status} - ${error}`);
      }

      return (await response.json()) as GigaChatResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Send a streaming chat completion request
   */
  async *chatStream(
    messages: GigaChatMessage[]
  ): AsyncGenerator<GigaChatStreamChunk, void, unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.config.model,
          messages,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`GigaChat API error: ${response.status} - ${error}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const data = trimmed.slice(6);
            if (data === "[DONE]") return;
            try {
              yield JSON.parse(data) as GigaChatStreamChunk;
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get available models
   */
  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.config.baseUrl}/models`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }

    const data = (await response.json()) as { data: { id: string }[] };
    return data.data.map((m) => m.id);
  }

  /**
   * Update adapter configuration
   */
  updateConfig(config: Partial<GigaChatConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<GigaChatConfig>> {
    return { ...this.config };
  }
}
