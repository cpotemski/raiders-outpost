import { useEffect, useRef } from "react";
import blueprintBg from "@/blueprint-bg.webp";
import { cn } from "@/lib/cn";
import type { ProjectItemProgress } from "@/types/projects";

type ProjectItemTileProps = {
  item: ProjectItemProgress;
  memberCount: number;
  communityCount: number;
  onAdjust: (projectItemId: string, nextQuantity: number) => void;
  stripBlueprintLabel?: boolean;
};

export function ProjectItemTile({
  item,
  memberCount,
  communityCount,
  onAdjust,
  stripBlueprintLabel,
}: ProjectItemTileProps) {
  const rawLabel = item.displayName || item.itemId;
  const label = stripBlueprintLabel
    ? rawLabel.replace(/\s*blueprint$/i, "")
    : rawLabel;
  const isComplete =
    item.quantityRequired > 0 && item.quantityOwned >= item.quantityRequired;
  const progressRatio = memberCount ? communityCount / memberCount : 0;
  const progressPercent = Math.round(progressRatio * 100);
  const ringRadius = 6;
  const ringStroke = 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDash = progressRatio * ringCircumference;

  const canAdjust = Boolean(item.projectItemId);
  const canDecrement = canAdjust && item.quantityOwned > 0;
  const canIncrement =
    canAdjust && item.quantityOwned < item.quantityRequired;
  const canRepeat = item.quantityRequired >= 10;
  const repeatStep = canRepeat ? 10 : 1;
  const quantityRef = useRef(item.quantityOwned);
  const holdTimeout = useRef<number | null>(null);
  const holdInterval = useRef<number | null>(null);

  useEffect(() => {
    quantityRef.current = item.quantityOwned;
  }, [item.quantityOwned]);

  const clearHold = () => {
    if (holdTimeout.current) {
      window.clearTimeout(holdTimeout.current);
      holdTimeout.current = null;
    }
    if (holdInterval.current) {
      window.clearInterval(holdInterval.current);
      holdInterval.current = null;
    }
  };

  const applyDelta = (delta: number) => {
    if (!canAdjust) return;
    const next = Math.max(
      0,
      Math.min(item.quantityRequired, quantityRef.current + delta)
    );
    if (next === quantityRef.current) return;
    quantityRef.current = next;
    onAdjust(item.projectItemId, next);
  };

  const startHold = (delta: number) => {
    if (delta < 0 && !canDecrement) return;
    if (delta > 0 && !canIncrement) return;
    applyDelta(delta);
    if (!canRepeat) return;
    clearHold();
    holdTimeout.current = window.setTimeout(() => {
      holdInterval.current = window.setInterval(() => {
        applyDelta(delta < 0 ? -repeatStep : repeatStep);
      }, 120);
    }, 360);
  };

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
        backgroundImage: `url(${blueprintBg.src})`,
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
        <div className="absolute inset-0 bg-panel/40" />
      </div>
      <span
        className={cn(
          "absolute left-2 top-2 z-20 text-[10px] font-semibold uppercase tracking-[0.12em]",
          isComplete ? "text-accent" : "text-text"
        )}
        aria-label={`${item.quantityOwned} of ${item.quantityRequired}`}
      >
        {item.quantityOwned}/{item.quantityRequired}
      </span>
      <button
        type="button"
        data-testid="qty-minus"
        aria-label={`Decrease ${label}`}
        aria-hidden={!canDecrement}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          if (event.pointerType === "mouse") {
            event.preventDefault();
          }
          startHold(-1);
        }}
        onClick={() => applyDelta(-1)}
        onContextMenu={(event) => event.preventDefault()}
        onPointerUp={clearHold}
        onPointerLeave={clearHold}
        onPointerCancel={clearHold}
        className={cn(
          "absolute inset-y-0 left-0 z-20 flex w-1/2 select-none items-center justify-start px-2 text-lg font-semibold uppercase tracking-[0.2em] touch-manipulation [-webkit-touch-callout:none]",
          canDecrement ? "text-muted/70 hover:text-text" : "text-muted/30"
        )}
      >
        -
      </button>
      <button
        type="button"
        data-testid="qty-plus"
        aria-label={`Increase ${label}`}
        aria-hidden={!canIncrement}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          if (event.pointerType === "mouse") {
            event.preventDefault();
          }
          startHold(1);
        }}
        onClick={() => applyDelta(1)}
        onContextMenu={(event) => event.preventDefault()}
        onPointerUp={clearHold}
        onPointerLeave={clearHold}
        onPointerCancel={clearHold}
        className={cn(
          "absolute inset-y-0 right-0 z-20 flex w-1/2 select-none items-center justify-end px-2 text-lg font-semibold uppercase tracking-[0.2em] touch-manipulation [-webkit-touch-callout:none]",
          canIncrement ? "text-muted/70 hover:text-text" : "text-muted/30"
        )}
      >
        +
      </button>
      {memberCount ? (
        <svg
          aria-hidden="true"
          data-community-progress={progressPercent}
          viewBox="0 0 16 16"
          className="absolute right-2 top-2 z-20 h-4 w-4"
        >
          <circle
            cx="8"
            cy="8"
            r={ringRadius}
            fill="none"
            stroke="rgba(160, 180, 190, 0.35)"
            strokeWidth={ringStroke}
          />
          <circle
            cx="8"
            cy="8"
            r={ringRadius}
            fill="none"
            stroke="rgba(72, 199, 214, 0.75)"
            strokeWidth={ringStroke}
            strokeLinecap="square"
            strokeDasharray={`${ringDash} ${ringCircumference}`}
            transform="rotate(-90 8 8)"
          />
        </svg>
      ) : (
        <span
          className={cn(
            "absolute right-2 top-2 z-20 h-2 w-2 rounded-full",
            isComplete ? "bg-accent" : "bg-frame"
          )}
        />
      )}
      {item.imageFile ? (
        <div className="pointer-events-none absolute inset-6 z-0 flex items-center justify-center sm:inset-7">
          <img
            src={`/api/arc-items/image?file=${encodeURIComponent(
              item.imageFile
            )}`}
            alt=""
            loading="lazy"
            className={cn(
              "h-full w-full object-contain transition",
              isComplete
                ? "opacity-100 drop-shadow-[0_0_6px_rgba(72,199,214,0.35)]"
                : "opacity-85 group-hover:opacity-100"
            )}
            draggable={false}
          />
        </div>
      ) : (
        <div className="flex h-12 w-12 items-center justify-center text-[9px] uppercase tracking-[0.16em] text-muted">
          No Signal
        </div>
      )}
      <span className="line-clamp-2 absolute bottom-2 left-2 right-2 z-20 text-center text-[9px] font-semibold uppercase leading-tight tracking-[0.12em] text-text/90">
        {label}
      </span>
      <span className="sr-only">
        {label} {item.quantityOwned} of {item.quantityRequired}
      </span>
    </div>
  );
}
