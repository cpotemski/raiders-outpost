import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { CommunityNeedsItem, CommunityNeedsMember } from "@/types/community";
import { cn } from "@/lib/cn";
import { CommunityNeedTile } from "@/components/community/CommunityNeedTile";

type CommunityNeedsPanelProps = {
  members: CommunityNeedsMember[];
  items: CommunityNeedsItem[];
  loading: boolean;
};

export function CommunityNeedsPanel({
  members,
  items,
  loading,
}: CommunityNeedsPanelProps) {
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    () => new Set(members.map((member) => member.id))
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set()
  );
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSelectedMembers(new Set(members.map((member) => member.id)));
  }, [members]);

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const groupedItems = useMemo(() => {
    const rarityOrder = new Map([
      ["Legendary", 0],
      ["Epic", 1],
      ["Rare", 2],
      ["Uncommon", 3],
      ["Common", 4],
      ["Unknown", 5],
    ]);
    const filtered = items
      .map((item) => {
        const memberNeeds = item.memberNeeds.filter((member) =>
          selectedMembers.has(member.memberId)
        );
        const totalNeeded = memberNeeds.reduce(
          (sum, entry) => sum + entry.needed,
          0
        );
        return {
          ...item,
          memberNeeds,
          totalNeeded,
        };
      })
      .filter((item) => item.totalNeeded > 0)
      ;

    const groups = new Map<string, typeof filtered>();
    for (const item of filtered) {
      const key = item.itemType || "Unknown";
      const group = groups.get(key) ?? [];
      group.push(item);
      groups.set(key, group);
    }

    const sortedGroups = Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    return sortedGroups.map(([type, group]) => {
      const sorted = group.slice().sort((a, b) => {
        const rarityA = rarityOrder.get(a.rarity) ?? 99;
        const rarityB = rarityOrder.get(b.rarity) ?? 99;
        if (rarityA !== rarityB) return rarityA - rarityB;
        return a.displayName.localeCompare(b.displayName);
      });
      return { type, items: sorted };
    });
  }, [items, selectedMembers]);

  const activeItem = useMemo(() => {
    if (!activeItemId) return null;
    for (const group of groupedItems) {
      const match = group.items.find((entry) => entry.itemId === activeItemId);
      if (match) return match;
    }
    return null;
  }, [activeItemId, groupedItems]);

  useEffect(() => {
    if (!activeItemId) return;
    const itemIds = new Set(
      groupedItems.flatMap((group) => group.items.map((item) => item.itemId))
    );
    if (!itemIds.has(activeItemId)) {
      setActiveItemId(null);
    }
  }, [activeItemId, groupedItems]);

  return (
    <div
      className="arc-panel arc-corners relative overflow-hidden"
      data-testid="community-needs-panel"
    >
      <div className="bg-panel/80 px-4 py-4">
        <div>
          <div className="hud-label">Include Raiders</div>
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
          {loading ? (
            <div className="mt-3 text-[11px] uppercase tracking-[0.12em] text-muted">
              Scanning cache...
            </div>
          ) : groupedItems.length ? (
            <div className="mt-3 space-y-4">
              {groupedItems.map((group) => (
                <div key={group.type} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                    <span>{group.type}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedGroups((prev) => {
                          const next = new Set(prev);
                          if (next.has(group.type)) {
                            next.delete(group.type);
                          } else {
                            next.add(group.type);
                          }
                          return next;
                        })
                      }
                      className={cn(
                        "h-6 border px-2 text-[9px] uppercase tracking-[0.16em]",
                        collapsedGroups.has(group.type)
                          ? "border-frame2 text-muted hover:border-accent/60"
                          : "border-accent/70 text-text"
                      )}
                      aria-expanded={!collapsedGroups.has(group.type)}
                      aria-controls={`needs-group-${group.type}`}
                    >
                      {collapsedGroups.has(group.type) ? "Show" : "Hide"}
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
              No signal. Data not found.
            </div>
          )}
        </div>
      </div>
      {mounted && activeItem
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
              <button
                type="button"
                aria-label="Close overlay"
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
                    Close
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
