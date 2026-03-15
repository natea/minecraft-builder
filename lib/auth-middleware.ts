/**
 * Authentication Middleware for Busibox Apps
 *
 * Zero Trust Architecture:
 * - Uses SSO token (session JWT) from Busibox Portal for token exchange
 * - NO client credentials required
 * - The session JWT cryptographically proves user identity
 */

import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@jazzmind/busibox-app/lib/authz";
import { getApiToken } from "./authz-client";

// Default audience for API calls - override in your app
const DEFAULT_AUDIENCE = (process.env.DEFAULT_API_AUDIENCE ||
  "backend-api") as "agent-api" | "data-api" | "search-api";

export interface AuthenticatedRequest {
  ssoToken: string | null;
  apiToken: string;
  isTestUser?: boolean;
}

/**
 * Require authentication and exchange SSO token for API token (Zero Trust)
 *
 * This middleware:
 * 1. Extracts the SSO token (session JWT) from the request
 * 2. If no token but TEST_SESSION_JWT is set, uses test credentials
 * 3. Exchanges the session JWT for an API access token (Zero Trust)
 * 4. Returns tokens for use in the route handler
 *
 * @param request - Next.js request
 * @param audience - Optional target API audience (defaults to DEFAULT_API_AUDIENCE)
 * @param scopes - Optional scopes to request
 * @returns Authenticated request with tokens, or error response
 */
export async function requireAuthWithTokenExchange(
  request: NextRequest,
  audience?: "agent-api" | "data-api" | "search-api",
  scopes?: string[]
): Promise<AuthenticatedRequest | NextResponse> {
  try {
    const ssoToken = getTokenFromRequest(request);
    const targetAudience = audience || DEFAULT_AUDIENCE;

    // If no SSO token, check for test session JWT (local dev only)
    if (!ssoToken) {
      const testSessionJwt = process.env.TEST_SESSION_JWT;

      if (testSessionJwt) {
        console.log(
          "[AUTH] No SSO token found, using TEST_SESSION_JWT for local development"
        );

        // Use the test session JWT for Zero Trust exchange
        const apiToken = await getApiToken(testSessionJwt, targetAudience, scopes);

        return {
          ssoToken: testSessionJwt,
          apiToken,
          isTestUser: true,
        };
      }

      return NextResponse.json(
        {
          error: "Authentication required",
          message:
            "Please log in through the Busibox Portal and try again. For local testing, set TEST_SESSION_JWT to a valid session JWT.",
        },
        { status: 401 }
      );
    }

    // Exchange SSO token (session JWT) for API token using Zero Trust
    const apiToken = await getApiToken(ssoToken, targetAudience, scopes);

    return {
      ssoToken,
      apiToken,
      isTestUser: false,
    };
  } catch (error: unknown) {
    console.error("[AUTH] Token exchange failed:", error);

    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: "Authentication failed",
        message:
          "Failed to authenticate with the backend service. Please return to the Busibox Portal and log in again.",
        details: errorMessage,
      },
      { status: 401 }
    );
  }
}

/**
 * Optional authentication - returns tokens if available, null if not
 *
 * Use this for endpoints that work with or without authentication.
 *
 * @param request - Next.js request
 * @param audience - Optional target API audience
 * @param scopes - Optional scopes to request
 * @returns Authenticated request with tokens, or null if not authenticated
 */
export async function optionalAuth(
  request: NextRequest,
  audience?: "agent-api" | "data-api" | "search-api",
  scopes?: string[]
): Promise<AuthenticatedRequest | null> {
  try {
    const ssoToken = getTokenFromRequest(request);
    const targetAudience = audience || DEFAULT_AUDIENCE;

    // Try test session JWT if no SSO token
    if (!ssoToken) {
      const testSessionJwt = process.env.TEST_SESSION_JWT;

      if (testSessionJwt) {
        const apiToken = await getApiToken(testSessionJwt, targetAudience, scopes);
        return {
          ssoToken: testSessionJwt,
          apiToken,
          isTestUser: true,
        };
      }

      return null;
    }

    // Exchange SSO token for API token using Zero Trust
    const apiToken = await getApiToken(ssoToken, targetAudience, scopes);

    return {
      ssoToken,
      apiToken,
      isTestUser: false,
    };
  } catch (error: unknown) {
    console.error("[AUTH] Optional auth failed:", error);
    return null;
  }
}
