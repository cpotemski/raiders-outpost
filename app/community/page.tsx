import { Suspense } from "react";
import { Panel } from "@/components/ui/Panel";
import { CommunityRoster } from "@/components/community/CommunityRoster";
import { CommunityFallback } from "@/components/community/CommunityFallback";

export default function CommunityPage() {
  return (
    <Panel className="overflow-hidden">
      <Suspense fallback={<CommunityFallback />}>
        <CommunityRoster />
      </Suspense>
    </Panel>
  );
}
