import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

async function tryAuth(authorization: string) {
  const res = await fetch("https://api.bitbucket.org/2.0/user", {
    headers: { Authorization: authorization },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function POST(request: NextRequest) {
  const { email, apiToken } = await request.json();

  if (!apiToken) {
    return NextResponse.json(
      { error: "API token is required" },
      { status: 400 }
    );
  }

  // Try Bearer auth first, then Basic auth with email
  let user = await tryAuth(`Bearer ${apiToken}`);
  let authMethod: "bearer" | "basic" = "bearer";

  if (!user && email) {
    user = await tryAuth(
      `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`
    );
    authMethod = "basic";
  }

  if (!user) {
    return NextResponse.json(
      { error: "Authentication failed. Check your email and API token." },
      { status: 401 }
    );
  }

  // Save to encrypted session
  const session = await getSession();
  session.apiToken = apiToken;
  session.authMethod = authMethod;
  session.email = email || "";
  session.user = {
    displayName: user.display_name,
    username: user.username,
    uuid: user.uuid,
    avatarUrl: user.links?.avatar?.href || "",
  };
  await session.save();

  return NextResponse.json({
    ok: true,
    user: session.user,
  });
}
