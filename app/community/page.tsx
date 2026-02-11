import { Suspense } from "react";
import { CommunityRoster } from "@/components/community/CommunityRoster";
import { CommunityFallback } from "@/components/community/CommunityFallback";

export default function CommunityPage() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<CommunityFallback />}>
        <CommunityRoster />
      </Suspense>
    </div>
  );
}
