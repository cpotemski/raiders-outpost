import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getInitials } from "@/lib/format";
import { CommunityNeedsPanel } from "@/components/community/CommunityNeedsPanel";
import { useLabels } from "@/components/locale/useLabels";
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
  const labels = useLabels();
  return (
    <>
      <div className="mt-6">
        <div className="hud-label">{labels.needsOverview}</div>
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
        <div className="hud-label">{labels.membersLabel}</div>
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
                    {labels.synced}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <Button
                  type="button"
                  variant="default"
                  className="px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-warn hover:border-warn/70"
                  aria-label={`${labels.severUplink} ${member.name}`}
                  disabled={removingId === member.id}
                  onClick={() => onRequestRemove(member)}
                >
                  {labels.severUplink}
                </Button>
              </div>
            </div>
          ))}
          <div
            className="flex flex-col gap-3 rounded-[6px] border border-frame2 bg-panel2/60 px-3 py-2"
            data-testid="community-invite-tile"
          >
            <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-text">
              {labels.inviteLinkTitle}
            </div>
            <Input
              readOnly
              value={inviteUrl}
              aria-label={labels.inviteLinkAria}
              className="font-mono text-[11px]"
            />
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted">
              {labels.inviteHelp}
            </div>
          </div>
        </div>
        {removeError ? (
          <div className="mt-3 text-[11px] uppercase tracking-[0.08em] text-warn">
            {removeError}
          </div>
        ) : null}
        <div
          className="mt-3 text-[10px] uppercase tracking-[0.16em] text-muted"
          data-testid="community-member-count"
        >
          {labels.membersLabel} ({community.members.length})
        </div>
      </div>
    </>
  );
}
