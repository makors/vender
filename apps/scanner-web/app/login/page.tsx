import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Metadata } from "next";

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
    <div className="flex flex-1 flex-col items-center justify-center py-12">
      <div className="mb-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Vender Scanner</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Authenticate to access the ticket verification console.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
