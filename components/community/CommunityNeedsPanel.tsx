import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import type { CommunityNeedsItem, CommunityNeedsMember } from "@/types/community";
import { cn } from "@/lib/cn";
import { CommunityNeedTile } from "@/components/community/CommunityNeedTile";
import { useLabels } from "@/components/locale/useLabels";
import { useCommunityNeedsPanel } from "@/hooks/useCommunityNeedsPanel";

type CommunityNeedsPanelProps = {
  members: CommunityNeedsMember[];
  items: CommunityNeedsItem[];
  loading: boolean;
  storageKey?: string;
};

export function CommunityNeedsPanel({
  members,
  items,
  loading,
  storageKey,
}: CommunityNeedsPanelProps) {
  const labels = useLabels();
  const {
    selectedMembers,
    toggleMember,
    collapsedGroups,
    toggleGroup,
    activeItemId,
    setActiveItemId,
    activeItem,
    groupedItems,
    mounted,
  } = useCommunityNeedsPanel({
    members,
    items,
    unknownLabel: labels.unknownLabel,
    storageKey,
  });

  return (
    <div
      className="arc-panel arc-corners relative overflow-hidden"
      data-testid="community-needs-panel"
    >
      <div className="bg-panel/80 px-4 py-4">
        <div>
          <div className="hud-label flex items-center gap-2">
            <Filter className="h-3 w-3 text-muted" aria-hidden="true" />
            {labels.raiders}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {members.map((member) => {
              const active = selectedMembers.has(member.id);
              return (
                <button
                  key={member.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleMember(member.id)}
                  data-member-id={member.id}
                  className={cn(
                    "h-8 border px-3 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
                    active
                      ? "border-accent/80 text-text"
                      : "border-frame2 text-muted hover:border-accent/60"
                  )}
                >
                  {member.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 border-t border-frame2 pt-4">
          {loading ? null : groupedItems.length ? (
            <div className="mt-3 space-y-4">
              {groupedItems.map((group) => (
                <div key={group.type} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                    <span>{group.type}</span>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.type)}
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center border",
                        collapsedGroups.has(group.type)
                          ? "border-frame2 text-muted hover:border-accent/60"
                          : "border-accent/70 text-text"
                      )}
                      aria-expanded={!collapsedGroups.has(group.type)}
                      aria-controls={`needs-group-${group.type}`}
                      aria-label={
                        collapsedGroups.has(group.type) ? labels.show : labels.hide
                      }
                      title={
                        collapsedGroups.has(group.type) ? labels.show : labels.hide
                      }
                    >
                      {collapsedGroups.has(group.type) ? (
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {!collapsedGroups.has(group.type) ? (
                    <div
                      id={`needs-group-${group.type}`}
                      className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 lg:gap-1.5 xl:grid-cols-9 2xl:grid-cols-10"
                    >
                      {group.items.map((item) => (
                        <CommunityNeedTile
                          key={item.itemId}
                          item={item}
                          active={activeItemId === item.itemId}
                          onToggle={(itemId) =>
                            setActiveItemId((prev) =>
                              prev === itemId ? null : itemId
                            )
                          }
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 border border-frame2/70 bg-panel2/40 px-3 py-3 text-[11px] uppercase tracking-[0.12em] text-muted">
              {labels.noSignalDataNotFound}
            </div>
          )}
        </div>
      </div>
      {mounted && activeItem
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
              <button
                type="button"
                aria-label={labels.closeOverlay}
                onClick={() => setActiveItemId(null)}
                className="absolute inset-0 bg-panel/80"
                data-testid="community-need-backdrop"
              />
              <div
                className="relative arc-panel arc-corners w-full max-w-md border border-frame2 bg-panel/95 px-4 py-3 text-[11px] uppercase tracking-[0.12em] text-text/90 shadow-arcHover"
                data-testid="community-need-overlay"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[12px] font-semibold text-text">
                    {activeItem.displayName}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveItemId(null)}
                    className="border border-frame2 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-muted hover:border-accent/60 hover:text-text"
                  >
                    {labels.close}
                  </button>
                </div>
                <div className="mt-3 space-y-1">
                  {activeItem.memberNeeds.map((member) => (
                    <div
                      key={member.memberId}
                      className="flex items-center justify-between"
                      data-member-id={member.memberId}
                      data-needed={member.needed}
                    >
                      <span className="text-muted">{member.memberName}</span>
                      <span className="text-accent">{member.needed}x</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
