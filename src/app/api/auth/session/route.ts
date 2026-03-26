import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/** Returns the current user session (without credentials) for the frontend. */
export async function GET() {
  const session = await getSession();

  if (!session.apiToken) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    user: session.user,
  });
}
