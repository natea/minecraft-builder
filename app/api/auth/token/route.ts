import { NextRequest, NextResponse } from "next/server";
import { requireAuthWithTokenExchange } from "@/lib/auth-middleware";

/**
 * GET /api/auth/token
 *
 * Returns an agent-api token for client-side chat components
 * (e.g., SimpleChatInterface from @jazzmind/busibox-app).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuthWithTokenExchange(request, "agent-api");
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ token: auth.apiToken });
}
