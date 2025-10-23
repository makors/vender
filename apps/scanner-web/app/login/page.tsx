import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { ACCESS_COOKIE_NAME, isAuthorized } from "@/lib/auth";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Scanner access | Vender",
};

export default function LoginPage() {
  const cookieStore = cookies();
  const code = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (isAuthorized(code)) {
    redirect("/scanner");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Vender Scanner</h1>
        <p className="mt-3 text-muted-foreground">
          Enter access code to continue
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
