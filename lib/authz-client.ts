/**
 * AuthZ Client for Busibox Apps
 *
 * Zero Trust Authentication Architecture:
 * - Uses busibox-session cookie (RS256 JWT from authz) as subject_token
 * - This is the actual authz session JWT, shared across all busibox apps
 * - NO client credentials required for user operations
 * - The session JWT cryptographically proves user identity
 * - Can be exchanged for downstream service tokens via authz token exchange
 *
 * This module uses the shared Zero Trust functions from busibox-app.
 */

import {
  exchangeTokenZeroTrust,
  getAuthHeaderZeroTrust,
  type AuthzAudience as SharedAuthzAudience,
} from "@jazzmind/busibox-app";

// Re-export types
export type AuthzAudience = SharedAuthzAudience;

export interface AuthzTokenResponse {
  accessToken: string;
  tokenType: "bearer";
  expiresIn: number;
  scope: string;
}

function getAuthzBaseUrl(): string {
  return process.env.AUTHZ_BASE_URL || "http://authz-api:8010";
}

/**
 * Exchange session JWT for an authz access token (Zero Trust)
 *
 * Uses the busibox-session cookie value (RS256 JWT from authz) as subject_token.
 * No client credentials required - the session JWT cryptographically proves user identity.
 *
 * @param sessionJwt - The session JWT from busibox-session cookie
 * @param audience - The target service (e.g., 'agent-api', 'data-api')
 * @param scopes - Optional scopes to request
 * @returns Authz token response
 */
export async function exchangeForAuthzToken(
  sessionJwt: string,
  audience: AuthzAudience,
  scopes?: string[]
): Promise<AuthzTokenResponse> {
  const appName = process.env.APP_NAME || "busibox-app";

  const result = await exchangeTokenZeroTrust(
    {
      sessionJwt,
      audience,
      scopes,
      purpose: appName,
    },
    {
      authzBaseUrl: getAuthzBaseUrl(),
      verbose: process.env.VERBOSE_AUTHZ_LOGGING === "true",
    }
  );

  return {
    accessToken: result.accessToken,
    tokenType: result.tokenType,
    expiresIn: result.expiresIn,
    scope: result.scope,
  };
}

/**
 * Get an authz token for a specific API (Zero Trust)
 *
 * @param sessionJwt - The session JWT from busibox-session cookie
 * @param audience - The target API audience
 * @param scopes - Optional scopes to request
 * @returns Bearer token string for Authorization header
 */
export async function getApiToken(
  sessionJwt: string,
  audience: AuthzAudience,
  scopes?: string[]
): Promise<string> {
  const result = await exchangeForAuthzToken(sessionJwt, audience, scopes);
  return result.accessToken;
}

/**
 * Get an authz token for test user (local development only)
 *
 * In Zero Trust mode, this still requires a valid session JWT.
 * For local testing, use the TEST_SESSION_JWT environment variable.
 *
 * @param audience - The target API audience
 * @param scopes - Optional scopes to request
 * @returns Bearer token string for Authorization header
 */
export async function getApiTokenForTestUser(
  audience: AuthzAudience,
  scopes?: string[]
): Promise<string> {
  const testSessionJwt = process.env.TEST_SESSION_JWT;

  if (!testSessionJwt) {
    throw new Error(
      "TEST_SESSION_JWT not configured. In Zero Trust mode, a valid session JWT is required even for test users. " +
        "Set TEST_SESSION_JWT to a valid session JWT from the authz service."
    );
  }

  const result = await exchangeForAuthzToken(testSessionJwt, audience, scopes);
  return result.accessToken;
}

/**
 * Get authorization header using Zero Trust exchange
 *
 * @param sessionJwt - The session JWT from busibox-session cookie
 * @param audience - The target API audience
 * @param scopes - Optional scopes to request
 */
export async function getAuthorizationHeader(
  sessionJwt: string,
  audience: AuthzAudience,
  scopes?: string[]
): Promise<string> {
  const appName = process.env.APP_NAME || "busibox-app";

  return getAuthHeaderZeroTrust(
    {
      sessionJwt,
      audience,
      scopes,
      purpose: appName,
    },
    {
      authzBaseUrl: getAuthzBaseUrl(),
      verbose: process.env.VERBOSE_AUTHZ_LOGGING === "true",
    }
  );
}
