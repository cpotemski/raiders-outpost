import { Suspense } from "react";
import { Panel } from "@/components/ui/Panel";
import { CommunityRoster } from "@/components/community/CommunityRoster";

export default function CommunityPage() {
  return (
    <Panel className="overflow-hidden">
      <div className="arc-panel-header flex-col items-start gap-2 sm:flex-row sm:items-center">
        <div>
          <p className="hud-label">Community</p>
          <h2 className="text-lg font-semibold uppercase tracking-[0.08em]">
            Roster
          </h2>
        </div>
        <span className="hud-label">ARC//</span>
      </div>
      <Suspense
        fallback={
          <div className="border-t border-frame2 px-4 py-5 text-sm uppercase tracking-[0.08em] text-muted">
            Scanning cache...
          </div>
        }
      >
        <CommunityRoster />
      </Suspense>
    </Panel>
  );
}
