"use client";

import { useMemo, useState } from "react";
import { BlueprintDetailDialog } from "@/components/blueprints/BlueprintDetailDialog";
import { BlueprintGridHeader } from "@/components/blueprints/BlueprintGridHeader";
import { BlueprintTile } from "@/components/blueprints/BlueprintTile";
import { useBlueprintOwnership } from "@/hooks/useBlueprintOwnership";
import { useHoldToggle } from "@/hooks/useHoldToggle";
import type { BlueprintItem } from "@/types/blueprints";

type BlueprintGridProps = {
  items: BlueprintItem[];
};

export function BlueprintGrid({ items }: BlueprintGridProps) {
  const [query, setQuery] = useState("");
  const [activeItem, setActiveItem] = useState<BlueprintItem | null>(null);
  const [showNeededOnly, setShowNeededOnly] = useState(false);
  const {
    owned,
    communityMembers,
    ownershipByItem,
    viewerId,
    toggleOwned,
  } = useBlueprintOwnership();
  const { holdItem, holdProgress, startHold, cancelHold, shouldSuppressClick } =
    useHoldToggle({ onTrigger: toggleOwned });

  const ordered = useMemo(() => {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = ordered;
    if (showNeededOnly) {
      result = result.filter((item) => !owned.has(item.id));
    }
    if (!q) return result;
    return result.filter((item) => item.name.toLowerCase().includes(q));
  }, [ordered, owned, query, showNeededOnly]);

  return (
    <>
      <BlueprintGridHeader
        query={query}
        onQueryChange={setQuery}
        showNeededOnly={showNeededOnly}
        onToggleNeededOnly={() => setShowNeededOnly((prev) => !prev)}
        ownedCount={owned.size}
        totalCount={ordered.length}
      />

      <div className="relative arc-noise">
        <div className="border-t border-frame2 bg-panel/80 px-4 py-5">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
            {filtered.map((item) => {
              const isOwned = owned.has(item.id);
              const ownerCount = ownershipByItem[item.id]?.length ?? 0;
              return (
                <BlueprintTile
                  key={item.id}
                  item={item}
                  isOwned={isOwned}
                  holdItem={holdItem}
                  holdProgress={holdProgress}
                  memberCount={communityMembers.length}
                  ownerCount={ownerCount}
                  onSelect={setActiveItem}
                  onHoldStart={startHold}
                  onHoldCancel={cancelHold}
                  shouldSuppressClick={shouldSuppressClick}
                />
              );
            })}
          </div>
        </div>
      </div>

      {activeItem ? (
        <BlueprintDetailDialog
          item={activeItem}
          owned={owned.has(activeItem.id)}
          communityMembers={communityMembers}
          ownershipByItem={ownershipByItem}
          viewerId={viewerId}
          onClose={() => setActiveItem(null)}
          onToggleOwned={toggleOwned}
        />
      ) : null}
    </>
  );
}
