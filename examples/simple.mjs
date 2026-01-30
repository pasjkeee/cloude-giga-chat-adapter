/**
 * Simple example: Using the adapter from local file system
 *
 * Run with:
 *   node examples/simple.mjs
 *
 * Make sure to build first:
 *   npm run build
 */

import { GigaChatAdapter } from "../dist/index.js";

const apiKey = process.env.GIGACHAT_API_KEY;

if (!apiKey) {
  console.error("Set GIGACHAT_API_KEY environment variable");
  process.exit(1);
}

const adapter = new GigaChatAdapter({
  apiKey,
  model: "GigaChat-2", // light version (default)
});

const response = await adapter.chat([
  { role: "user", content: "Hello!" },
]);

console.log(response.choices[0].message.content);
