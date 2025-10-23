"use client";

import { useFormState, useFormStatus } from "react-dom";
import { ShieldCheck, SmartphoneNfc } from "lucide-react";

import { authenticate, type AuthFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const initialState: AuthFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Authorizing…" : "Enter scanning console"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(authenticate, initialState);

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <Badge variant="outline" className="w-fit gap-2 bg-white/10 px-3 py-1 text-xs uppercase tracking-wide">
          <SmartphoneNfc className="h-4 w-4" />
          Secure access
        </Badge>
        <CardTitle className="text-2xl font-semibold">Unlock the scanner</CardTitle>
        <CardDescription>
          Enter the access code shared with trusted staff to start verifying tickets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form action={formAction} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="accessCode">Access code</Label>
            <Input
              id="accessCode"
              name="accessCode"
              type="password"
              placeholder="••••••"
              inputMode="numeric"
              required
              minLength={4}
              autoComplete="one-time-code"
              className="text-lg tracking-widest"
            />
          </div>
          {state?.error ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
              <ShieldCheck className="h-4 w-4" />
              <p>{state.error}</p>
            </div>
          ) : null}
          <SubmitButton />
        </form>
        <p className="text-xs text-muted-foreground">
          Pro tip: bookmark this page and keep your code private. We keep your session locked with an encrypted, http-only cookie for 12 hours.
        </p>
      </CardContent>
    </Card>
  );
}
