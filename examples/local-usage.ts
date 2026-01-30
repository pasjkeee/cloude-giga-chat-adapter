/**
 * Example: Using the adapter from local file system (without npm install)
 *
 * Run with:
 *   npx tsx examples/local-usage.ts
 *
 * Or after building:
 *   node examples/local-usage.js
 */

import { GigaChatAdapter } from "../dist/index.js";

// Get API key from environment
const apiKey = process.env.GIGACHAT_API_KEY;

if (!apiKey) {
  console.error("Error: GIGACHAT_API_KEY environment variable is required");
  console.error("Usage: GIGACHAT_API_KEY=your_key npx tsx examples/local-usage.ts");
  process.exit(1);
}

// Create adapter with default model (GigaChat-2)
const adapter = new GigaChatAdapter({
  apiKey,
});

console.log("Using config:", adapter.getConfig());

// Example: Send a chat message
async function chat() {
  console.log("\n--- Chat Example ---");

  const response = await adapter.chat([
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello! What model are you?" },
  ]);

  console.log("Response:", response.choices[0]?.message.content);
  console.log("Usage:", response.usage);
}

// Example: Streaming response
async function streamChat() {
  console.log("\n--- Streaming Example ---");

  process.stdout.write("Response: ");

  for await (const chunk of adapter.chatStream([
    { role: "user", content: "Count from 1 to 5." },
  ])) {
    const content = chunk.choices[0]?.delta.content;
    if (content) {
      process.stdout.write(content);
    }
  }

  console.log("\n");
}

// Example: List available models
async function listModels() {
  console.log("\n--- Available Models ---");

  const models = await adapter.listModels();
  console.log("Models:", models);
}

// Example: Use a different model
async function useMaxModel() {
  console.log("\n--- Using GigaChat-2-Max ---");

  const maxAdapter = new GigaChatAdapter({
    apiKey,
    model: "GigaChat-2-Max",
    temperature: 0.5,
  });

  const response = await maxAdapter.chat([
    { role: "user", content: "What is 2 + 2?" },
  ]);

  console.log("Response:", response.choices[0]?.message.content);
}

// Run examples
async function main() {
  try {
    await chat();
    await streamChat();
    await listModels();
    await useMaxModel();
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
