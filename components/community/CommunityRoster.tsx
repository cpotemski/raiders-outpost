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

  if (!ready) {
    return <RosterStatus message="Syncing uplink..." />;
  }

  if (!identityName) {
    return <RosterStatus message="No operator linked." />;
  }

  if (!community) {
    return (
      <CommunityEmptyState
        inviteCode={inviteCode}
        status={status}
        error={error}
        name={name}
        onNameChange={onNameChange}
        onSubmit={onCreate}
      />
    );
  }

  return (
    <div className="border-t border-frame2 px-4 py-5">
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
  );
}
