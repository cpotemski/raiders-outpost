"use client";

import { CommunityNeedsPanel } from "@/components/community/CommunityNeedsPanel";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLabels } from "@/components/locale/useLabels";
import { usePublicProfileNeeds } from "@/hooks/usePublicProfileNeeds";

type PublicProfileViewProps = {
  slug: string;
};

export function PublicProfileView({ slug }: PublicProfileViewProps) {
  const labels = useLabels();
  const { payload, loading, notFound } = usePublicProfileNeeds(slug);

  return (
    <Panel className="overflow-hidden" data-testid="public-profile-panel">
      <div className="arc-panel-header">
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">
          ARC // {labels.publicProfileLabel}
        </span>
      </div>
      <div className="space-y-4 border-t border-frame2 px-2 py-5">
        {notFound ? (
          <EmptyState>{labels.publicProfileNotFound}</EmptyState>
        ) : (
          <>
            <div>
              <div className="hud-label">{labels.raiderLabel}</div>
              <div
                className="text-sm font-semibold uppercase tracking-[0.12em]"
                data-testid="public-profile-name"
              >
                {payload?.name ?? (loading ? labels.scanning : labels.noSignalTitle)}
              </div>
            </div>
            <CommunityNeedsPanel
              members={payload?.members ?? []}
              items={payload?.items ?? []}
              loading={loading}
              storageKey={`public-profile-${slug}`}
            />
          </>
        )}
      </div>
    </Panel>
  );
}
