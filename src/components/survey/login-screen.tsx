"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lookupSurveyor, storeSurveyor, SURVEYOR_EMAIL_DOMAIN } from "@/lib/auth";
import type { Surveyor } from "@/lib/types";
import { useState } from "react";

export function LoginScreen({ onSignedIn }: { onSignedIn: (surveyor: Surveyor) => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    setBusy(true);
    setError(null);
    try {
      const surveyor = await lookupSurveyor(email);
      storeSurveyor(surveyor);
      onSignedIn(surveyor);
    } catch (lookupError: unknown) {
      setError(lookupError instanceof Error ? lookupError.message : "Could not verify email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b px-4 py-4">
        <h1 className="text-lg font-semibold tracking-tight">Surveyor sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your @{SURVEYOR_EMAIL_DOMAIN} email. It must be on the surveyor list.
        </p>
      </header>

      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          void handleContinue();
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto px-4 py-5">
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="surveyor-email">Work email</Label>
            <Input
              id="surveyor-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              placeholder={`you@${SURVEYOR_EMAIL_DOMAIN}`}
              className="h-12 px-3 text-base"
              disabled={busy}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </div>

        <div className="sticky bottom-0 border-t bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            type="submit"
            className="h-12 w-full text-base"
            disabled={busy || !email.trim()}
          >
            {busy ? "Checking…" : "Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
