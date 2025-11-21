import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { BEARER_TOKEN_COOKIE_NAME } from "../../lib/auth";

import { ScannerConsole } from "./scanner-console";

export const metadata: Metadata = {
  title: "Ticket scanner | Vender",
};

export default function ScannerPage() {
  const cookieStore = cookies();
  const code = cookieStore.get(BEARER_TOKEN_COOKIE_NAME)?.value;

  if (!code || code.length === 0) {
    redirect("/login");
  }

  // this is fine because no data can be accessed without the bearer token
  return <ScannerConsole />;
}
