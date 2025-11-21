import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { BEARER_TOKEN_COOKIE_NAME } from "../lib/auth";

export default function IndexPage() {
  const cookieStore = cookies();
  const code = cookieStore.get(BEARER_TOKEN_COOKIE_NAME)?.value;

  if (code && code.length > 0) {
    redirect("/scanner");
  }

  redirect("/login");
}
