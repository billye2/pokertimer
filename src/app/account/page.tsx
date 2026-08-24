"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "loading" | "email" | "code" | "signed-in";

export default function AccountPage() {
  const [step, setStep] = useState<Step>("loading");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setEmail(d.user.email);
          setStep("signed-in");
        } else setStep("email");
      })
      .catch(() => setStep("email"));
  }, []);

  async function post(url: string, body?: object) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error ?? "Something went wrong.");
        return null;
      }
      return d;
    } catch {
      setError("Network error — are you offline?");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Account</h1>
        <Card>
          {step === "loading" && (
            <CardContent className="py-8 text-sm text-muted-foreground">Loading…</CardContent>
          )}

          {step === "email" && (
            <>
              <CardHeader>
                <CardTitle>Sign in</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <p className="text-sm text-muted-foreground">
                  No password — we&apos;ll email you a 6-digit code. Signing in is optional;
                  everything works offline without it.
                </p>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && document.getElementById("send-code")?.click()}
                  />
                </div>
                <Button
                  id="send-code"
                  disabled={busy || !email.includes("@")}
                  onClick={async () => {
                    if (await post("/api/auth/request-code", { email })) setStep("code");
                  }}
                >
                  {busy ? "Sending…" : "Email me a code"}
                </Button>
              </CardContent>
            </>
          )}

          {step === "code" && (
            <>
              <CardHeader>
                <CardTitle>Check your email</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit code to <span className="text-foreground">{email}</span>. It
                  expires in 10 minutes.
                </p>
                <div className="grid gap-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <Button
                  disabled={busy || code.length !== 6}
                  onClick={async () => {
                    if (await post("/api/auth/verify", { email, code })) {
                      setCode("");
                      setStep("signed-in");
                    }
                  }}
                >
                  {busy ? "Verifying…" : "Sign in"}
                </Button>
                <button
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    setCode("");
                    setStep("email");
                  }}
                >
                  Use a different email
                </button>
              </CardContent>
            </>
          )}

          {step === "signed-in" && (
            <>
              <CardHeader>
                <CardTitle>Signed in</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground">{email}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Cloud backup of your tournaments is coming next — signing in now links this
                  device to your email.
                </p>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    if (await post("/api/auth/logout")) {
                      setEmail("");
                      setStep("email");
                    }
                  }}
                >
                  Sign out
                </Button>
              </CardContent>
            </>
          )}

          {error && (
            <CardContent className="pt-0">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          )}
        </Card>
      </main>
    </div>
  );
}
