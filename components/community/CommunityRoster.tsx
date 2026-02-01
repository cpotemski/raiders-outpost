"use client";

import { CommunityEmptyState } from "@/components/community/CommunityEmptyState";
import { CommunityOverview } from "@/components/community/CommunityOverview";
import { CommunityRemoveDialog } from "@/components/community/CommunityRemoveDialog";
import { RosterStatus } from "@/components/community/RosterStatus";
import { useCommunityRoster } from "@/hooks/useCommunityRoster";
import { useCommunityNeeds } from "@/hooks/useCommunityNeeds";

export function CommunityRoster() {
  const {
    ready,
    identityName,
    inviteCode,
    community,
    status,
    error,
    removeError,
    removingId,
    confirmMember,
    inviteUrl,
    name,
    setConfirmMember,
    onNameChange,
    onCreate,
    onRemove,
    resetRemoveError,
  } = useCommunityRoster();
  const { payload: needsPayload, loading: needsLoading } = useCommunityNeeds(
    Boolean(community)
  );

  let body = null;

  if (!ready) {
    body = <RosterStatus message="Syncing uplink..." />;
  } else if (!identityName) {
    body = <RosterStatus message="No raider linked." />;
  } else if (!community) {
    body = (
      <CommunityEmptyState
        inviteCode={inviteCode}
        status={status}
        error={error}
        name={name}
        onNameChange={onNameChange}
        onSubmit={onCreate}
      />
    );
  } else {
    body = (
      <CommunityOverview
        community={community}
        inviteUrl={inviteUrl}
        removingId={removingId}
        removeError={removeError}
        needsPayload={needsPayload}
        needsLoading={needsLoading}
        onRequestRemove={(member) => {
          resetRemoveError();
          setConfirmMember(member);
        }}
      />
    );
  }

  return (
    <>
      <div className="arc-panel-header flex-col items-start gap-2 sm:flex-row sm:items-center">
        <div>
          {!community ? <p className="hud-label">Community</p> : null}
          <h2 className="text-lg font-semibold uppercase tracking-[0.08em]">
            {community?.name ?? "Roster"}
          </h2>
        </div>
        <span className="hud-label">ARC//</span>
      </div>
      <div className="border-t border-frame2 px-4 py-5">
        {body}
        {confirmMember ? (
          <CommunityRemoveDialog
            member={confirmMember}
            removeError={removeError}
            removingId={removingId}
            onClose={() => setConfirmMember(null)}
            onConfirm={onRemove}
          />
        ) : null}
      </div>
    </>
  );
}
