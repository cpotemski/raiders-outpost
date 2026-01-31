import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getInitials } from "@/lib/format";
import { CommunityNeedsPanel } from "@/components/community/CommunityNeedsPanel";
import type {
  Community,
  CommunityMember,
  CommunityNeedsPayload,
} from "@/types/community";

type CommunityOverviewProps = {
  community: Community;
  inviteUrl: string;
  removingId: string | null;
  removeError: string;
  needsPayload: CommunityNeedsPayload | null;
  needsLoading: boolean;
  onRequestRemove: (member: CommunityMember) => void;
};

export function CommunityOverview({
  community,
  inviteUrl,
  removingId,
  removeError,
  needsPayload,
  needsLoading,
  onRequestRemove,
}: CommunityOverviewProps) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="hud-label">Community Name</div>
          <div className="text-lg font-semibold uppercase tracking-[0.12em]">
            {community.name}
          </div>
        </div>
        <div className="text-right">
          <div className="hud-label">Members</div>
          <div className="text-sm font-semibold uppercase tracking-[0.12em]">
            {community.members.length} LINKED
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div>
          <div className="hud-label">Invite Link</div>
          <Input
            readOnly
            value={inviteUrl}
            aria-label="Invite link"
            className="mt-2 font-mono text-[11px]"
          />
        </div>
        <div className="text-[11px] uppercase tracking-[0.08em] text-muted">
          Share the uplink to sync more operators.
        </div>
      </div>

      <div className="mt-6">
        <CommunityNeedsPanel
          members={
            needsPayload?.members ??
            community.members.map((member) => ({
              id: member.id,
              name: member.name,
              joinedAt: member.joinedAt,
            }))
          }
          items={needsPayload?.items ?? []}
          loading={needsLoading}
        />
      </div>

      <div className="mt-6">
        <div className="hud-label">Members</div>
        <div className="mt-3 space-y-2">
          {community.members.map((member) => (
            <div
              key={member.id}
              className="flex flex-col gap-3 rounded-[6px] border border-frame2 bg-panel2/60 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-frame2/80 bg-panel text-[10px] font-semibold uppercase tracking-[0.14em] text-text">
                  {getInitials(member.name)}
                </span>
                <div className="leading-tight">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-text">
                    {member.name}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted">
                    Synced
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <Button
                  type="button"
                  variant="default"
                  className="px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-warn hover:border-warn/70"
                  aria-label={`Remove ${member.name}`}
                  disabled={removingId === member.id}
                  onClick={() => onRequestRemove(member)}
                >
                  Unlink
                </Button>
              </div>
            </div>
          ))}
        </div>
        {removeError ? (
          <div className="mt-3 text-[11px] uppercase tracking-[0.08em] text-warn">
            {removeError}
          </div>
        ) : null}
      </div>
    </>
  );
}
