"use client";

import { Input } from "@/components/ui/Input";
import { CommunityEmptyState } from "@/components/community/CommunityEmptyState";
import { CommunityOverview } from "@/components/community/CommunityOverview";
import { CommunityRemoveDialog } from "@/components/community/CommunityRemoveDialog";
import { RosterStatus } from "@/components/community/RosterStatus";
import { useCommunityRoster } from "@/hooks/useCommunityRoster";
import { useCommunityNeeds } from "@/hooks/useCommunityNeeds";
import { useLabels } from "@/components/locale/useLabels";
import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import type { KeyboardEvent } from "react";

export function CommunityRoster() {
  const labels = useLabels();
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
    renameCommunity,
  } = useCommunityRoster();
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftCommunityName, setDraftCommunityName] = useState(
    community?.name ?? ""
  );
  const [renameError, setRenameError] = useState("");
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    if (community && !isEditingName) {
      setDraftCommunityName(community.name);
    }
  }, [community, isEditingName]);

  const handleStartEditing = () => {
    if (!community) return;
    setDraftCommunityName(community.name);
    setRenameError("");
    setIsEditingName(true);
  };

  const handleCancelEditing = () => {
    setIsEditingName(false);
    setDraftCommunityName(community?.name ?? "");
    setRenameError("");
  };

  const handleRename = async () => {
    if (!community) return;
    const trimmed = draftCommunityName.trim();
    if (!trimmed) {
      setRenameError(labels.nameRequired);
      return;
    }
    if (trimmed === community.name) {
      setIsEditingName(false);
      setRenameError("");
      return;
    }
    setRenaming(true);
    const result = await renameCommunity(trimmed);
    setRenaming(false);
    if (result.success) {
      setIsEditingName(false);
      setRenameError("");
    } else {
      setRenameError(result.error ?? labels.updateFailed);
    }
  };

  const handleNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleRename();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      handleCancelEditing();
    }
  };
  const { payload: needsPayload, loading: needsLoading } = useCommunityNeeds(
    Boolean(community)
  );

  let body = null;

  if (!ready) {
    body = <RosterStatus message={labels.syncingUplink} />;
  } else if (!identityName) {
    body = <RosterStatus message={labels.noRaiderLinked} />;
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
          <p className="hud-label">
            {labels.communityLabel}
          </p>
          {community ? (
            <div className="flex flex-wrap items-center gap-3">
              {isEditingName ? (
                <>
                  <Input
                    value={draftCommunityName}
                    onChange={(event) => setDraftCommunityName(event.target.value)}
                    onKeyDown={handleNameKeyDown}
                    aria-label={labels.communityNameLabel}
                    className="h-8 min-w-[180px] text-[11px] font-semibold uppercase tracking-[0.12em]"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="h-8 border border-accent px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent transition hover:border-accent/80"
                    onClick={handleRename}
                    disabled={renaming}
                    aria-busy={renaming || undefined}
                  >
                    {labels.confirm}
                  </button>
                  <button
                    type="button"
                    className="h-8 border border-frame2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted transition hover:border-accent/60 hover:text-text"
                    onClick={handleCancelEditing}
                  >
                    {labels.cancel}
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold uppercase tracking-[0.08em]">
                    {community.name}
                  </h2>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center border border-frame2 text-muted transition hover:border-accent/60 hover:text-text"
                    onClick={handleStartEditing}
                    aria-label={labels.edit}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          ) : (
            <h2 className="text-lg font-semibold uppercase tracking-[0.08em]">
              {labels.rosterTitle}
            </h2>
          )}
          {renameError ? (
            <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-warn">
              {renameError}
            </div>
          ) : null}
        </div>
      </div>
      <div className="border-t border-frame2 px-2 py-5">
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
