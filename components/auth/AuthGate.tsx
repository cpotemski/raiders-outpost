"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLocalIdentity } from "@/components/auth/useLocalIdentity";

export function AuthGate() {
  const { identity, ready, saveIdentity } = useLocalIdentity();
  const [mode, setMode] = useState<"register" | "code">("register");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!ready || identity) return null;

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      if (mode === "register") {
        const trimmed = name.trim();
        if (!trimmed) {
          setError("Name required");
          return;
        }
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed, create: true }),
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok || !payload?.user?.token) {
          setError("Auth failed");
          return;
        }
        const nextName =
          typeof payload.user.name === "string" ? payload.user.name : trimmed;
        saveIdentity(nextName, payload.user.token);
      } else {
        const trimmedCode = code.trim().toUpperCase();
        if (!trimmedCode) {
          setError("Code required");
          return;
        }
        const res = await fetch("/api/auth/code/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: trimmedCode }),
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok || !payload?.user?.token) {
          if (res.status === 410) {
            setError("Code expired");
            return;
          }
          setError("Code invalid");
          return;
        }
        const nextName =
          typeof payload.user.name === "string"
            ? payload.user.name
            : "Operator";
        saveIdentity(nextName, payload.user.token);
      }
    } catch {
      setError(mode === "register" ? "Auth failed" : "Code invalid");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="arc-panel arc-corners arc-noise w-full max-w-md overflow-hidden">
        <div className="arc-panel-header">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em]">
              ARC// AUTH LINK
            </div>
            <div className="hud-label">No registration required</div>
          </div>
          <span className="hud-label">LOCAL</span>
        </div>
        <form className="space-y-4 px-5 py-6" onSubmit={onSubmit}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className={`border-b pb-1 ${
                mode === "register"
                  ? "border-accent text-text"
                  : "border-transparent text-muted hover:text-text"
              }`}
            >
              Register
            </button>
            <span className="text-muted">/</span>
            <button
              type="button"
              onClick={() => {
                setMode("code");
                setError("");
              }}
              className={`border-b pb-1 ${
                mode === "code"
                  ? "border-accent text-text"
                  : "border-transparent text-muted hover:text-text"
              }`}
            >
              Use Code
            </button>
          </div>
          <div>
            {mode === "register" ? (
              <>
                <label className="hud-label" htmlFor="operator-name">
                  Operator Name
                </label>
                <Input
                  id="operator-name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Enter callsign"
                  autoFocus
                />
              </>
            ) : (
              <>
                <label className="hud-label" htmlFor="auth-code">
                  Auth Code
                </label>
                <Input
                  id="auth-code"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value.toUpperCase());
                    if (error) setError("");
                  }}
                  placeholder="ENTER 8-CHAR CODE"
                  className="font-mono tracking-[0.2em]"
                  autoFocus
                />
              </>
            )}
            {error ? (
              <div className="mt-2 text-[11px] uppercase tracking-[0.08em] text-warn">
                {error}
              </div>
            ) : (
              <div className="mt-2 text-[11px] uppercase tracking-[0.08em] text-muted">
                {mode === "register"
                  ? "Token stored in local storage"
                  : "Code valid for 5 minutes"}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="primary"
              type="submit"
              className="px-5"
              disabled={submitting}
            >
              Link Uplink
            </Button>
            <span className="hud-label">SCANNING CACHE...</span>
          </div>
        </form>
      </div>
    </div>
  );
}
