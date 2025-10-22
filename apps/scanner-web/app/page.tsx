import { cookies } from "next/headers";

import AccessGate from "@/components/access-gate";
import ScannerApp from "@/components/scanner-app";

const COOKIE_NAME = "vender-scanner-auth";

export default function HomePage() {
  const cookieStore = cookies();
  const authorized = cookieStore.get(COOKIE_NAME)?.value === "1";

  return (
    <main className="flex flex-1 flex-col">
      {authorized ? <ScannerApp /> : <AccessGate />}
    </main>
  );
}
