import { NextRequest, NextResponse } from "next/server";
import { requireAuthWithTokenExchange } from "@/lib/auth-middleware";
import { ensureDataDocuments, DOCUMENTS } from "@/lib/data-api-client";

/**
 * GET /api/setup
 *
 * Returns initialization status and document IDs.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuthWithTokenExchange(request, "data-api");
  if (auth instanceof NextResponse) return auth;
  const ids = await ensureDataDocuments(auth.apiToken);

  return NextResponse.json({
    initialized: true,
    documents: {
      notes: { name: DOCUMENTS.NOTES, id: ids.notes },
    },
  });
}

/**
 * POST /api/setup
 *
 * Ensures data documents exist. Call on first run to bootstrap the app.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthWithTokenExchange(request, "data-api");
  if (auth instanceof NextResponse) return auth;

  const ids = await ensureDataDocuments(auth.apiToken);

  return NextResponse.json({
    success: true,
    documents: {
      notes: { name: DOCUMENTS.NOTES, id: ids.notes },
    },
  });
}
