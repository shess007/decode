import { NextRequest, NextResponse } from "next/server";
import { getAuthHeader } from "@/lib/auth";

/**
 * Generic proxy to Bitbucket REST API.
 * Usage: GET /api/bitbucket?path=/repositories/workspace/repo/pullrequests
 */
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  try {
    const auth = await getAuthHeader();
    const res = await fetch(`https://api.bitbucket.org/2.0${path}`, {
      headers: { Authorization: auth },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Bitbucket API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }
}
