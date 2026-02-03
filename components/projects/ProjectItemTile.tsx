import { useMemo } from "react";
import { cn } from "@/lib/cn";
import type { ProjectItemProgress } from "@/types/projects";
import {
  getItemLabel,
  getItemTileBackground,
} from "@/components/projects/itemTileUtils";
import { useLabels } from "@/components/locale/useLabels";
import { useQuantityPress } from "@/hooks/useQuantityPress";
import { ItemTileMedia } from "@/components/items/ItemTileMedia";
import { ProgressRing } from "@/components/ui/ProgressRing";

type ProjectItemTileProps = {
  item: ProjectItemProgress;
  memberCount: number;
  expeditionMemberCountsBySlug: Record<string, number>;
  communityCount: number;
  onAdjust: (projectItemId: string, nextQuantity: number) => void;
  stripBlueprintLabel?: boolean;
};

export function ProjectItemTile({
  item,
  memberCount,
  expeditionMemberCountsBySlug,
  communityCount,
  onAdjust,
  stripBlueprintLabel,
}: ProjectItemTileProps) {
  const labels = useLabels();
  const label = getItemLabel(
    item.displayName,
    item.itemId,
    stripBlueprintLabel
  );
  const isComplete =
    item.quantityRequired > 0 && item.quantityOwned >= item.quantityRequired;
  const expeditionMemberCount =
    item.isExpedition && item.projectSlug
      ? expeditionMemberCountsBySlug[item.projectSlug] ?? 0
      : memberCount;
  const progressRatio = expeditionMemberCount
    ? communityCount / expeditionMemberCount
    : 0;
  const progressPercent = Math.round(progressRatio * 100);
  const canAdjust = Boolean(item.projectItemId);
  const canDecrement = canAdjust && item.quantityOwned > 0;
  const canIncrement =
    canAdjust && item.quantityOwned < item.quantityRequired;
  const repeatStep = Math.max(1, Math.floor(item.quantityRequired * 0.1));
  const { minusHandlers, plusHandlers, applyDelta } = useQuantityPress({
    value: item.quantityOwned,
    min: 0,
    max: item.quantityRequired,
    repeatStep,
    enabled: canAdjust,
    onChange: (next) => onAdjust(item.projectItemId, next),
  });
  const { itemBackground } = getItemTileBackground({
    itemId: item.itemId,
    itemType: item.itemType,
    rarity: item.rarity,
  });
  const controlInteractionClasses =
    "transition-colors duration-150 focus-visible:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60 focus-visible:ring-offset-panel2 focus-visible:ring-offset-2";

  const mediaFallback = useMemo(
    () => (
      <div className="flex h-12 w-12 items-center justify-center text-[9px] uppercase tracking-[0.16em] text-muted">
        {labels.noSignalTitle}
      </div>
    ),
    [labels.noSignalTitle]
  );

  return (
    <div
      data-item-id={item.itemId}
      data-quantity={item.quantityOwned}
      data-required={item.quantityRequired}
      className={cn(
        "group relative flex aspect-square w-full select-none items-center justify-center overflow-hidden rounded-[8px] border bg-panel2/80 transition [-webkit-touch-callout:none]",
        "hover:border-accent/70 hover:bg-panel2/90",
        isComplete ? "border-accent/80 shadow-arcHover" : "border-frame2"
      )}
      style={{
        backgroundImage: itemBackground,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-10",
          isComplete ? "opacity-100" : "opacity-90"
        )}
      >
        <div className="absolute inset-0 bg-transparent" />
      </div>
      <span
        className={cn(
          "absolute left-2 top-2 z-20 inline-flex min-w-[48px] text-[10px] font-semibold uppercase tracking-[0.12em]",
          isComplete ? "text-accent" : "text-text"
        )}
        aria-label={`${item.quantityOwned} ${labels.of} ${item.quantityRequired}`}
      >
        {item.quantityOwned}/{item.quantityRequired}
      </span>
      <button
        type="button"
        data-testid="qty-minus"
        aria-label={`${labels.decrease} ${label}`}
        aria-hidden={!canDecrement}
        onPointerDown={minusHandlers.onPointerDown}
        onPointerMove={minusHandlers.onPointerMove}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            applyDelta(-1);
          }
        }}
        onContextMenu={(event) => event.preventDefault()}
        onPointerUp={minusHandlers.onPointerUp}
        onPointerLeave={minusHandlers.onPointerLeave}
        onPointerCancel={minusHandlers.onPointerCancel}
        className={cn(
          "absolute inset-y-0 left-0 z-20 flex w-1/2 select-none items-center justify-start px-2 text-lg font-semibold uppercase tracking-[0.2em] touch-manipulation [-webkit-touch-callout:none]",
          controlInteractionClasses,
          canDecrement ? "text-accent/80 hover:text-accent" : "text-muted/30"
        )}
      >
        -
      </button>
      <button
        type="button"
        data-testid="qty-plus"
        aria-label={`${labels.increase} ${label}`}
        aria-hidden={!canIncrement}
        onPointerDown={plusHandlers.onPointerDown}
        onPointerMove={plusHandlers.onPointerMove}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            applyDelta(1);
          }
        }}
        onContextMenu={(event) => event.preventDefault()}
        onPointerUp={plusHandlers.onPointerUp}
        onPointerLeave={plusHandlers.onPointerLeave}
        onPointerCancel={plusHandlers.onPointerCancel}
        className={cn(
          "absolute inset-y-0 right-0 z-20 flex w-1/2 select-none items-center justify-end px-2 text-lg font-semibold uppercase tracking-[0.2em] touch-manipulation [-webkit-touch-callout:none]",
          controlInteractionClasses,
          canIncrement ? "text-accent/80 hover:text-accent" : "text-muted/30"
        )}
      >
        +
      </button>
      {memberCount ? (
        <ProgressRing
          radius={6}
          strokeWidth={2}
          progress={progressRatio}
          data-community-progress={progressPercent}
          className="absolute right-2 top-2 z-20 h-4 w-4"
        />
      ) : (
        <span
          className={cn(
            "absolute right-2 top-2 z-20 h-2 w-2 rounded-full",
            isComplete ? "bg-accent" : "bg-frame"
          )}
        />
      )}
      <ItemTileMedia
        imageFile={item.imageFile}
        wrapperClassName="pointer-events-none absolute inset-6 z-0 flex items-center justify-center sm:inset-7"
        imgClassName={cn(
          "h-full w-full object-contain transition",
          isComplete
            ? "opacity-100 drop-shadow-[0_0_10px_rgba(72,199,214,0.45)]"
            : "opacity-90 drop-shadow-[0_0_6px_rgba(72,199,214,0.25)] group-hover:opacity-100"
        )}
        filterStyle="saturate(1.18) contrast(1.12) brightness(1.06)"
        fallback={mediaFallback}
      />
      <span className="absolute bottom-2 left-2 right-2 z-20 text-center text-[9px] font-semibold uppercase leading-tight tracking-[0.12em] text-text/90 whitespace-normal break-words break-all">
        {label}
      </span>
      <span className="sr-only">
        {label} {item.quantityOwned} {labels.of} {item.quantityRequired}
      </span>
    </div>
  );
}
