"use client";

import { useMemo, useState } from "react";
import { useLocalIdentity } from "@/components/auth/useLocalIdentity";
import { useProjectContext } from "@/components/projects/ProjectContext";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { isExpeditionProjectSlug } from "@/lib/expeditions";
import { useLabels } from "@/components/locale/useLabels";
import { copyTextToClipboard } from "@/lib/clipboard";
import { useAuthCode } from "@/hooks/useAuthCode";
import { useExpeditionSelection } from "@/hooks/useExpeditionSelection";

export default function RaiderPage() {
  const { identity, ready, clearIdentity } = useLocalIdentity();
  const { allProjects, loading: projectsLoading, refreshProjects } =
    useProjectContext();
  const labels = useLabels();
  const [copied, setCopied] = useState(false);
  const { authCode } = useAuthCode(identity?.token ?? null);
  const {
    activeExpeditionSlug,
    loading: loadingExpedition,
    saving: savingExpedition,
    errorKey: expeditionErrorKey,
    setExpedition,
  } = useExpeditionSelection({
    token: identity?.token ?? null,
    onInvalid: clearIdentity,
    onUpdated: () => refreshProjects(),
  });

  const onCopy = async () => {
    if (!authCode) return;
    await copyTextToClipboard(authCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const expeditionProjects = useMemo(
    () =>
      allProjects
        .filter((project) => isExpeditionProjectSlug(project.slug))
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allProjects]
  );

  const activeExpeditionLabel = useMemo(() => {
    if (!activeExpeditionSlug) return labels.noExpedition;
    return (
      expeditionProjects.find(
        (project) => project.slug === activeExpeditionSlug
      )?.name ?? labels.unknownExpedition
    );
  }, [activeExpeditionSlug, expeditionProjects, labels]);

  if (!ready) return null;

  if (!identity) {
    return (
      <div className="arc-panel arc-corners border border-frame2/70 bg-panel2/40 px-4 py-4 text-[11px] uppercase tracking-[0.12em] text-muted">
        {labels.noSignalRaiderNotLinked}
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
          <span className="hud-label">{labels.localLabel}</span>
        </div>
        <div className="space-y-4 px-4 py-5">
          <div>
            <div className="hud-label">{labels.raiderLabel}</div>
            <div className="text-sm font-semibold uppercase tracking-[0.12em]">
              {identity.name}
            </div>
          </div>
          <div>
            <div className="hud-label">{labels.authCodeLabel}</div>
            <div className="mt-2 flex flex-wrap items-start gap-2">
              <div
                className="flex-1 rounded-[8px] border border-frame bg-panel2 px-3 py-2 font-mono text-[12px] text-text tracking-[0.2em]"
                aria-label={labels.authCodeValueAria}
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
                {copied ? labels.copied : labels.copy}
              </Button>
            </div>
          </div>
          <div>
            <div className="hud-label">{labels.activeExpeditionLabel}</div>
            <div
              className="mt-2 flex flex-wrap items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted"
              data-testid="expedition-config"
            >
              <span>{activeExpeditionLabel}</span>
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
                {labels.noExpedition}
              </button>
              {projectsLoading && !expeditionProjects.length ? (
                <div className="flex h-8 items-center border border-frame2/70 bg-panel2/40 px-3 text-[10px] uppercase tracking-[0.16em] text-muted">
                  {labels.scanningExpeditionIndex}
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
                  {labels.noSignalExpeditionData}
                </div>
              )}
            </div>
            {expeditionErrorKey ? (
              <div className="mt-2 text-[11px] uppercase tracking-[0.08em] text-warn">
                {labels[expeditionErrorKey]}
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-between">
            <span className="hud-label">{labels.expeditionReady}</span>
            <Button
              type="button"
              variant="default"
              onClick={() => {
                clearIdentity();
              }}
              className="px-3"
            >
              {labels.logOut}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
