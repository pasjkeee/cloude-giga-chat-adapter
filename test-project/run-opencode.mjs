#!/usr/bin/env node
/**
 * Helper script to run OpenCode with GigaChat
 *
 * This script:
 * 1. Gets an OAuth access token from GigaChat
 * 2. Sets it as GIGACHAT_ACCESS_TOKEN environment variable
 * 3. Runs OpenCode
 *
 * Usage:
 *   GIGACHAT_CREDENTIALS=your_auth_key GIGACHAT_VERIFY_SSL=false node run-opencode.mjs
 */

import https from "node:https";
import { spawn } from "node:child_process";

const OAUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";

async function getAccessToken() {
  const credentials = process.env.GIGACHAT_CREDENTIALS;

  if (!credentials) {
    console.error("Error: GIGACHAT_CREDENTIALS environment variable is required");
    console.error("Set it to your Authorization Key from developers.sber.ru");
    process.exit(1);
  }

  const scope = process.env.GIGACHAT_SCOPE || "GIGACHAT_API_PERS";
  const verifySsl = process.env.GIGACHAT_VERIFY_SSL !== "false";

  // Encode credentials if needed
  let encodedCredentials = credentials;
  if (credentials.includes(":")) {
    encodedCredentials = Buffer.from(credentials).toString("base64");
  }

  console.log("Getting GigaChat access token...");

  return new Promise((resolve, reject) => {
    const body = `scope=${scope}`;
    const urlObj = new URL(OAUTH_URL);

    const req = https.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          Authorization: `Basic ${encodedCredentials}`,
          RqUID: crypto.randomUUID(),
          "Content-Length": Buffer.byteLength(body),
        },
        rejectUnauthorized: verifySsl,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const json = JSON.parse(data);
              resolve(json.access_token);
            } catch (e) {
              reject(new Error(`Failed to parse token response: ${data}`));
            }
          } else {
            reject(new Error(`OAuth error: ${res.statusCode} - ${data}`));
          }
        });
      }
    );

    req.on("error", (err) => {
      reject(new Error(`OAuth request failed: ${err.message}`));
    });

    req.write(body);
    req.end();
  });
}

async function main() {
  try {
    const accessToken = await getAccessToken();
    console.log("Got access token (expires in 30 minutes)");
    console.log("Starting OpenCode...\n");

    // Run opencode with the access token
    const opencode = spawn("npx", ["opencode"], {
      stdio: "inherit",
      env: {
        ...process.env,
        GIGACHAT_ACCESS_TOKEN: accessToken,
      },
    });

    opencode.on("close", (code) => {
      process.exit(code || 0);
    });
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
