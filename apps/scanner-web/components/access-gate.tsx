"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, SmartphoneNfc, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const hints = [
  "Keep the screen brightness high for faster scans.",
  "Tap the code field to use the device's one-time code autofill.",
  "Access codes rotate regularly—ask your lead if yours stops working."
];

export default function AccessGate() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hintIndex, setHintIndex] = useState(() => Math.floor(Math.random() * hints.length));
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmed = code.trim();
    if (!trimmed) {
      setError("Enter the access code you were given.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: trimmed })
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? "We couldn't verify that code.");
          setHintIndex((index) => (index + 1) % hints.length);
          return;
        }

        setCode("");
        router.refresh();
      } catch (err) {
        setError("Unable to reach the scanner. Check your connection and try again.");
      }
    });
  };

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md border-border/50 bg-card/90 backdrop-blur">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl">Enter the scanner lounge</CardTitle>
            <CardDescription className="space-y-1">
              <p>Only authorized staff can unlock the mobile scanner.</p>
              <p className="text-xs text-muted-foreground">Share the rotating code securely—never post it publicly.</p>
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 text-left">
              <Label htmlFor="access-code" className="flex items-center gap-2">
                <SmartphoneNfc className="h-4 w-4 text-primary" />
                Access code
              </Label>
              <Input
                id="access-code"
                placeholder="••••••"
                value={code}
                inputMode="numeric"
                autoComplete="one-time-code"
                onChange={(event) => setCode(event.target.value)}
                disabled={isPending}
                maxLength={48}
              />
            </div>
            {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
            <Button className="w-full" type="submit" disabled={isPending}>
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying
                </span>
              ) : (
                "Unlock scanner"
              )}
            </Button>
          </form>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border/60 bg-muted/40 px-3 py-2 text-left text-xs text-muted-foreground">
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-[10px] uppercase tracking-widest text-primary">
              Tip
            </Badge>
            <p className="flex-1 text-right leading-snug">{hints[hintIndex]}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
