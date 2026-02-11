"use client";

import { Input } from "@/components/ui/Input";
import { CommunityEmptyState } from "@/components/community/CommunityEmptyState";
import { CommunityRemoveDialog } from "@/components/community/CommunityRemoveDialog";
import { RosterStatus } from "@/components/community/RosterStatus";
import { CommunityNeedsPanel } from "@/components/community/CommunityNeedsPanel";
import { useCommunityRoster } from "@/hooks/useCommunityRoster";
import { useCommunityNeeds } from "@/hooks/useCommunityNeeds";
import { useLabels } from "@/components/locale/useLabels";
import { useMemo, useState } from "react";
import { Filter, Pencil } from "lucide-react";
import { cn } from "@/lib/cn";
import { getInitials } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import type { CommunityMember } from "@/types/community";

type ConfirmTarget = {
  communityId: string;
  member: CommunityMember;
};

export function CommunityRoster() {
  const labels = useLabels();
  const {
    ready,
    identityName,
    inviteCode,
    communities,
    selectedCommunityIds,
    selectedCommunities,
    status,
    error,
    removeError,
    removingId,
    name,
    toggleCommunity,
    getInviteUrl,
    onNameChange,
    onCreate,
    onRemove,
    resetRemoveError,
    renameCommunity,
  } = useCommunityRoster();

  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [editingCommunityId, setEditingCommunityId] = useState<string | null>(null);
  const [draftCommunityName, setDraftCommunityName] = useState("");
  const [renameError, setRenameError] = useState("");
  const [renaming, setRenaming] = useState(false);

  const selectedCommunityIdList = useMemo(
    () => selectedCommunities.map((community) => community.id),
    [selectedCommunities]
  );

  const { payload: needsPayload, loading: needsLoading } = useCommunityNeeds(
    Boolean(communities.length),
    selectedCommunityIdList
  );

  const startEditCommunity = (communityId: string, currentName: string) => {
    setEditingCommunityId(communityId);
    setDraftCommunityName(currentName);
    setRenameError("");
  };

  const cancelEditCommunity = () => {
    setEditingCommunityId(null);
    setDraftCommunityName("");
    setRenameError("");
  };

  const saveCommunityName = async (communityId: string, currentName: string) => {
    const trimmed = draftCommunityName.trim();
    if (!trimmed) {
      setRenameError(labels.nameRequired);
      return;
    }
    if (trimmed === currentName) {
      cancelEditCommunity();
      return;
    }

    setRenaming(true);
    const result = await renameCommunity(communityId, trimmed);
    setRenaming(false);
    if (!result.success) {
      setRenameError(result.error ?? labels.updateFailed);
      return;
    }
    cancelEditCommunity();
  };

  let body = null;

  if (!ready) {
    body = <RosterStatus message={labels.syncingUplink} />;
  } else if (!identityName) {
    body = <RosterStatus message={labels.noRaiderLinked} />;
  } else if (!communities.length) {
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
      <div className="space-y-6">
        <div className="arc-panel">
          <div className="bg-panel/80 px-2 py-2">
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted" aria-hidden="true" />
              <span className="hud-label">{labels.selectCommunities}</span>
              {communities.map((community) => {
                const active = selectedCommunityIds.has(community.id);
                return (
                  <button
                    key={community.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleCommunity(community.id)}
                    data-testid={`community-filter-${community.id}`}
                    className={cn(
                      "h-6 border px-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
                      active
                        ? "border-accent/80 text-text"
                        : "border-frame2 text-muted hover:border-accent/60"
                    )}
                  >
                    {community.name}
                  </button>
                );
              })}
            </div>

            {selectedCommunities.length ? (
              <div className="mt-3 border-t border-frame2 pt-3">
                <CommunityNeedsPanel
                  members={needsPayload?.members ?? []}
                  items={needsPayload?.items ?? []}
                  loading={needsLoading}
                  storageKey={`community-filter-${selectedCommunityIdList.join("-")}`}
                />
              </div>
            ) : (
              <div className="mt-3 text-[10px] uppercase tracking-[0.16em] text-muted">
                {labels.noCommunitiesSelected}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="hud-label">{labels.manageCommunities}</div>
          <div className="mt-3 space-y-3" data-testid="community-management-list">
            {communities.map((community) => {
              const isEditing = editingCommunityId === community.id;
              const inviteUrl = getInviteUrl(community);
              return (
                <div
                  key={community.id}
                  className="arc-panel overflow-hidden"
                  data-testid={`community-manage-${community.id}`}
                >
                  <div className="arc-panel-header flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Input
                            value={draftCommunityName}
                            onChange={(event) => setDraftCommunityName(event.target.value)}
                            aria-label={labels.communityNameLabel}
                            className="h-8 min-w-[180px] text-[11px] font-semibold uppercase tracking-[0.12em]"
                            autoFocus
                          />
                          <button
                            type="button"
                            className="h-8 border border-accent px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent transition hover:border-accent/80"
                            onClick={() => saveCommunityName(community.id, community.name)}
                            disabled={renaming}
                            aria-busy={renaming || undefined}
                          >
                            {labels.confirm}
                          </button>
                          <button
                            type="button"
                            className="h-8 border border-frame2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted transition hover:border-accent/60 hover:text-text"
                            onClick={cancelEditCommunity}
                          >
                            {labels.cancel}
                          </button>
                        </>
                      ) : (
                        <>
                          <h3 className="font-semibold uppercase tracking-[0.08em]">{community.name}</h3>
                          <button
                            type="button"
                            className="flex h-6 w-6 items-center justify-center border border-frame2 text-muted transition hover:border-accent/60 hover:text-text"
                            onClick={() => startEditCommunity(community.id, community.name)}
                            aria-label={labels.edit}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>
                    <span className="hud-label">{community.members.length} {labels.raiders}</span>
                  </div>

                  <div className="border-t border-frame2 bg-panel/80 px-2 py-3">
                    {isEditing && renameError ? (
                      <div className="mb-2 text-[11px] uppercase tracking-[0.08em] text-warn">
                        {renameError}
                      </div>
                    ) : null}

                    <div className="space-y-2" data-testid={`community-members-${community.id}`}>
                      {community.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex flex-col gap-3 rounded-[6px] border border-frame2 bg-panel2/60 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-frame2/80 bg-panel text-[10px] font-semibold uppercase tracking-[0.14em] text-text">
                              {getInitials(member.name)}
                            </span>
                            <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-text">
                              {member.name}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="default"
                            className="px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-warn hover:border-warn/70"
                            aria-label={`${labels.severUplink} ${member.name}`}
                            disabled={removingId === member.id}
                            onClick={() => {
                              resetRemoveError();
                              setConfirmTarget({ communityId: community.id, member });
                            }}
                          >
                            {labels.severUplink}
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div
                      className="mt-3 flex flex-col gap-3 rounded-[6px] border border-frame2 bg-panel2/60 px-3 py-2"
                      data-testid={`community-invite-tile-${community.id}`}
                    >
                      <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-text">
                        {labels.inviteLinkTitle}
                      </div>
                      <Input
                        readOnly
                        value={inviteUrl}
                        aria-label={labels.inviteLinkAria}
                        className="font-mono text-[11px]"
                        data-testid={`community-invite-${community.id}`}
                      />
                      <div className="text-[10px] uppercase tracking-[0.16em] text-muted">
                        {labels.inviteHelp}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {removeError ? (
              <div className="text-[11px] uppercase tracking-[0.08em] text-warn">{removeError}</div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="arc-panel-header flex-col items-start gap-2 sm:flex-row sm:items-center">
        <div>
          <p className="hud-label">{labels.communityLabel}</p>
          <h3 className="font-semibold uppercase tracking-[0.08em]">{labels.rosterTitle}</h3>
        </div>
      </div>
      <div className="border-t border-frame2 px-2 py-5">
        {body}
        {confirmTarget ? (
          <CommunityRemoveDialog
            member={confirmTarget.member}
            removeError={removeError}
            removingId={removingId}
            onClose={() => setConfirmTarget(null)}
            onConfirm={(memberId) => onRemove(confirmTarget.communityId, memberId)}
          />
        ) : null}
      </div>
    </>
  );
}
