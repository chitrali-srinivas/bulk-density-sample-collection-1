"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendSurveyorOtp, verifySurveyorOtp } from "@/lib/auth";
import type { Surveyor } from "@/lib/types";
import { useState } from "react";

export function LoginScreen({ onSignedIn }: { onSignedIn: (surveyor: Surveyor) => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSendCode() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await sendSurveyorOtp(email);
      setCodeSent(true);
      setInfo("Check your email for a 6–8 digit login code.");
    } catch (sendError: unknown) {
      setError(sendError instanceof Error ? sendError.message : "Could not send the login code.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    setBusy(true);
    setError(null);
    try {
      const surveyor = await verifySurveyorOtp(email, code);
      onSignedIn(surveyor);
    } catch (verifyError: unknown) {
      setError(
        verifyError instanceof Error ? verifyError.message : "Could not verify the login code.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b px-4 py-4">
        <h1 className="text-lg font-semibold tracking-tight">Surveyor sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Only allowlisted surveyor emails can open this app.
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto px-4 py-5">
        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {info ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{info}</p>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="surveyor-email">Work email</Label>
          <Input
            id="surveyor-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            placeholder="you@company.com"
            className="h-12 px-3 text-base"
            disabled={busy || codeSent}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        {codeSent ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="surveyor-code">Login code</Label>
            <Input
              id="surveyor-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              placeholder="Enter code from email"
              className="h-12 px-3 text-base tracking-widest"
              disabled={busy}
              onChange={(event) => setCode(event.target.value)}
            />
            <button
              type="button"
              className="self-start text-sm text-primary underline-offset-4 hover:underline disabled:opacity-50"
              disabled={busy}
              onClick={() => {
                setCodeSent(false);
                setCode("");
                setInfo(null);
                setError(null);
              }}
            >
              Use a different email
            </button>
          </div>
        ) : null}
      </div>

      <div className="sticky bottom-0 border-t bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {codeSent ? (
          <Button
            type="button"
            className="h-12 w-full text-base"
            disabled={busy || code.trim().length < 4}
            onClick={() => void handleVerify()}
          >
            {busy ? "Checking…" : "Sign in"}
          </Button>
        ) : (
          <Button
            type="button"
            className="h-12 w-full text-base"
            disabled={busy || !email.trim()}
            onClick={() => void handleSendCode()}
          >
            {busy ? "Sending…" : "Send login code"}
          </Button>
        )}
      </div>
    </div>
  );
}
