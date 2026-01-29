"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { useLocalIdentity } from "./useLocalIdentity";
import { cn } from "../../lib/cn";

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

export function UserMenu() {
  const { identity, ready, clearIdentity } = useLocalIdentity();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClick = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (!ready) return null;

  const onCopy = async () => {
    if (!identity) return;
    const ok = await copyTokenToClipboard(identity.token);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <div className="relative z-40" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-3 rounded-[10px] border border-frame px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] transition",
          "hover:border-accent/70"
        )}
      >
        <div>
          <div className="hud-label">Operator</div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em]">
            {identity?.name ?? "No Signal"}
          </div>
        </div>
        <span className="text-[10px] text-muted">ID</span>
      </button>

      {open && identity ? (
        <div className="absolute right-0 z-50 mt-3 w-72">
          <div className="arc-panel arc-corners overflow-hidden">
            <div className="arc-panel-header">
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                ARC// TOKEN
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
                <div className="hud-label">Access Token</div>
                <div className="mt-2 flex items-start gap-2">
                  <div className="flex-1 rounded-[8px] border border-frame bg-panel2 px-3 py-2 font-mono text-[11px] text-text break-all">
                    {identity.token}
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    onClick={onCopy}
                    className="px-2 py-1 text-[10px]"
                  >
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="hud-label">
                  {copied ? "TOKEN COPIED" : "STORED LOCAL"}
                </span>
                <Button
                  type="button"
                  variant="default"
                  onClick={() => {
                    setOpen(false);
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
      ) : null}
    </div>
  );
}
