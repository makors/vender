import { getApiBaseUrl } from "../scan/route";
import { BEARER_TOKEN_COOKIE_NAME } from "../../../lib/auth";
import { cookies, headers } from "next/headers";

export type AuthApiResponse = {
  token: string;
};

export async function POST(req: Request): Promise<Response> {
  const cookieStore = cookies();
  const secretCode = req.json().catch(() => null) as {
    secretCode?: string;
  } | null;

  if (!secretCode) {
    return new Response(JSON.stringify({ error: "secretCode is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const loginReq = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ privateCode: secretCode }),
  });

  const loginResp = await loginReq.json() as {token: string} | null;

  if (!loginResp?.token || typeof loginResp.token !== "string") {
    return new Response(JSON.stringify({ error: "Failed to login" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  cookieStore.set({
    name: BEARER_TOKEN_COOKIE_NAME,
    value: loginResp.token,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
