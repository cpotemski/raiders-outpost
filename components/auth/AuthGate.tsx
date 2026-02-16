"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLocalIdentity } from "@/components/auth/useLocalIdentity";
import { useLocale } from "@/components/locale/LocaleProvider";
import { cn } from "@/lib/cn";
import { useLabels } from "@/components/locale/useLabels";
import { orderExpeditionProjects } from "@/lib/expeditions";

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
  const router = useRouter();
  const { identity, ready, saveIdentity } = useLocalIdentity();
  const { locale, ready: localeReady } = useLocale();
  const labels = useLabels();
  const [flow, setFlow] = useState<"entry" | "existing" | "new">("entry");
  const [newStep, setNewStep] = useState(0);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [errorKey, setErrorKey] = useState<
    "nameRequired" | "authFailed" | "codeRequired" | "codeExpired" | "codeInvalid" | ""
  >("");
  const [submitting, setSubmitting] = useState(false);
  const [onboardingProjects, setOnboardingProjects] = useState<
    OnboardingProject[]
  >([]);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [projectSelections, setProjectSelections] = useState<
    Record<string, boolean>
  >({});
  const [selectedExpeditionSlug, setSelectedExpeditionSlug] = useState<
    string | null
  >(null);
  const [selectedExpeditionCompletedPhases, setSelectedExpeditionCompletedPhases] =
    useState(0);
  const isNewFlow = flow === "new";
  const isExistingFlow = flow === "existing";

  const resetFlow = () => {
    setFlow("entry");
    setNewStep(0);
    setErrorKey("");
    setName("");
    setCode("");
    setProjectSelections({});
    setSelectedExpeditionSlug(null);
    setSelectedExpeditionCompletedPhases(0);
  };

  useEffect(() => {
    if (!ready || identity || !localeReady || flow !== "new") return;
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
  }, [identity, locale, localeReady, flow, ready]);

  const expeditionProjects = useMemo(
    () =>
      orderExpeditionProjects(
        onboardingProjects.filter((project) => project.isExpedition)
      ),
    [onboardingProjects]
  );
  const selectedExpedition = useMemo(
    () =>
      selectedExpeditionSlug
        ? expeditionProjects.find((project) => project.slug === selectedExpeditionSlug) ??
          null
        : null,
    [expeditionProjects, selectedExpeditionSlug]
  );
  const selectedExpeditionPhaseMax = selectedExpedition?.stages.length ?? 0;
  const nonExpeditionProjects = useMemo(
    () => onboardingProjects.filter((project) => !project.isExpedition),
    [onboardingProjects]
  );
  const toggleProjectSelection = (slug: string) => {
    setProjectSelections((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  const selectExpedition = (slug: string | null) => {
    setSelectedExpeditionSlug(slug);
    setSelectedExpeditionCompletedPhases(0);
  };

  const buildBaselinePayload = () => {
    const selectionMap = new Map<string, Set<number>>();

    for (const project of nonExpeditionProjects) {
      if (!project.stages.length) continue;
      if (!projectSelections[project.slug]) continue;
      const completed = new Set<number>();
      project.stages.forEach((stage) => completed.add(stage.sortOrder));
      selectionMap.set(project.slug, completed);
    }

    if (selectedExpedition && selectedExpeditionCompletedPhases > 0) {
      const completed = new Set<number>();
      selectedExpedition.stages
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .slice(0, selectedExpeditionCompletedPhases)
        .forEach((stage) => completed.add(stage.sortOrder));

      if (completed.size) {
        selectionMap.set(selectedExpedition.slug, completed);
      }
    }

    return Array.from(selectionMap.entries()).map(([slug, stages]) => ({
      projectSlug: slug,
      completedStageSortOrders: Array.from(stages),
    }));
  };

  const submitNewFlow = async () => {
    if (submitting) return;
    setErrorKey("");
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorKey("nameRequired");
      return;
    }
    setSubmitting(true);
    try {
      const baseline = buildBaselinePayload();
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          create: true,
          locale,
          baseline,
          activeExpeditionSlug: selectedExpeditionSlug,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.user?.token) {
        setErrorKey("authFailed");
        return;
      }
      const nextName =
        typeof payload.user.name === "string" ? payload.user.name : trimmed;
      saveIdentity(nextName, payload.user.token);
      router.replace("/projects");
    } catch {
      setErrorKey("authFailed");
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (flow !== "existing") return;
    if (submitting) return;
    setErrorKey("");
    setSubmitting(true);
    try {
      const trimmedCode = code.trim().toUpperCase();
      if (!trimmedCode) {
        setErrorKey("codeRequired");
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
          setErrorKey("codeExpired");
          return;
        }
        setErrorKey("codeInvalid");
        return;
      }
      const nextName =
        typeof payload.user.name === "string" ? payload.user.name : "User";
      saveIdentity(nextName, payload.user.token);
      router.replace("/projects");
    } catch {
      setErrorKey("codeInvalid");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!ready || identity) return;
    document.body.classList.add("auth-gate-open");
    return () => {
      document.body.classList.remove("auth-gate-open");
    };
  }, [ready, identity]);

  if (!ready || identity) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 top-16 z-50 flex items-center justify-center bg-black/40 px-4 py-8 pointer-events-none">
      <div className="arc-panel arc-corners arc-noise w-full max-w-xl max-h-[90vh] overflow-y-auto pointer-events-auto">
        <div className="arc-panel-header">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em]">
              ARC // REGISTER
            </div>
          </div>
        </div>
        <form className="space-y-4 px-2 py-6" onSubmit={onSubmit}>
          {flow === "entry" ? (
            <div className="space-y-4" data-testid="onboarding-step-account">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                  {labels.onboardingAccountPrompt}
                </div>
                <div className="hud-label">{labels.onboardingAccountHelp}</div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="default"
                  data-testid="onboarding-select-new"
                  onClick={() => {
                    setFlow("new");
                    setNewStep(0);
                    setErrorKey("");
                  }}
                >
                  {labels.authRegister}
                </Button>
                <Button
                  type="button"
                  variant="default"
                  data-testid="onboarding-select-existing"
                  onClick={() => {
                    setFlow("existing");
                    setErrorKey("");
                  }}
                >
                  {labels.authUseCode}
                </Button>
              </div>
            </div>
          ) : isExistingFlow ? (
            <div className="space-y-4" data-testid="onboarding-step-existing">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                  {labels.authUseCode}
                </div>
                <div className="hud-label">{labels.onboardingExistingHelp}</div>
              </div>
              <div>
                <label className="hud-label" htmlFor="auth-code">
                  {labels.authCodeLabel}
                </label>
                <Input
                  id="auth-code"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value.toUpperCase());
                    if (errorKey) setErrorKey("");
                  }}
                  placeholder={labels.authCodePlaceholder}
                  className="font-mono tracking-[0.2em]"
                  autoFocus
                />
                {errorKey ? (
                  <div className="mt-2 text-[11px] uppercase tracking-[0.08em] text-warn">
                    {labels[errorKey]}
                  </div>
                ) : (
                  <div className="mt-2 text-[11px] uppercase tracking-[0.08em] text-muted">
                    {labels.authCodeValid}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  data-testid="onboarding-back"
                  onClick={resetFlow}
                >
                  {labels.onboardingBack}
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  className="px-5"
                  disabled={submitting}
                >
                  {labels.syncUplink}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4" data-testid="onboarding-step-new">
              {newStep === 0 ? (
                <>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                      {labels.onboardingNewIntroTitle}
                    </div>
                    <div className="hud-label">{labels.onboardingNewIntroBody}</div>
                  </div>
                  <div>
                    <label className="hud-label" htmlFor="operator-name">
                      {labels.raiderNameLabel}
                    </label>
                    <Input
                      id="operator-name"
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value);
                        if (errorKey) setErrorKey("");
                      }}
                      placeholder={labels.callsignPlaceholder}
                      autoFocus
                    />
                    {errorKey ? (
                      <div className="mt-2 text-[11px] uppercase tracking-[0.08em] text-warn">
                        {labels[errorKey]}
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}
              {newStep === 1 ? (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                    {labels.onboardingProjectsTitle}
                  </div>
                  <div className="hud-label">{labels.onboardingProjectsBody}</div>
                  <div className="mt-3 space-y-3">
                    {onboardingLoading ? (
                      <div className="border border-frame2/70 bg-panel2/40 px-3 py-3 text-[11px] uppercase tracking-[0.12em] text-muted">
                        {labels.scanningProjectCache}
                      </div>
                    ) : nonExpeditionProjects.length ? (
                      <div className="space-y-2">
                        {nonExpeditionProjects.map((project) => {
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
                                {labels.completeLabel}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="border border-frame2/70 bg-panel2/40 px-3 py-3 text-[11px] uppercase tracking-[0.12em] text-muted">
                        {labels.dataNotFound}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
              {newStep === 2 ? (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                    {labels.onboardingExpeditionsTitle}
                  </div>
                  <div className="hud-label">{labels.onboardingExpeditionsBody}</div>
                  <div className="mt-3 space-y-3">
                    {onboardingLoading ? (
                      <div className="border border-frame2/70 bg-panel2/40 px-3 py-3 text-[11px] uppercase tracking-[0.12em] text-muted">
                        {labels.scanningProjectCache}
                      </div>
                    ) : expeditionProjects.length ? (
                      <>
                        <div className="hud-label">{labels.selectActiveExpedition}</div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => selectExpedition(null)}
                            aria-pressed={selectedExpeditionSlug === null}
                            data-testid="onboarding-expedition-active-none"
                            className={cn(
                              "h-8 border px-3 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
                              selectedExpeditionSlug === null
                                ? "border-accent/80 text-text"
                                : "border-frame2 text-muted hover:border-accent/60"
                            )}
                          >
                            {labels.onboardingNoExpeditions}
                          </button>
                          {expeditionProjects.map((project) => {
                            const selected = selectedExpeditionSlug === project.slug;
                            return (
                              <button
                                key={project.slug}
                                type="button"
                                onClick={() => selectExpedition(project.slug)}
                                aria-pressed={selected}
                                data-testid={`onboarding-expedition-active-${project.slug}`}
                                className={cn(
                                  "h-8 border px-3 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
                                  selected
                                    ? "border-accent/80 text-text"
                                    : "border-frame2 text-muted hover:border-accent/60"
                                )}
                              >
                                {project.name}
                              </button>
                            );
                          })}
                        </div>
                        {selectedExpedition ? (
                          <>
                            <div className="hud-label">
                              {labels.onboardingPhasesCompletedLabel}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {Array.from(
                                { length: selectedExpeditionPhaseMax + 1 },
                                (_, index) => index
                              ).map((phaseCount) => {
                                const selected =
                                  selectedExpeditionCompletedPhases === phaseCount;
                                return (
                                  <button
                                    key={`expedition-phase-count-${phaseCount}`}
                                    type="button"
                                    onClick={() =>
                                      setSelectedExpeditionCompletedPhases(phaseCount)
                                    }
                                    aria-pressed={selected}
                                    data-testid={`onboarding-expedition-phase-${phaseCount}`}
                                    className={cn(
                                      "h-8 min-w-8 border px-3 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
                                      selected
                                        ? "border-accent/80 text-text"
                                        : "border-frame2 text-muted hover:border-accent/60"
                                    )}
                                  >
                                    {phaseCount}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        ) : null}
                      </>
                    ) : (
                      <div className="border border-frame2/70 bg-panel2/40 px-3 py-3 text-[11px] uppercase tracking-[0.12em] text-muted">
                        {labels.noExpeditionsFound}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  data-testid="onboarding-back"
                  onClick={() => {
                    if (newStep === 0) {
                      resetFlow();
                      return;
                    }
                    setNewStep((prev) => Math.max(0, prev - 1));
                    setErrorKey("");
                  }}
                >
                  {labels.onboardingBack}
                </Button>
                {newStep < 2 ? (
                  <Button
                    type="button"
                    variant="primary"
                    className="px-5"
                    data-testid="onboarding-next"
                    onClick={() => {
                      if (newStep === 0) {
                        const trimmed = name.trim();
                        if (!trimmed) {
                          setErrorKey("nameRequired");
                          return;
                        }
                      }
                      setNewStep((prev) => Math.min(2, prev + 1));
                      setErrorKey("");
                    }}
                  >
                    {labels.onboardingNext}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    type="button"
                    className="px-5"
                    disabled={submitting}
                    data-testid="onboarding-submit"
                    onClick={submitNewFlow}
                  >
                    {labels.syncUplink}
                  </Button>
                )}
              </div>
            </div>
          )}
          {flow !== "entry" ? (
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-muted">
              <span>
                {isNewFlow ? `${newStep + 1} / 3` : "1 / 1"}
              </span>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
