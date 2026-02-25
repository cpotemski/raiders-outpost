"use client";

import { Input } from "@/components/ui/Input";
import { CommunityEmptyState } from "@/components/community/CommunityEmptyState";
import { CommunityCreateDialog } from "@/components/community/CommunityCreateDialog";
import { CommunityInviteDialog } from "@/components/community/CommunityInviteDialog";
import { CommunityRemoveDialog } from "@/components/community/CommunityRemoveDialog";
import { RosterStatus } from "@/components/community/RosterStatus";
import { CommunityNeedsPanel } from "@/components/community/CommunityNeedsPanel";
import { useCommunityRoster } from "@/hooks/useCommunityRoster";
import { useCommunityNeeds } from "@/hooks/useCommunityNeeds";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { useLabels } from "@/components/locale/useLabels";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ClipboardList,
  Copy,
  Filter,
  ListChecks,
  Plus,
  Pencil,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { getInitials } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import type { CommunityMember } from "@/types/community";

type ConfirmTarget = {
  communityId: string;
  member: CommunityMember;
};

type InviteTarget = {
  communityId: string;
  communityName: string;
  inviteUrl: string;
};

type CommunityMode = "needs" | "manage";

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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<InviteTarget | null>(null);
  const [expandedCommunityId, setExpandedCommunityId] = useState<string | null>(null);
  const previousStatusRef = useRef(status);
  const [mode, setMode] = useLocalStorageState<CommunityMode>(
    "community-mode",
    "needs",
    {
      serialize: (value) => value,
      deserialize: (raw) => (raw === "manage" ? "manage" : "needs"),
    }
  );
  const [hideEasyItems, setHideEasyItems] = useLocalStorageState<boolean>(
    "community-needs-hide-easy",
    true,
    {
      serialize: (value) => (value ? "1" : "0"),
      deserialize: (raw) => raw !== "0",
    }
  );
  const activeMode: CommunityMode = communities.length ? mode : "manage";

  const selectedCommunityIdList = useMemo(
    () => selectedCommunities.map((community) => community.id),
    [selectedCommunities]
  );

  const { payload: needsPayload, loading: needsLoading } = useCommunityNeeds(
    Boolean(communities.length) && activeMode === "needs",
    selectedCommunityIdList,
    hideEasyItems
  );
  const managedCommunities = useMemo(() => {
    const sorted = [...communities];
    sorted.sort((a, b) => {
      const createdAtDiff =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (createdAtDiff !== 0) return createdAtDiff;
      return a.name.localeCompare(b.name);
    });
    return sorted;
  }, [communities]);

  useEffect(() => {
    if (
      createDialogOpen &&
      previousStatusRef.current === "saving" &&
      status === "idle" &&
      !error
    ) {
      setCreateDialogOpen(false);
    }
    previousStatusRef.current = status;
  }, [createDialogOpen, error, status]);

  const startEditCommunity = (communityId: string, currentName: string) => {
    setEditingCommunityId(communityId);
    setExpandedCommunityId(communityId);
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

  const modeSwitch =
    ready && identityName ? (
      <div data-testid="community-mode-switch">
        <div className="flex w-full rounded-[6px] border border-frame bg-panel overflow-hidden">
          <button
            type="button"
            aria-pressed={activeMode === "needs"}
            disabled={!communities.length}
            onClick={() => setMode("needs")}
            data-testid="community-mode-needs"
            className={cn(
              "h-9 flex-1 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
              "inline-flex items-center justify-center gap-2",
              activeMode === "needs"
                ? "bg-panel2 text-text"
                : "text-muted hover:text-text",
              !communities.length && "cursor-not-allowed opacity-60"
            )}
          >
            <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
            {labels.communityModeNeeds}
          </button>
          <button
            type="button"
            aria-pressed={activeMode === "manage"}
            onClick={() => setMode("manage")}
            data-testid="community-mode-manage"
            className={cn(
              "h-9 flex-1 border-l border-frame px-3 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
              "inline-flex items-center justify-center gap-2",
              activeMode === "manage"
                ? "bg-panel2 text-text"
                : "text-muted hover:text-text"
            )}
          >
            <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
            {labels.communityModeManage}
          </button>
        </div>
      </div>
    ) : null;

  let body = null;

  if (!ready) {
    body = <RosterStatus message={labels.syncingUplink} />;
  } else if (!identityName) {
    body = <RosterStatus message={labels.noRaiderLinked} />;
  } else if (!communities.length) {
    body = (
      <div
        className="arc-panel overflow-hidden"
        data-testid="community-empty-panel"
      >
        <div className="arc-panel-header">
          <h3 className="font-semibold uppercase tracking-[0.08em]">
            {labels.manageCommunities}
          </h3>
        </div>
        <div className="border-t border-frame2 bg-panel/80 px-3 py-4">
          <CommunityEmptyState
            inviteCode={inviteCode}
            status={status}
            error={error}
            name={name}
            onNameChange={onNameChange}
            onSubmit={onCreate}
          />
        </div>
      </div>
    );
  } else if (activeMode === "needs") {
    body = (
      <div className="arc-panel overflow-hidden" data-testid="community-needs-mode">
        <div className="arc-panel-header flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-semibold uppercase tracking-[0.08em]">
            {labels.communityModeNeeds}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <IconButton
              type="button"
              aria-pressed={hideEasyItems}
              aria-label={labels.hideEasyItems}
              onClick={() => setHideEasyItems((prev) => !prev)}
              data-testid="community-filter-hide-easy"
              active={hideEasyItems}
            >
              <ListChecks className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">{labels.hideEasyItems}</span>
            </IconButton>
          </div>
        </div>
        <div className="border-t border-frame2 px-2 py-3">
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
            <CommunityNeedsPanel
              members={needsPayload?.members ?? []}
              items={needsPayload?.items ?? []}
              loading={needsLoading}
              storageKey={`community-filter-${selectedCommunityIdList.join("-")}`}
            />
          ) : (
            <div className="mt-3 text-[10px] uppercase tracking-[0.16em] text-muted">
              {labels.noCommunitiesSelected}
            </div>
          )}
        </div>
      </div>
    );
  } else {
    body = (
      <div className="arc-panel overflow-hidden" data-testid="community-manage-mode">
        <div className="arc-panel-header">
          <div className="flex w-full items-center justify-between gap-3">
            <h3 className="font-semibold uppercase tracking-[0.08em]">
              {labels.communityModeManage}
            </h3>
            <button
              type="button"
              className="inline-flex h-7 items-center gap-1.5 border border-frame2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted transition hover:border-accent/60 hover:text-text"
              onClick={() => setCreateDialogOpen(true)}
              data-testid="community-create-open"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {labels.createShort}
            </button>
          </div>
        </div>
        <div className="border-t border-frame2 px-2 py-3">
          <div className="space-y-3" data-testid="community-management-list">
            {managedCommunities.map((community) => {
                const isExpanded = expandedCommunityId === community.id;
                const isEditing = editingCommunityId === community.id;
                const inviteUrl = getInviteUrl(community);

                return (
                  <div
                    key={community.id}
                    className="rounded-[6px] border border-frame2 bg-panel2/50"
                    data-testid={`community-manage-${community.id}`}
                  >
                    <div className="flex flex-wrap items-center gap-2 px-2 py-2">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-2"
                        onClick={() =>
                          setExpandedCommunityId((prev) =>
                            prev === community.id ? null : community.id
                          )
                        }
                        aria-expanded={isExpanded}
                        data-testid={`community-toggle-${community.id}`}
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted transition-transform",
                            isExpanded && "rotate-180"
                          )}
                          aria-hidden="true"
                        />
                        <span className="truncate text-[12px] font-semibold uppercase tracking-[0.12em] text-text">
                          {community.name}
                        </span>
                        <span className="hud-label">
                          {community.members.length} {labels.raiders}
                        </span>
                      </button>

                      <button
                        type="button"
                        className="inline-flex h-7 items-center gap-1.5 border border-frame2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted transition hover:border-accent/60 hover:text-text"
                        onClick={() =>
                          setInviteTarget({
                            communityId: community.id,
                            communityName: community.name,
                            inviteUrl,
                          })
                        }
                        data-testid={`community-copy-invite-${community.id}`}
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        {labels.inviteAction}
                      </button>

                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center border border-frame2 text-muted transition hover:border-accent/60 hover:text-text"
                        onClick={() => startEditCommunity(community.id, community.name)}
                        aria-label={labels.edit}
                        data-testid={`community-edit-${community.id}`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    {isExpanded ? (
                      <div className="border-t border-frame2 bg-panel/80 px-2 py-3">
                        {isEditing ? (
                          <div className="rounded-[6px] border border-frame2 bg-panel2/60 px-2 py-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Input
                                value={draftCommunityName}
                                onChange={(event) => setDraftCommunityName(event.target.value)}
                                aria-label={labels.communityNameLabel}
                                className="h-8 min-w-[200px] text-[11px] font-semibold uppercase tracking-[0.12em]"
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
                            </div>
                            {renameError ? (
                              <div className="mt-2 text-[11px] uppercase tracking-[0.08em] text-warn">
                                {renameError}
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        <div
                          className={cn("space-y-2", isEditing ? "mt-3" : "")}
                          data-testid={`community-members-${community.id}`}
                        >
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
                                aria-label={`${labels.removeMember} ${member.name}`}
                                disabled={removingId === member.id}
                                onClick={() => {
                                  resetRemoveError();
                                  setConfirmTarget({ communityId: community.id, member });
                                }}
                              >
                                {labels.removeMember}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}

            {removeError ? (
              <div className="text-[11px] uppercase tracking-[0.08em] text-warn">
                {removeError}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-2 py-5">
      {modeSwitch}
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
      {createDialogOpen ? (
        <CommunityCreateDialog
          status={status}
          error={error}
          name={name}
          onNameChange={onNameChange}
          onSubmit={onCreate}
          onClose={() => setCreateDialogOpen(false)}
        />
      ) : null}
      {inviteTarget ? (
        <CommunityInviteDialog
          communityName={inviteTarget.communityName}
          inviteUrl={inviteTarget.inviteUrl}
          onClose={() => setInviteTarget(null)}
        />
      ) : null}
    </div>
  );
}
