import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { BEARER_TOKEN_COOKIE_NAME, SELECTED_EVENT_COOKIE_NAME } from "../../lib/auth";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Enter Access Code | Vender",
};

export default function LoginPage() {
  const cookieStore = cookies();
  const token = cookieStore.get(BEARER_TOKEN_COOKIE_NAME)?.value;

  if (token && token.length > 0) {
    const selectedEvent = cookieStore.get(SELECTED_EVENT_COOKIE_NAME)?.value;
    redirect(selectedEvent ? "/scanner" : "/events");
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
