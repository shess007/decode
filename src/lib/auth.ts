import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { SessionData } from "./types";

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "decode_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/**
 * Returns the correct Authorization header from the current session.
 * Throws if not authenticated.
 */
export async function getAuthHeader(): Promise<string> {
  const session = await getSession();

  if (!session.apiToken) {
    throw new Error("Not authenticated");
  }

  if (session.authMethod === "basic") {
    return `Basic ${Buffer.from(`${session.email}:${session.apiToken}`).toString("base64")}`;
  }

  return `Bearer ${session.apiToken}`;
}
