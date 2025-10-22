"use client";

import { useTransition } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export default function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      try {
        await fetch("/api/auth", { method: "DELETE" });
      } finally {
        router.refresh();
      }
    });
  };

  return (
    <Button variant="outline" onClick={handleLogout} disabled={isPending} className="gap-2">
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      <span className="hidden sm:inline">Sign out</span>
    </Button>
  );
}
