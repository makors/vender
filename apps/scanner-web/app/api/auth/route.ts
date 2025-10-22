import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "vender-scanner-auth";
const DEFAULT_CODE = "vender-demo";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

function getSecretCode() {
  const code = process.env.SCANNER_ACCESS_CODE ?? process.env.SCANNER_AUTH_CODE;
  return code?.trim() ?? DEFAULT_CODE;
}

function isAuthorizedCode(input: string) {
  const expected = getSecretCode();
  const provided = input.trim();

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function POST(request: NextRequest) {
  const { code } = (await request.json().catch(() => ({}))) as { code?: string };

  if (!code || typeof code !== "string") {
    return NextResponse.json(
      { success: false, error: "Enter the access code to continue." },
      { status: 400 }
    );
  }

  if (!isAuthorizedCode(code)) {
    return NextResponse.json(
      { success: false, error: "That code isn't recognized. Try again." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: COOKIE_NAME,
    value: "1",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
    maxAge: 0
  });

  return response;
}

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(COOKIE_NAME);

  return NextResponse.json({ authorized: cookie?.value === "1" });
}
