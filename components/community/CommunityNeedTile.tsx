"use client";

import type { CommunityNeedsItem } from "@/types/community";
import { cn } from "@/lib/cn";
import {
  getItemLabel,
  getItemTileBackground,
} from "@/components/projects/itemTileUtils";
import { useLabels } from "@/components/locale/useLabels";
import { ItemTileMedia } from "@/components/items/ItemTileMedia";

type CommunityNeedTileProps = {
  item: CommunityNeedsItem;
  active: boolean;
  onToggle: (itemId: string) => void;
};

export function CommunityNeedTile({
  item,
  active,
  onToggle,
}: CommunityNeedTileProps) {
  const labels = useLabels();
  const { itemBackground, isBlueprint } = getItemTileBackground({
    itemId: item.itemId,
    itemType: item.itemType,
    rarity: item.rarity,
  });
  const label = getItemLabel(item.displayName, item.itemId, isBlueprint);
  const imageFile =
    item.imageFile ??
    (item.itemId.includes(".") ? item.itemId : `${item.itemId}.png`);

  return (
    <button
      type="button"
      data-item-id={item.itemId}
      data-total-needed={item.totalNeeded}
      data-testid={`community-need-${item.itemId}`}
      aria-expanded={active}
      onClick={() => onToggle(item.itemId)}
      className={cn(
        "group relative flex aspect-square w-full select-none items-center justify-center overflow-hidden rounded-[8px] border bg-panel2/80 text-left transition [-webkit-touch-callout:none]",
        "hover:border-accent/70 hover:bg-panel2/90",
        active ? "border-accent/80 shadow-arcHover" : "border-frame2"
      )}
      style={{
        backgroundImage: itemBackground,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="absolute inset-0 bg-transparent" />
      </div>
      <span className="absolute left-2 top-2 z-20 text-[10px] font-semibold uppercase tracking-[0.12em] text-text">
        {item.totalNeeded}x
      </span>
      <ItemTileMedia
        imageFile={imageFile}
        wrapperClassName="pointer-events-none absolute inset-6 z-0 flex items-center justify-center sm:inset-7"
        imgClassName="h-full w-full object-contain opacity-90 drop-shadow-[0_0_6px_rgba(72,199,214,0.25)] transition group-hover:opacity-100"
        filterStyle="saturate(1.15) contrast(1.1) brightness(1.04)"
        fallback={
          <div className="absolute inset-4 z-0 flex items-center justify-center">
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted/70">
              {labels.noSignalTitle}
            </div>
          </div>
        }
      />
      <span className="line-clamp-2 absolute bottom-2 left-2 right-2 z-20 text-center text-[9px] font-semibold uppercase leading-tight tracking-[0.12em] text-text/90">
        {label}
      </span>
      <span className="sr-only">
        {label} {labels.needsVerb} {item.totalNeeded}
      </span>
    </button>
  );
}
