import { NextRequest, NextResponse } from "next/server";
import { requireAuthWithTokenExchange } from "@/lib/auth-middleware";

const AGENT_API_URL =
  process.env.AGENT_API_URL || process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000";

/**
 * Agent API proxy - forwards requests to agent-api with proper token exchange.
 *
 * Handles all HTTP methods, streaming SSE responses, and query parameter forwarding.
 * Client code calls /api/agent/<path> and this route proxies to AGENT_API_URL/<path>.
 */
async function forward(request: NextRequest, method: string, path: string[]) {
  const auth = await requireAuthWithTokenExchange(request, "agent-api");
  if (auth instanceof NextResponse) return auth;

  const target = new URL(`${AGENT_API_URL}/${path.join("/")}`);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.set(key, value));

  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.apiToken}`,
  };
  let body: string | undefined;
  if (method !== "GET" && method !== "HEAD") {
    const contentType = request.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(await request.json());
    } else if (contentType) {
      headers["Content-Type"] = contentType;
      body = await request.text();
    }
  }

  const response = await fetch(target.toString(), { method, headers, body });
  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json({ error: text || "Agent API error" }, { status: response.status });
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream")) {
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  if (response.status === 204) {
    return new Response(null, { status: 204 });
  }
  return NextResponse.json(await response.json(), { status: response.status });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return forward(request, "GET", path);
}
export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return forward(request, "POST", path);
}
export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return forward(request, "PUT", path);
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return forward(request, "PATCH", path);
}
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return forward(request, "DELETE", path);
}
