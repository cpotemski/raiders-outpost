"use client";

import { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useLocalIdentity } from "./useLocalIdentity";

export function AuthGate() {
  const { identity, ready, saveIdentity } = useLocalIdentity();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  if (!ready || identity) return null;

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name required");
      return;
    }
    saveIdentity(trimmed);
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
          <div>
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
            {error ? (
              <div className="mt-2 text-[11px] uppercase tracking-[0.08em] text-warn">
                {error}
              </div>
            ) : (
              <div className="mt-2 text-[11px] uppercase tracking-[0.08em] text-muted">
                Token stored in local storage
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="primary" type="submit" className="px-5">
              Link Uplink
            </Button>
            <span className="hud-label">SCANNING CACHE...</span>
          </div>
        </form>
      </div>
    </div>
  );
}
