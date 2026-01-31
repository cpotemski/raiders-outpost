import { useEffect, useRef } from "react";
import type { PointerEvent } from "react";
import blueprintBg from "@/blueprint-bg.webp";
import { cn } from "@/lib/cn";
import type { ProjectItemProgress } from "@/types/projects";

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
  const rawLabel = item.displayName || item.itemId;
  const label = stripBlueprintLabel
    ? rawLabel
        .replace(/^\s*(blueprint|bauplan)\s*:\s*/i, "")
        .replace(/\s*(blueprint|bauplan)\s*$/i, "")
        .trim()
    : rawLabel;
  const rarityKey = (item.rarity || "unknown")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  const rarityColor =
    {
      common: "var(--rarity-common)",
      uncommon: "var(--rarity-uncommon)",
      rare: "var(--rarity-rare)",
      epic: "var(--rarity-epic)",
      legendary: "var(--rarity-legendary)",
    }[rarityKey] ?? null;
  const isBlueprint =
    item.itemType.toLowerCase() === "blueprint" ||
    /_blueprint$/i.test(item.itemId);
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
  const ringRadius = 6;
  const ringStroke = 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDash = progressRatio * ringCircumference;

  const canAdjust = Boolean(item.projectItemId);
  const canDecrement = canAdjust && item.quantityOwned > 0;
  const canIncrement =
    canAdjust && item.quantityOwned < item.quantityRequired;
  const repeatStep = Math.max(1, Math.floor(item.quantityRequired * 0.1));
  const quantityRef = useRef(item.quantityOwned);
  const holdTimeout = useRef<number | null>(null);
  const holdInterval = useRef<number | null>(null);
  const minusPress = useRef({
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    holdStarted: false,
    pressTimeout: null as number | null,
  });
  const plusPress = useRef({
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    holdStarted: false,
    pressTimeout: null as number | null,
  });

  useEffect(() => {
    quantityRef.current = item.quantityOwned;
  }, [item.quantityOwned]);

  useEffect(() => {
    return () => {
      clearHold();
      if (minusPress.current.pressTimeout) {
        window.clearTimeout(minusPress.current.pressTimeout);
      }
      if (plusPress.current.pressTimeout) {
        window.clearTimeout(plusPress.current.pressTimeout);
      }
    };
  }, []);

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

  const startHold = (delta: number, initialDelta = delta) => {
    if (delta < 0 && !canDecrement) return;
    if (delta > 0 && !canIncrement) return;
    applyDelta(initialDelta);
    clearHold();
    holdTimeout.current = window.setTimeout(() => {
      holdInterval.current = window.setInterval(() => {
        applyDelta(delta < 0 ? -repeatStep : repeatStep);
      }, 240);
    }, 360);
  };

  const pressDelayMs = 140;
  const moveThreshold = 8;

  const createPressHandlers = (
    delta: number,
    pressRef: typeof minusPress
  ) => {
    const resetPressState = () => {
      if (pressRef.current.pressTimeout) {
        window.clearTimeout(pressRef.current.pressTimeout);
      }
      pressRef.current.pressTimeout = null;
      pressRef.current.pointerId = null;
      pressRef.current.holdStarted = false;
    };

    const cancelPress = () => {
      resetPressState();
      clearHold();
    };

    return {
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        if (event.pointerType === "mouse") {
          event.preventDefault();
          startHold(delta);
          return;
        }

        pressRef.current.pointerId = event.pointerId;
        pressRef.current.startX = event.clientX;
        pressRef.current.startY = event.clientY;
        pressRef.current.holdStarted = false;
        if (pressRef.current.pressTimeout) {
          window.clearTimeout(pressRef.current.pressTimeout);
        }
        pressRef.current.pressTimeout = window.setTimeout(() => {
          pressRef.current.holdStarted = true;
          startHold(delta, delta < 0 ? -repeatStep : repeatStep);
        }, pressDelayMs);
        event.currentTarget.setPointerCapture?.(event.pointerId);
      },
      onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
        if (pressRef.current.pointerId !== event.pointerId) return;
        const dx = event.clientX - pressRef.current.startX;
        const dy = event.clientY - pressRef.current.startY;
        if (Math.hypot(dx, dy) > moveThreshold) {
          cancelPress();
        }
      },
      onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
        if (pressRef.current.pointerId !== event.pointerId) {
          clearHold();
          return;
        }

        if (pressRef.current.pressTimeout) {
          window.clearTimeout(pressRef.current.pressTimeout);
          pressRef.current.pressTimeout = null;
          if (!pressRef.current.holdStarted) {
            applyDelta(delta);
          }
        }
        resetPressState();
        clearHold();
      },
      onPointerLeave: cancelPress,
      onPointerCancel: cancelPress,
    };
  };

  const minusHandlers = createPressHandlers(-1, minusPress);
  const plusHandlers = createPressHandlers(1, plusPress);
  const rarityTint = rarityColor
    ? {
        strong: `color-mix(in srgb, ${rarityColor} 55%, transparent)`,
        mid: `color-mix(in srgb, ${rarityColor} 32%, transparent)`,
        low: `color-mix(in srgb, ${rarityColor} 18%, transparent)`,
      }
    : null;
  const itemBackground = isBlueprint
    ? `url(${blueprintBg.src})`
    : rarityTint
      ? [
          `radial-gradient(120% 120% at 20% 18%, ${rarityTint.strong} 0%, transparent 55%)`,
          `linear-gradient(135deg, ${rarityTint.mid} 0%, ${rarityTint.low} 42%, rgba(7, 10, 16, 0.92) 100%)`,
        ].join(", ")
      : "linear-gradient(135deg, rgba(18, 24, 40, 0.75), rgba(7, 10, 16, 0.9))";

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
                ? "opacity-100 drop-shadow-[0_0_10px_rgba(72,199,214,0.45)]"
                : "opacity-90 drop-shadow-[0_0_6px_rgba(72,199,214,0.25)] group-hover:opacity-100"
            )}
            style={{
              filter: "saturate(1.18) contrast(1.12) brightness(1.06)",
            }}
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
