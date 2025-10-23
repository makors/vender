"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ACCESS_COOKIE_NAME,
  getConfiguredAccessCode,
  isAuthorized,
  sanitizeAccessCode,
} from "@/lib/auth";

export interface AuthFormState {
  error?: string;
}

export async function authenticate(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const accessCodeRaw = formData.get("accessCode");

  if (typeof accessCodeRaw !== "string") {
    return { error: "Enter your access code." };
  }

  const cleaned = sanitizeAccessCode(accessCodeRaw);

  if (!cleaned) {
    return { error: "Access code cannot be empty." };
  }

  const configured = getConfiguredAccessCode();

  if (!configured) {
    return { error: "Scanner access hasn't been configured yet." };
  }

  if (!isAuthorized(cleaned)) {
    return { error: "That code doesn't match. Try again or contact an admin." };
  }

  const cookieStore = cookies();
  const maxAge = 60 * 60 * 12; // 12 hours

  cookieStore.set({
    name: ACCESS_COOKIE_NAME,
    value: cleaned,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    maxAge,
  });

  redirect("/scanner");
}
