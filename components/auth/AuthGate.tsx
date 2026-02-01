"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLocalIdentity } from "@/components/auth/useLocalIdentity";
import { useLocale } from "@/components/locale/LocaleProvider";
import { cn } from "@/lib/cn";

type OnboardingStage = {
  stageKey: string;
  name: string;
  sortOrder: number;
  itemCount: number;
};

type OnboardingProject = {
  slug: string;
  name: string;
  kind: "workshop" | "project" | "blueprints";
  isExpedition: boolean;
  stages: OnboardingStage[];
};

export function AuthGate() {
  const { identity, ready, saveIdentity } = useLocalIdentity();
  const { locale, ready: localeReady } = useLocale();
  const [mode, setMode] = useState<"register" | "code">("register");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [onboardingProjects, setOnboardingProjects] = useState<
    OnboardingProject[]
  >([]);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [projectSelections, setProjectSelections] = useState<
    Record<string, boolean>
  >({});
  const [expeditionNext, setExpeditionNext] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || identity || !localeReady || mode !== "register") return;
    const controller = new AbortController();
    setOnboardingLoading(true);
    fetch(`/api/onboarding/projects?locale=${locale}`, {
      method: "GET",
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { projects?: OnboardingProject[] } | null) => {
        if (!payload?.projects) return;
        setOnboardingProjects(payload.projects);
      })
      .catch(() => null)
      .finally(() => setOnboardingLoading(false));

    return () => controller.abort();
  }, [identity, locale, localeReady, mode, ready]);

  const expeditionProjects = useMemo(
    () => onboardingProjects.filter((project) => project.isExpedition),
    [onboardingProjects]
  );
  const toggleProjectSelection = (slug: string) => {
    setProjectSelections((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  const toggleExpeditionNext = (slug: string) => {
    setExpeditionNext((prev) => (prev === slug ? null : slug));
  };

  const buildBaselinePayload = () => {
    const selectionMap = new Map<string, Set<number>>();

    for (const project of onboardingProjects) {
      if (!project.stages.length) continue;
      if (!projectSelections[project.slug]) continue;
      const completed = new Set<number>();
      project.stages.forEach((stage) => completed.add(stage.sortOrder));
      selectionMap.set(project.slug, completed);
    }

    return Array.from(selectionMap.entries()).map(([slug, stages]) => ({
      projectSlug: slug,
      completedStageSortOrders: Array.from(stages),
    }));
  };

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
        const baseline = buildBaselinePayload();
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmed,
            create: true,
            locale,
            baseline,
            expeditionNext,
          }),
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
            : "Raider";
        saveIdentity(nextName, payload.user.token);
      }
    } catch {
      setError(mode === "register" ? "Auth failed" : "Code invalid");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready || identity) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="arc-panel arc-corners arc-noise w-full max-w-xl max-h-[90vh] overflow-y-auto">
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
                  Raider Name
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
                <div className="mt-4 border-t border-frame2/70 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                        Progress Baseline
                      </div>
                      <div className="hud-label">
                        Select completed projects
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-3">
                    {onboardingLoading ? (
                      <div className="border border-frame2/70 bg-panel2/40 px-3 py-3 text-[11px] uppercase tracking-[0.12em] text-muted">
                        Scanning project cache...
                      </div>
                    ) : onboardingProjects.length ? (
                      <div className="space-y-2">
                        {onboardingProjects.map((project) => {
                          const selected = !!projectSelections[project.slug];
                          return (
                            <div
                              key={project.slug}
                              data-testid={`onboarding-project-${project.slug}`}
                              className="flex items-center justify-between gap-3 border border-frame2/70 bg-panel2/40 px-3 py-2"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text">
                                  {project.name}
                                </div>
                              </div>
                              <label
                                className={cn(
                                  "flex items-center gap-2 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] shrink-0",
                                  selected
                                    ? "border-accent/80 text-text"
                                    : "border-frame2/70 text-muted hover:border-accent/60"
                                )}
                                data-testid={`onboarding-project-complete-${project.slug}`}
                              >
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={selected}
                                  onChange={() =>
                                    toggleProjectSelection(project.slug)
                                  }
                                />
                                COMPLETE
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="border border-frame2/70 bg-panel2/40 px-3 py-3 text-[11px] uppercase tracking-[0.12em] text-muted">
                        No signal. Data not found.
                      </div>
                    )}
                  </div>
                  {expeditionProjects.length ? (
                    <div className="mt-4 border-t border-frame2/70 pt-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                        Expedition Control
                      </div>
                      <div className="hud-label">Select active expedition</div>
                      <div
                        className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted"
                        data-testid="expedition-config"
                      >
                        <span>
                          {expeditionNext
                            ? expeditionProjects.find(
                                (project) => project.slug === expeditionNext
                              )?.name ?? "UNKNOWN EXPEDITION"
                            : "NO EXPEDITION"}
                        </span>
                        <span>READY</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setExpeditionNext(null)}
                          aria-pressed={!expeditionNext}
                          data-testid="expedition-option-none"
                          className={cn(
                            "h-8 border px-3 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
                            !expeditionNext
                              ? "border-accent/80 text-text"
                              : "border-frame2 text-muted hover:border-accent/60"
                          )}
                        >
                          No Expedition
                        </button>
                        {expeditionProjects.map((project) => {
                          const isNext = expeditionNext === project.slug;
                          return (
                            <button
                              key={project.slug}
                              type="button"
                              onClick={() => toggleExpeditionNext(project.slug)}
                              aria-pressed={isNext}
                              data-testid={`expedition-option-${project.slug}`}
                              className={cn(
                                "h-8 border px-3 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
                                isNext
                                  ? "border-accent/80 text-text"
                                  : "border-frame2 text-muted hover:border-accent/60"
                              )}
                            >
                              {project.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
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
            ) : mode === "code" ? (
              <div className="mt-2 text-[11px] uppercase tracking-[0.08em] text-muted">
                Code valid for 5 minutes
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="primary"
              type="submit"
              className="px-5"
              disabled={submitting}
            >
              Sync Uplink
            </Button>
            <span className="hud-label">SCANNING CACHE...</span>
          </div>
        </form>
      </div>
    </div>
  );
}
