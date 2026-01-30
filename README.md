# OpenCode GigaChat Adapter

An OpenCode plugin/adapter for integrating with GigaChat API.

## Installation

```bash
npm install opencode-giga-chat-adapter
```

### Local Development (without npm install)

Clone and build the adapter locally:

```bash
git clone <repo-url>
cd cloude-giga-chat-adapter
npm install
npm run build
```

Then import directly from the file system:

```typescript
// From your project
import { GigaChatAdapter } from "./path/to/cloude-giga-chat-adapter/dist/index.js";
```

## GigaChat Authentication

**Important:** GigaChat uses OAuth 2.0 authentication, not simple API keys. You need:

1. **Client credentials** from [developers.sber.ru](https://developers.sber.ru)
2. Format: `ClientID:ClientSecret` (will be base64 encoded automatically)
3. Access tokens expire after **30 minutes** (auto-refreshed by this adapter)

### Environment Variables

```bash
# Your GigaChat credentials (ClientID:ClientSecret)
export GIGACHAT_CREDENTIALS="your_client_id:your_client_secret"

# Optional: API scope (default: GIGACHAT_API_PERS)
# - GIGACHAT_API_PERS - for individuals
# - GIGACHAT_API_B2B - for business (paid packages)
# - GIGACHAT_API_CORP - for business (pay-as-you-go)
export GIGACHAT_SCOPE="GIGACHAT_API_PERS"
```

## Usage

### Programmatic Usage (Recommended)

Since OpenCode doesn't support local providers, use the adapter directly:

```typescript
import { createGigaChat } from "opencode-giga-chat-adapter";

const gigachat = createGigaChat({
  credentials: process.env.GIGACHAT_CREDENTIALS,
  scope: "GIGACHAT_API_PERS",
});

const model = gigachat("GigaChat-2");
```

### With AI SDK

```typescript
import { generateText } from "ai";
import { createGigaChat } from "opencode-giga-chat-adapter";

const gigachat = createGigaChat({
  credentials: process.env.GIGACHAT_CREDENTIALS,
});

const { text } = await generateText({
  model: gigachat("GigaChat-2"),
  prompt: "Hello!",
});
```

### OpenCode Configuration (Limited)

> **Note:** OpenCode currently doesn't support local file providers or OAuth.
> The `@ai-sdk/openai-compatible` won't work because GigaChat uses OAuth, not API keys.

If you have a pre-obtained access token, you can try:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "gigachat": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "GigaChat",
      "options": {
        "baseURL": "https://gigachat.devices.sberbank.ru/api/v1",
        "apiKey": "{env:GIGACHAT_ACCESS_TOKEN}"
      },
      "models": {
        "GigaChat-2": { "name": "GigaChat-2 (Light)" }
      }
    }
  },
  "model": "gigachat/GigaChat-2"
}
```

But the token expires in 30 minutes!

### Programmatic Usage

```typescript
import { GigaChatAdapter } from "opencode-giga-chat-adapter";

// Uses GigaChat-2 (light) by default
const adapter = new GigaChatAdapter({
  apiKey: process.env.GIGACHAT_API_KEY!,
});

// Or specify a different model
const adapterMax = new GigaChatAdapter({
  apiKey: process.env.GIGACHAT_API_KEY!,
  model: "GigaChat-2-Max",
});

// Send a chat message
const response = await adapter.chat([
  { role: "user", content: "Hello, how are you?" }
]);

console.log(response.choices[0].message.content);

// Streaming
for await (const chunk of adapter.chatStream([
  { role: "user", content: "Tell me a story" }
])) {
  process.stdout.write(chunk.choices[0]?.delta.content ?? "");
}
```

## Running with OpenCode

### Quick Start

```bash
# 1. Copy opencode.json to your project (or use the one in this repo)
cp /home/user/cloude-giga-chat-adapter/opencode.json ./

# 2. Set your API key
export GIGACHAT_API_KEY=your_api_key_here

# 3. Run opencode (auto-detects opencode.json)
opencode
```

### Using in Any Project

1. Copy `opencode.json` to your project directory
2. Set the `GIGACHAT_API_KEY` environment variable
3. Run opencode:

```bash
export GIGACHAT_API_KEY=your_key
opencode
```

### Select Model via CLI

```bash
# Use GigaChat-2-Max model
opencode -m gigachat/GigaChat-2-Max

# Use GigaChat-2 (default light model)
opencode -m gigachat/GigaChat-2
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | required | GigaChat API key |
| `baseUrl` | string | `https://gigachat.devices.sberbank.ru/api/v1` | API endpoint |
| `model` | string | `GigaChat-2` | Model name (see below) |
| `timeout` | number | `30000` | Request timeout (ms) |
| `maxTokens` | number | `4096` | Max tokens in response |
| `temperature` | number | `0.7` | Temperature (0-2) |

### Available Models

| Model | Description |
|-------|-------------|
| `GigaChat-2` | Light, fast model (default) |
| `GigaChat-2-Max` | Most capable model |
| `GigaChat-2-Plus` | Balanced performance |
| `GigaChat` | Legacy light model |
| `GigaChat-Plus` | Legacy balanced model |
| `GigaChat-Pro` | Legacy pro model |

## Available Tools

When used as an OpenCode plugin, the following tools are available:

- **gigachat_chat** - Send a message to GigaChat
- **gigachat_models** - List available models
- **gigachat_configure** - Update adapter configuration

## Examples

Run examples from the local file system:

```bash
# Build first
npm run build

# Simple example (JavaScript)
GIGACHAT_API_KEY=your_key node examples/simple.mjs

# Full example with TypeScript (requires tsx)
GIGACHAT_API_KEY=your_key npx tsx examples/local-usage.ts
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint
```

## License

MIT
