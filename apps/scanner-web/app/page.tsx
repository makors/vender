import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_COOKIE_NAME, isAuthorized } from "@/lib/auth";

export default function IndexPage() {
  const cookieStore = cookies();
  const code = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (isAuthorized(code)) {
    redirect("/scanner");
  }

  redirect("/login");
}
