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
  const [expeditionDone, setExpeditionDone] = useState<string[]>([]);
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

  const toggleExpeditionDone = (slug: string) => {
    setExpeditionDone((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((entry) => entry !== slug);
      }
      return [...prev, slug];
    });
  };

  const toggleExpeditionNext = (slug: string) => {
    setExpeditionNext((prev) => (prev === slug ? null : slug));
  };

  const clearOnboarding = () => {
    setProjectSelections({});
    setExpeditionDone([]);
    setExpeditionNext(null);
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

    for (const slug of expeditionDone) {
      const project = onboardingProjects.find((entry) => entry.slug === slug);
      if (!project) continue;
      const selection = selectionMap.get(slug) ?? new Set<number>();
      project.stages.forEach((stage) => selection.add(stage.sortOrder));
      selectionMap.set(slug, selection);
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
            : "Operator";
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
                    <button
                      type="button"
                      onClick={clearOnboarding}
                      className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted hover:text-text"
                    >
                      Skip setup
                    </button>
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
                              className="flex flex-wrap items-center justify-between gap-3 border border-frame2/70 bg-panel2/40 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text">
                                  {project.name}
                                </div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                                  {project.isExpedition
                                    ? "Expedition"
                                    : "Module"}
                                </div>
                              </div>
                              <label
                                className={cn(
                                  "flex items-center gap-2 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
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
                        Expedition Status
                      </div>
                      <div className="hud-label">
                        Mark completed and set next expedition
                      </div>
                      <div className="mt-3 space-y-2">
                        {expeditionProjects.map((project) => {
                          const isDone = expeditionDone.includes(project.slug);
                          const isNext = expeditionNext === project.slug;
                          return (
                            <div
                              key={project.slug}
                              className="flex flex-wrap items-center justify-between gap-3 border border-frame2/70 bg-panel2/40 px-3 py-2"
                            >
                              <div className="text-[11px] font-semibold uppercase tracking-[0.12em]">
                                {project.name}
                              </div>
                              <div className="flex items-center gap-2">
                                <label
                                  className={cn(
                                    "flex items-center gap-2 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                                    isDone
                                      ? "border-accent/80 text-text"
                                      : "border-frame2/70 text-muted hover:border-accent/60"
                                  )}
                                  data-testid={`onboarding-expedition-done-${project.slug}`}
                                >
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={isDone}
                                    onChange={() =>
                                      toggleExpeditionDone(project.slug)
                                    }
                                  />
                                  DONE
                                </label>
                                <label
                                  className={cn(
                                    "flex items-center gap-2 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                                    isNext
                                      ? "border-accent/80 text-text"
                                      : "border-frame2/70 text-muted hover:border-accent/60"
                                  )}
                                  data-testid={`onboarding-expedition-next-${project.slug}`}
                                >
                                  <input
                                    type="radio"
                                    name="expedition-next"
                                    className="sr-only"
                                    checked={isNext}
                                    onChange={() =>
                                      toggleExpeditionNext(project.slug)
                                    }
                                  />
                                  NEXT
                                </label>
                              </div>
                            </div>
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
