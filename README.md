# OpenCode GigaChat Adapter

An OpenCode plugin/adapter for integrating with GigaChat API.

## Installation

```bash
npm install opencode-giga-chat-adapter
```

## Usage

### As an OpenCode Plugin

Add to your `opencode.json`:

```json
{
  "plugins": [
    {
      "name": "opencode-giga-chat-adapter",
      "config": {
        "gigachat": {
          "apiKey": "${GIGACHAT_API_KEY}",
          "model": "GigaChat-Pro"
        }
      }
    }
  ]
}
```

### Programmatic Usage

```typescript
import { GigaChatAdapter } from "opencode-giga-chat-adapter";

const adapter = new GigaChatAdapter({
  apiKey: process.env.GIGACHAT_API_KEY!,
  model: "GigaChat-Pro",
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

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | required | GigaChat API key |
| `baseUrl` | string | `https://gigachat.devices.sberbank.ru/api/v1` | API endpoint |
| `model` | string | `GigaChat` | Model name |
| `timeout` | number | `30000` | Request timeout (ms) |
| `maxTokens` | number | `4096` | Max tokens in response |
| `temperature` | number | `0.7` | Temperature (0-2) |

## Available Tools

When used as an OpenCode plugin, the following tools are available:

- **gigachat_chat** - Send a message to GigaChat
- **gigachat_models** - List available models
- **gigachat_configure** - Update adapter configuration

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
