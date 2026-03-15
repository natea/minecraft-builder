import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/logout
 *
 * Logout redirect target for @jazzmind/busibox-app SessionProvider.
 * Clears app cookies and redirects to portal login.
 */
export async function GET(request: NextRequest) {
  const appName = process.env.APP_NAME || "app";
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/";
  const portalUrl =
    process.env.NEXT_PUBLIC_BUSIBOX_PORTAL_URL ||
    process.env.NEXT_PUBLIC_AI_PORTAL_URL ||
    "";
  const portalBaseUrl = portalUrl.replace(/\/+$/, "");
  const loginUrl = portalBaseUrl
    ? `${portalBaseUrl.endsWith("/portal") ? portalBaseUrl : `${portalBaseUrl}/portal`}/login`
    : "/portal/login";

  const response = NextResponse.redirect(loginUrl);

  response.cookies.set(`${appName}-session`, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: basePath,
  });

  response.cookies.set("auth_token", "", {
    maxAge: 0,
    path: basePath,
  });

  return response;
}
