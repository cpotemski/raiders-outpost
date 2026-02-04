"use client";

import { useLabels } from "@/components/locale/useLabels";

export function CommunityFallback() {
  const labels = useLabels();
  return (
    <>
      <div className="arc-panel-header flex-col items-start gap-2 sm:flex-row sm:items-center">
        <div>
          <p className="hud-label">{labels.communityLabel}</p>
          <h2 className="text-lg font-semibold uppercase tracking-[0.08em]">
            {labels.rosterTitle}
          </h2>
        </div>
        <span className="hud-label">ARC //</span>
      </div>
      <div className="border-t border-frame2 px-2 py-5 text-sm uppercase tracking-[0.08em] text-muted" />
    </>
  );
}
