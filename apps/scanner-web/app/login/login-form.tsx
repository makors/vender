"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { redirect } from "next/navigation";

export function LoginForm() {
  const [state, setState] = useState<{ error?: string }>({});
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    try {
      const result = await fetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ secretCode: formData.get("secretCode") }),
      });
      if (!result.ok) {
        setState({ error: "Failed to login" });
        return;
      }
      redirect("/scanner");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="pt-6">
        <form action={handleSubmit} className="space-y-4">
          <Input
            id="secretCode"
            name="secretCode"
            type="password"
            placeholder="Secret code"
            inputMode="numeric"
            required
            minLength={4}
            autoComplete="one-time-code"
            className="text-lg text-center tracking-widest"
            autoFocus
          />
          {state?.error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p>{state.error}</p>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Verifying..." : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
