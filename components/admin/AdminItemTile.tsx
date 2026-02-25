"use client";

import { cn } from "@/lib/cn";
import {
  getItemLabel,
  getItemTileBackground,
} from "@/components/projects/itemTileUtils";
import { ItemTileLabel } from "@/components/items/ItemTileLabel";
import { ItemTileMedia } from "@/components/items/ItemTileMedia";
import { useLabels } from "@/components/locale/useLabels";

type AdminItemTileProps = {
  id: string;
  name: string;
  itemType: string;
  rarity: string;
  imageFile?: string | null;
  selected: boolean;
  onToggle: (itemId: string) => void;
};

export function AdminItemTile({
  id,
  name,
  itemType,
  rarity,
  imageFile,
  selected,
  onToggle,
}: AdminItemTileProps) {
  const labels = useLabels();
  const { itemBackground, isBlueprint } = getItemTileBackground({
    itemId: id,
    itemType,
    rarity,
  });

  const label = getItemLabel(name, id, isBlueprint);
  const resolvedImage = imageFile ?? (id.includes(".") ? id : `${id}.png`);

  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      data-testid={`admin-easy-item-${id}`}
      aria-pressed={selected}
      className={cn(
        "group relative flex aspect-square w-full max-w-[96px] justify-self-center lg:justify-self-start select-none items-center justify-center overflow-hidden rounded-[8px] border bg-panel2/80 text-left transition [-webkit-touch-callout:none]",
        "hover:border-accent/70 hover:bg-panel2/90",
        selected ? "border-accent/80 shadow-arcHover" : "border-frame2"
      )}
      style={{
        backgroundImage: itemBackground,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <span
        className={cn(
          "absolute left-2 top-2 z-20 text-[9px] font-semibold uppercase tracking-[0.12em]",
          selected ? "text-accent" : "text-muted"
        )}
      >
        {selected ? "Easy" : "Item"}
      </span>
      <ItemTileMedia
        imageFile={resolvedImage}
        wrapperClassName="pointer-events-none absolute inset-4 z-0 flex items-center justify-center sm:inset-4"
        imgClassName="h-full w-full object-contain opacity-90 drop-shadow-[0_0_6px_rgba(72,199,214,0.25)] transition group-hover:opacity-100"
        filterStyle="saturate(1.15) contrast(1.1) brightness(1.04)"
        fallback={
          <div className="absolute inset-4 z-0 flex items-center justify-center">
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted/70">
              {labels.notAvailable}
            </div>
          </div>
        }
      />
      <ItemTileLabel label={label} />
    </button>
  );
}
