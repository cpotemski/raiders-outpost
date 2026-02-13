"use client";

import { useMemo, useState } from "react";
import { useLocalIdentity } from "@/components/auth/useLocalIdentity";
import { useProjectContext } from "@/components/projects/ProjectContext";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  isExpeditionProjectSlug,
  orderExpeditionProjects,
} from "@/lib/expeditions";
import { useLabels } from "@/components/locale/useLabels";
import { copyTextToClipboard } from "@/lib/clipboard";
import { useAuthCode } from "@/hooks/useAuthCode";
import { useExpeditionSelection } from "@/hooks/useExpeditionSelection";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExpeditionResetDialog } from "@/components/expeditions/ExpeditionResetDialog";
import { useExpeditionReset } from "@/hooks/useExpeditionReset";
import { useLocale } from "@/components/locale/LocaleProvider";

export default function RaiderPage() {
  const { identity, ready, clearIdentity } = useLocalIdentity();
  const { allProjects, loading: projectsLoading, refreshProjects } =
    useProjectContext();
  const { locale } = useLocale();
  const labels = useLabels();
  const [copied, setCopied] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
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
    () => {
      const filtered = allProjects.filter((project) =>
        isExpeditionProjectSlug(project.slug)
      );
      return orderExpeditionProjects(filtered);
    },
    [allProjects]
  );
  const {
    saving: savingReset,
    errorKey: resetErrorKey,
    resetProgress,
  } = useExpeditionReset({
    token: identity?.token ?? null,
    locale,
    onInvalid: clearIdentity,
    onUpdated: refreshProjects,
  });

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
      <EmptyState className="px-2">
        {labels.noSignalRaiderNotLinked}
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      <Panel className="overflow-hidden">
        <div className="arc-panel-header">
          <span className="text-xs font-semibold uppercase tracking-[0.18em]">
            ARC // USER
          </span>
        </div>
        <div className="space-y-4 px-2 py-5">
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
                data-testid="operator-auth-code"
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
            <div className="mt-2 text-[10px] uppercase tracking-[0.12em] text-muted">
              {labels.authCodeHint}
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
                <div className="hud-empty-state flex h-8 items-center px-3 py-0 text-[10px] tracking-[0.16em]">
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
                <div className="hud-empty-state flex h-8 items-center px-3 py-0 text-[10px] tracking-[0.16em]">
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
          <div className="border-t border-frame2 pt-4">
            <div className="hud-label">{labels.expeditionResetLabel}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="default"
                className="px-3"
                data-testid="operator-expedition-reset-open"
                onClick={() => setResetDialogOpen(true)}
              >
                {labels.expeditionResetCta}
              </Button>
            </div>
          </div>
          <div className="border-t border-frame2 pt-4">
            <div className="flex items-center justify-between">
              <span className="hud-label">{labels.expeditionReady}</span>
              <Button
                type="button"
                variant="default"
                onClick={() => {
                  clearIdentity();
                }}
                className="px-3"
                data-testid="operator-logout"
              >
                {labels.logOut}
              </Button>
            </div>
          </div>
        </div>
      </Panel>
      {resetDialogOpen ? (
        <ExpeditionResetDialog
          onClose={() => setResetDialogOpen(false)}
          onConfirmReset={async (startNextExpedition) => {
            const success = await resetProgress(startNextExpedition);
            if (success) {
              setResetDialogOpen(false);
            }
            return success;
          }}
          loading={savingReset}
          error={resetErrorKey ? labels[resetErrorKey] : ""}
        />
      ) : null}
    </div>
  );
}
