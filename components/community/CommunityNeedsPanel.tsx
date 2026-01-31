import { useEffect, useMemo, useState } from "react";
import type { CommunityNeedsItem, CommunityNeedsMember } from "@/types/community";
import { cn } from "@/lib/cn";

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
  const rarityColor = useMemo(
    () =>
      new Map<string, string>([
        ["Common", "#6D6F78"],
        ["Uncommon", "#5DBC63"],
        ["Rare", "#4BA7EC"],
        ["Epic", "#BD3F95"],
        ["Legendary", "#F6C844"],
      ]),
    []
  );
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    () => new Set(members.map((member) => member.id))
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set()
  );

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

  return (
    <div
      className="arc-panel arc-corners overflow-hidden"
      data-testid="community-needs-panel"
    >
      <div className="bg-panel/80 px-4 py-4">
        <div>
          <div className="hud-label">Include Operators</div>
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
                      className="space-y-2"
                    >
                      {group.items.map((item) => (
                        <div
                          key={item.itemId}
                          data-item-id={item.itemId}
                          data-total-needed={item.totalNeeded}
                          className="border border-frame2/70 bg-panel2/60 px-3 py-2"
                        >
                          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                            <div className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-text">
                              <span className="text-accent">
                                {item.totalNeeded}x
                              </span>
                              <span
                                className="truncate"
                                style={{
                                  color:
                                    rarityColor.get(item.rarity) ??
                                    "rgba(232, 224, 208, 0.7)",
                                }}
                              >
                                {item.displayName}
                              </span>
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.14em] text-muted">
                              {item.memberNeeds.map((member) => (
                                <span key={member.memberId} className="mr-2">
                                  {member.memberName} {member.needed}x
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
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
    </div>
  );
}
