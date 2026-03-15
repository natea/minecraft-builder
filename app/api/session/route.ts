import { NextRequest, NextResponse } from "next/server";
import { 
  getTokenFromRequest, 
  getSessionFromRequest, 
  getUserIdFromToken, 
  getUserRolesFromToken, 
  parseJWTPayload, 
  isTokenExpired 
} from "@jazzmind/busibox-app/lib/authz";

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function extractEmail(payload: Record<string, unknown>, userId: string | null): string {
  const emailCandidates = [
    payload.email,
    payload.preferred_username,
    payload.upn,
    payload.unique_name,
    payload.username,
    payload.name,
  ];
  
  for (const candidate of emailCandidates) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      if (candidate.includes('@')) return candidate;
      if (!isUUID(candidate)) return candidate;
    }
  }
  
  if (userId) {
    if (isUUID(userId)) return 'User';
    return userId;
  }
  
  return 'Unknown User';
}

/**
 * GET /api/session
 *
 * Lightweight session endpoint for UI chrome (navbar/user dropdown).
 * Kept for backward compatibility -- the canonical session endpoint is
 * /api/auth/session which uses createSessionRouteHandlers.
 */
export async function GET(request: NextRequest) {
  try {
    const ssoSession = getSessionFromRequest(request);
    if (ssoSession) {
      const displayEmail = ssoSession.email && ssoSession.email.length > 0 && !isUUID(ssoSession.email)
        ? ssoSession.email
        : 'User';
      
      return NextResponse.json({
        user: {
          id: ssoSession.userId,
          email: displayEmail,
          status: 'ACTIVE',
          roles: ssoSession.roles,
          displayName: ssoSession.displayName,
          firstName: ssoSession.firstName,
          lastName: ssoSession.lastName,
          avatarUrl: ssoSession.avatarUrl,
          favoriteColor: ssoSession.favoriteColor,
        },
        isAuthenticated: true,
      });
    }
    
    const token = getTokenFromRequest(request);
    
    if (!token) {
      const testUserId = process.env.TEST_USER_ID;
      const testUserEmail = process.env.TEST_USER_EMAIL;
      
      if (testUserId && testUserEmail) {
        return NextResponse.json({
          user: {
            id: testUserId,
            email: testUserEmail,
            status: 'ACTIVE',
            roles: ['Admin', 'User'],
          },
          isAuthenticated: true,
        });
      }
      
      return NextResponse.json({ user: null, isAuthenticated: false });
    }

    if (isTokenExpired(token)) {
      return NextResponse.json({ user: null, isAuthenticated: false });
    }

    const payload = parseJWTPayload(token);
    if (!payload) {
      return NextResponse.json({ user: null, isAuthenticated: false });
    }

    const roles = getUserRolesFromToken(token);
    const userId = getUserIdFromToken(token) || 
      (typeof payload.sub === 'string' ? payload.sub : null) || 
      (typeof payload.user_id === 'string' ? payload.user_id : null) || 
      (typeof payload.userId === 'string' ? payload.userId : null);

    const email = extractEmail(payload, userId);

    return NextResponse.json({
      user: userId
        ? {
            id: String(userId),
            email,
            status: 'ACTIVE',
            roles,
            displayName: typeof payload.name === 'string' ? payload.name : undefined,
            firstName: typeof payload.given_name === 'string' ? payload.given_name : undefined,
            lastName: typeof payload.family_name === 'string' ? payload.family_name : undefined,
            avatarUrl: typeof payload.picture === 'string' ? payload.picture : undefined,
            favoriteColor: typeof payload.favorite_color === 'string' ? payload.favorite_color : undefined,
          }
        : null,
      isAuthenticated: Boolean(userId),
    });
  } catch (error) {
    console.error("[SESSION] Error:", error);
    return NextResponse.json({
      user: null,
      isAuthenticated: false,
      error: "Failed to get session",
    });
  }
}
