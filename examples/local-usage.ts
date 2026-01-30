/**
 * Example: Using the GigaChat provider from local file system
 *
 * Run with:
 *   npx tsx examples/local-usage.ts
 *
 * Or after building:
 *   node --experimental-strip-types examples/local-usage.ts
 *
 * Environment variables:
 *   GIGACHAT_CREDENTIALS - Your ClientID:ClientSecret
 *   GIGACHAT_VERIFY_SSL  - Set to "false" to skip SSL verification
 *   GIGACHAT_SCOPE       - API scope (default: GIGACHAT_API_PERS)
 */

import { createGigaChat } from "../dist/index.js";

// Get credentials from environment
const credentials = process.env.GIGACHAT_CREDENTIALS;

if (!credentials) {
  console.error("Error: GIGACHAT_CREDENTIALS environment variable is required");
  console.error("Format: ClientID:ClientSecret");
  console.error("");
  console.error("Usage:");
  console.error("  GIGACHAT_CREDENTIALS=id:secret npx tsx examples/local-usage.ts");
  console.error("");
  console.error("To skip SSL verification (for Russian certificates):");
  console.error("  GIGACHAT_CREDENTIALS=id:secret GIGACHAT_VERIFY_SSL=false npx tsx examples/local-usage.ts");
  process.exit(1);
}

// Create provider with OAuth authentication
const gigachat = createGigaChat({
  credentials,
  scope: (process.env.GIGACHAT_SCOPE as "GIGACHAT_API_PERS" | "GIGACHAT_API_B2B" | "GIGACHAT_API_CORP") || "GIGACHAT_API_PERS",
  verifySslCerts: process.env.GIGACHAT_VERIFY_SSL !== "false",
});

// Example: Simple chat
async function chat() {
  console.log("\n--- Chat Example (GigaChat-2) ---");

  const model = gigachat("GigaChat-2");

  const result = await model.doGenerate({
    inputFormat: "messages",
    mode: { type: "regular" },
    prompt: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: [{ type: "text", text: "Hello! What model are you?" }] },
    ],
  });

  console.log("Response:", result.text);
  console.log("Usage:", result.usage);
}

// Example: Streaming response
async function streamChat() {
  console.log("\n--- Streaming Example ---");

  const model = gigachat("GigaChat-2");

  const { stream } = await model.doStream({
    inputFormat: "messages",
    mode: { type: "regular" },
    prompt: [
      { role: "user", content: [{ type: "text", text: "Count from 1 to 5 slowly." }] },
    ],
  });

  process.stdout.write("Response: ");

  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    if (value.type === "text-delta") {
      process.stdout.write(value.textDelta);
    }
  }

  console.log("\n");
}

// Example: Use a different model
async function useMaxModel() {
  console.log("\n--- Using GigaChat-2-Max ---");

  const model = gigachat("GigaChat-2-Max");

  const result = await model.doGenerate({
    inputFormat: "messages",
    mode: { type: "regular" },
    prompt: [
      { role: "user", content: [{ type: "text", text: "What is the capital of France?" }] },
    ],
    temperature: 0.5,
    maxTokens: 100,
  });

  console.log("Response:", result.text);
}

// Run examples
async function main() {
  try {
    await chat();
    await streamChat();
    await useMaxModel();
    console.log("\n--- All examples completed successfully! ---");
  } catch (error) {
    console.error("\nError:", error);
    process.exit(1);
  }
}

main();
