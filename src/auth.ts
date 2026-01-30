/**
 * GigaChat OAuth 2.0 Authentication
 *
 * GigaChat uses OAuth 2.0 with access tokens that expire after 30 minutes.
 * This module handles token acquisition and automatic refresh.
 */

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
   * @default false
   */
  insecure?: boolean;
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
  private config: GigaChatAuthConfig;
  private accessToken: string | null = null;
  private expiresAt: number = 0;

  constructor(config: GigaChatAuthConfig) {
    this.config = {
      scope: "GIGACHAT_API_PERS",
      insecure: false,
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
   * Refresh the access token
   */
  private async refreshToken(): Promise<void> {
    const credentials = this.encodeCredentials(this.config.credentials);

    const response = await fetch(OAUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Authorization: `Basic ${credentials}`,
        RqUID: this.generateRqUID(),
      },
      body: `scope=${this.config.scope}`,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GigaChat OAuth error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as TokenResponse;

    this.accessToken = data.access_token;
    // Use expires_at from response or calculate from now
    this.expiresAt = data.expires_at
      ? data.expires_at * 1000 // Convert to milliseconds
      : Date.now() + TOKEN_LIFETIME_MS;
  }

  /**
   * Encode credentials to base64 if not already encoded
   */
  private encodeCredentials(credentials: string): string {
    // Check if already base64 encoded (no colons, valid base64 chars)
    if (/^[A-Za-z0-9+/=]+$/.test(credentials) && !credentials.includes(":")) {
      return credentials;
    }

    // Encode Client ID:Client Secret to base64
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

  return new GigaChatAuth({
    credentials,
    scope,
  });
}
