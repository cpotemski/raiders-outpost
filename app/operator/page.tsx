"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalIdentity } from "@/components/auth/useLocalIdentity";
import { useProjectContext } from "@/components/projects/ProjectContext";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { isExpeditionProjectSlug } from "@/lib/expeditions";

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

export default function RaiderPage() {
  const { identity, ready, clearIdentity } = useLocalIdentity();
  const { allProjects, loading: projectsLoading, refreshProjects } =
    useProjectContext();
  const [authCode, setAuthCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const [activeExpeditionSlug, setActiveExpeditionSlug] = useState<
    string | null
  >(null);
  const [loadingExpedition, setLoadingExpedition] = useState(false);
  const [savingExpedition, setSavingExpedition] = useState(false);
  const [expeditionError, setExpeditionError] = useState("");

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

  useEffect(() => {
    if (!identity) return;
    const controller = new AbortController();
    setLoadingExpedition(true);
    setExpeditionError("");

    fetch("/api/user/expedition", {
      method: "GET",
      headers: { "x-arc-token": identity.token },
      signal: controller.signal,
    })
      .then((res) => {
        if (res.status === 401 || res.status === 404) {
          clearIdentity();
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((payload: { activeExpeditionSlug?: string | null } | null) => {
        if (!payload) return;
        setActiveExpeditionSlug(payload.activeExpeditionSlug ?? null);
      })
      .catch(() => null)
      .finally(() => setLoadingExpedition(false));

    return () => controller.abort();
  }, [clearIdentity, identity]);

  const expeditionProjects = useMemo(
    () =>
      allProjects
        .filter((project) => isExpeditionProjectSlug(project.slug))
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allProjects]
  );

  const activeExpeditionLabel = useMemo(() => {
    if (!activeExpeditionSlug) return "NO EXPEDITION";
    return (
      expeditionProjects.find(
        (project) => project.slug === activeExpeditionSlug
      )?.name ?? "UNKNOWN EXPEDITION"
    );
  }, [activeExpeditionSlug, expeditionProjects]);

  const setExpedition = async (nextSlug: string | null) => {
    if (!identity) return;
    if (savingExpedition) return;
    if (nextSlug === activeExpeditionSlug) return;
    setSavingExpedition(true);
    setExpeditionError("");
    try {
      const res = await fetch("/api/user/expedition", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-arc-token": identity.token,
        },
        body: JSON.stringify({ expeditionSlug: nextSlug }),
      });
      if (res.status === 401 || res.status === 404) {
        clearIdentity();
        return;
      }
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload) {
        setExpeditionError("Update failed");
        return;
      }
      setActiveExpeditionSlug(payload.activeExpeditionSlug ?? null);
      refreshProjects();
    } catch {
      setExpeditionError("Update failed");
    } finally {
      setSavingExpedition(false);
    }
  };

  if (!ready) return null;

  if (!identity) {
    return (
      <div className="arc-panel arc-corners border border-frame2/70 bg-panel2/40 px-4 py-4 text-[11px] uppercase tracking-[0.12em] text-muted">
        No signal. Raider not linked.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="arc-panel arc-corners overflow-hidden">
        <div className="arc-panel-header">
          <span className="text-xs font-semibold uppercase tracking-[0.18em]">
            ARC// RAIDER
          </span>
          <span className="hud-label">LOCAL</span>
        </div>
        <div className="space-y-4 px-4 py-5">
          <div>
            <div className="hud-label">Raider</div>
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
          <div>
            <div className="hud-label">Active Expedition</div>
            <div
              className="mt-2 flex flex-wrap items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted"
              data-testid="expedition-config"
            >
              <span>{activeExpeditionLabel}</span>
              <span>{loadingExpedition ? "Scanning..." : "Synced"}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setExpedition(null)}
                aria-pressed={!activeExpeditionSlug}
                data-testid="expedition-option-none"
                className={cn(
                  "h-8 border px-3 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
                  !activeExpeditionSlug
                    ? "border-accent/80 text-text"
                    : "border-frame2 text-muted hover:border-accent/60"
                )}
                disabled={savingExpedition || loadingExpedition}
              >
                No Expedition
              </button>
              {projectsLoading && !expeditionProjects.length ? (
                <div className="flex h-8 items-center border border-frame2/70 bg-panel2/40 px-3 text-[10px] uppercase tracking-[0.16em] text-muted">
                  Scanning expedition index...
                </div>
              ) : expeditionProjects.length ? (
                expeditionProjects.map((project) => {
                  const active = activeExpeditionSlug === project.slug;
                  return (
                    <button
                      key={project.slug}
                      type="button"
                      onClick={() => setExpedition(project.slug)}
                      aria-pressed={active}
                      data-testid={`expedition-option-${project.slug}`}
                      className={cn(
                        "h-8 border px-3 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
                        active
                          ? "border-accent/80 text-text"
                          : "border-frame2 text-muted hover:border-accent/60"
                      )}
                      disabled={savingExpedition || loadingExpedition}
                    >
                      {project.name}
                    </button>
                  );
                })
              ) : (
                <div className="flex h-8 items-center border border-frame2/70 bg-panel2/40 px-3 text-[10px] uppercase tracking-[0.16em] text-muted">
                  No signal. Expedition data not found.
                </div>
              )}
            </div>
            {expeditionError ? (
              <div className="mt-2 text-[11px] uppercase tracking-[0.08em] text-warn">
                {expeditionError}
              </div>
            ) : null}
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
