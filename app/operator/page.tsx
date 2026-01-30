"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocalIdentity } from "@/components/auth/useLocalIdentity";
import { Button } from "@/components/ui/Button";

const copyTokenToClipboard = async (token: string) => {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(token);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = token;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
    return true;
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
};

export default function OperatorPage() {
  const { identity, ready, clearIdentity } = useLocalIdentity();
  const [authCode, setAuthCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);

  const onCopy = async () => {
    if (!authCode) return;
    await copyTokenToClipboard(authCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const onGenerate = useCallback(async () => {
    if (!identity || loadingCode) return;
    setLoadingCode(true);
    try {
      const res = await fetch("/api/auth/code", {
        method: "POST",
        headers: { "x-arc-token": identity.token },
      });
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.code) {
        setAuthCode(payload.code);
      }
    } finally {
      setLoadingCode(false);
    }
  }, [identity, loadingCode]);

  useEffect(() => {
    if (!identity) return;
    if (authCode || loadingCode) return;
    onGenerate();
  }, [authCode, identity, loadingCode, onGenerate]);

  if (!ready) return null;

  if (!identity) {
    return (
      <div className="arc-panel arc-corners border border-frame2/70 bg-panel2/40 px-4 py-4 text-[11px] uppercase tracking-[0.12em] text-muted">
        No signal. Operator not linked.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="arc-panel arc-corners overflow-hidden">
        <div className="arc-panel-header">
          <span className="text-xs font-semibold uppercase tracking-[0.18em]">
            ARC// OPERATOR
          </span>
          <span className="hud-label">LOCAL</span>
        </div>
        <div className="space-y-4 px-4 py-5">
          <div>
            <div className="hud-label">Operator</div>
            <div className="text-sm font-semibold uppercase tracking-[0.12em]">
              {identity.name}
            </div>
          </div>
          <div>
            <div className="hud-label">Auth Code</div>
            <div className="mt-2 flex flex-wrap items-start gap-2">
              <div
                className="flex-1 rounded-[8px] border border-frame bg-panel2 px-3 py-2 font-mono text-[12px] text-text tracking-[0.2em]"
                aria-label="Auth code value"
              >
                {authCode || "--------"}
              </div>
              <Button
                type="button"
                variant="default"
                onClick={onCopy}
                className="px-2 py-1 text-[10px]"
                disabled={!authCode}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="hud-label">READY</span>
            <Button
              type="button"
              variant="default"
              onClick={() => {
                clearIdentity();
              }}
              className="px-3"
            >
              Log Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
