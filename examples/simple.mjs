/**
 * Simple example: Using the GigaChat provider
 *
 * Run with:
 *   node examples/simple.mjs
 *
 * Make sure to build first:
 *   npm run build
 *
 * Environment variables:
 *   GIGACHAT_CREDENTIALS - Your ClientID:ClientSecret
 *   GIGACHAT_VERIFY_SSL  - Set to "false" to skip SSL verification
 */

import { createGigaChat } from "../dist/index.js";

const credentials = process.env.GIGACHAT_CREDENTIALS;

if (!credentials) {
  console.error("Set GIGACHAT_CREDENTIALS environment variable (ClientID:ClientSecret)");
  process.exit(1);
}

// Create provider with OAuth
const gigachat = createGigaChat({
  credentials,
  verifySslCerts: process.env.GIGACHAT_VERIFY_SSL !== "false",
});

// Get model
const model = gigachat("GigaChat-2");

console.log("Provider:", model.provider);
console.log("Model:", model.modelId);
console.log("\nSending request...\n");

// Use doGenerate directly
const result = await model.doGenerate({
  inputFormat: "messages",
  mode: { type: "regular" },
  prompt: [
    { role: "user", content: [{ type: "text", text: "Hello! What model are you?" }] },
  ],
});

console.log("Response:", result.text);
console.log("Usage:", result.usage);
