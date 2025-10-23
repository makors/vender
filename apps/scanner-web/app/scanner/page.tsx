import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { ACCESS_COOKIE_NAME, isAuthorized } from "@/lib/auth";

import { ScannerConsole } from "./scanner-console";

export const metadata: Metadata = {
  title: "Ticket scanner | Vender",
};

export default function ScannerPage() {
  const cookieStore = cookies();
  const code = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!isAuthorized(code)) {
    redirect("/login");
  }

  return <ScannerConsole />;
}
