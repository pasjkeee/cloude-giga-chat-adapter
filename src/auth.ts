/**
 * GigaChat OAuth 2.0 Authentication
 *
 * GigaChat uses OAuth 2.0 with access tokens that expire after 30 minutes.
 * This module handles token acquisition and automatic refresh.
 *
 * Note: GigaChat uses Russian certificates. You may need to:
 * 1. Set NODE_TLS_REJECT_UNAUTHORIZED=0 (for testing only!)
 * 2. Or download Russian Root CA from gosuslugi.ru
 */

import https from "node:https";

const OAUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
const TOKEN_LIFETIME_MS = 30 * 60 * 1000; // 30 minutes
const TOKEN_REFRESH_BUFFER_MS = 60 * 1000; // Refresh 1 minute before expiry

export type GigaChatScope =
  | "GIGACHAT_API_PERS" // For individuals
  | "GIGACHAT_API_B2B" // For business (paid packages)
  | "GIGACHAT_API_CORP"; // For business (pay-as-you-go)

export interface GigaChatAuthConfig {
  /**
   * Authorization credentials (Client ID:Client Secret in base64)
   * Or just the raw credentials string to be encoded
   */
  credentials: string;

  /**
   * API scope
   * @default "GIGACHAT_API_PERS"
   */
  scope?: GigaChatScope;

  /**
   * Skip SSL certificate verification (for Russian certificates)
   * WARNING: Only use for testing!
   * @default false
   */
  verifySslCerts?: boolean;
}

interface TokenResponse {
  access_token: string;
  expires_at: number;
}

/**
 * GigaChat Token Manager
 * Handles OAuth token acquisition and automatic refresh
 */
export class GigaChatAuth {
  private config: Required<GigaChatAuthConfig>;
  private accessToken: string | null = null;
  private expiresAt: number = 0;

  constructor(config: GigaChatAuthConfig) {
    this.config = {
      scope: "GIGACHAT_API_PERS",
      verifySslCerts: true,
      ...config,
    };
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getToken(): Promise<string> {
    // Check if current token is still valid
    if (this.accessToken && Date.now() < this.expiresAt - TOKEN_REFRESH_BUFFER_MS) {
      return this.accessToken;
    }

    // Refresh the token
    await this.refreshToken();

    if (!this.accessToken) {
      throw new Error("Failed to obtain GigaChat access token");
    }

    return this.accessToken;
  }

  /**
   * Refresh the access token using https module (for SSL control)
   */
  private async refreshToken(): Promise<void> {
    const credentials = this.encodeCredentials(this.config.credentials);
    const body = `scope=${this.config.scope}`;

    const data = await this.makeRequest(OAUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Authorization: `Basic ${credentials}`,
        RqUID: this.generateRqUID(),
        "Content-Length": Buffer.byteLength(body).toString(),
      },
      body,
    });

    const tokenData = JSON.parse(data) as TokenResponse;

    this.accessToken = tokenData.access_token;
    this.expiresAt = tokenData.expires_at
      ? tokenData.expires_at * 1000
      : Date.now() + TOKEN_LIFETIME_MS;
  }

  /**
   * Make HTTPS request with SSL certificate control
   */
  private makeRequest(
    url: string,
    options: { method: string; headers: Record<string, string>; body?: string }
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);

      const req = https.request(
        {
          hostname: urlObj.hostname,
          port: urlObj.port || 443,
          path: urlObj.pathname,
          method: options.method,
          headers: options.headers,
          rejectUnauthorized: this.config.verifySslCerts,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(data);
            } else {
              reject(new Error(`GigaChat OAuth error: ${res.statusCode} - ${data}`));
            }
          });
        }
      );

      req.on("error", (err) => {
        reject(new Error(`GigaChat OAuth request failed: ${err.message}`));
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  /**
   * Encode credentials to base64 if not already encoded
   */
  private encodeCredentials(credentials: string): string {
    if (/^[A-Za-z0-9+/=]+$/.test(credentials) && !credentials.includes(":")) {
      return credentials;
    }
    return Buffer.from(credentials).toString("base64");
  }

  /**
   * Generate unique request ID
   */
  private generateRqUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Check if token is valid
   */
  isTokenValid(): boolean {
    return this.accessToken !== null && Date.now() < this.expiresAt - TOKEN_REFRESH_BUFFER_MS;
  }

  /**
   * Force token refresh
   */
  async forceRefresh(): Promise<string> {
    this.accessToken = null;
    this.expiresAt = 0;
    return this.getToken();
  }
}

/**
 * Create auth manager from environment variables
 */
export function createAuthFromEnv(): GigaChatAuth {
  const credentials = process.env.GIGACHAT_CREDENTIALS || process.env.GIGACHAT_API_KEY;

  if (!credentials) {
    throw new Error(
      "GIGACHAT_CREDENTIALS or GIGACHAT_API_KEY environment variable is required"
    );
  }

  const scope = (process.env.GIGACHAT_SCOPE as GigaChatScope) || "GIGACHAT_API_PERS";
  const verifySsl = process.env.GIGACHAT_VERIFY_SSL !== "false";

  return new GigaChatAuth({
    credentials,
    scope,
    verifySslCerts: verifySsl,
  });
}
