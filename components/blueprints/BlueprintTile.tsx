import blueprintBg from "@/blueprint-bg.webp";
import { cn } from "@/lib/cn";
import type { BlueprintItem } from "@/types/blueprints";

type BlueprintTileProps = {
  item: BlueprintItem;
  isOwned: boolean;
  holdItem: string | null;
  holdProgress: number;
  memberCount: number;
  ownerCount: number;
  onSelect: (item: BlueprintItem) => void;
  onHoldStart: (id: string) => void;
  onHoldCancel: () => void;
  shouldSuppressClick: () => boolean;
};

const HOLD_RING_RADIUS = 18;
const HOLD_RING_STROKE = 2;
const HOLD_RING_CIRC = 2 * Math.PI * HOLD_RING_RADIUS;

export function BlueprintTile({
  item,
  isOwned,
  holdItem,
  holdProgress,
  memberCount,
  ownerCount,
  onSelect,
  onHoldStart,
  onHoldCancel,
  shouldSuppressClick,
}: BlueprintTileProps) {
  const label = item.name.replace(/\s*Blueprint\s*$/i, "");
  const progressRatio = memberCount ? ownerCount / memberCount : 0;
  const progressPercent = Math.round(progressRatio * 100);
  const ringRadius = 6;
  const ringStroke = 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDash = progressRatio * ringCircumference;

  return (
    <button
      type="button"
      aria-pressed={isOwned}
      title={item.name}
      onContextMenu={(event) => event.preventDefault()}
      onClick={(event) => {
        if (shouldSuppressClick()) {
          event.preventDefault();
          return;
        }
        onSelect(item);
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        onHoldStart(item.id);
      }}
      onPointerUp={() => {
        if (holdItem === item.id) onHoldCancel();
      }}
      onPointerLeave={() => {
        if (holdItem === item.id) onHoldCancel();
      }}
      onPointerCancel={() => {
        if (holdItem === item.id) onHoldCancel();
      }}
      className={cn(
        "group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[8px] border bg-panel2/80 transition",
        "hover:border-accent/70 hover:bg-panel2/90",
        isOwned ? "border-accent/80 shadow-arcHover" : "border-frame2"
      )}
      style={{
        backgroundImage: `url(${blueprintBg.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        WebkitTouchCallout: "none",
      }}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          isOwned ? "opacity-100" : "opacity-90"
        )}
      >
        <div className="absolute inset-0 bg-panel/40" />
      </div>
      <span
        className={cn(
          "absolute left-2 top-2 text-[10px] font-semibold uppercase tracking-[0.12em]",
          isOwned ? "text-accent" : "text-muted"
        )}
      >
        {isOwned ? "Owned" : "Needed"}
      </span>
      {memberCount ? (
        <svg
          aria-hidden="true"
          data-community-progress={progressPercent}
          viewBox="0 0 16 16"
          className="absolute right-2 top-2 h-4 w-4"
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
            "absolute right-2 top-2 h-2 w-2 rounded-full",
            isOwned ? "bg-accent" : "bg-frame"
          )}
        />
      )}
      <img
        src={`/api/arc-items/image?file=${encodeURIComponent(item.imageFile)}`}
        alt=""
        loading="lazy"
        className={cn(
          "h-16 w-16 object-contain transition sm:h-20 sm:w-20",
          isOwned
            ? "opacity-100 drop-shadow-[0_0_6px_rgba(72,199,214,0.35)]"
            : "opacity-80 group-hover:opacity-100"
        )}
        draggable={false}
        onContextMenu={(event) => event.preventDefault()}
        style={{ WebkitTouchCallout: "none" }}
      />
      {holdItem === item.id ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 48 48" className="h-12 w-12">
            <circle
              cx="24"
              cy="24"
              r={HOLD_RING_RADIUS}
              fill="none"
              stroke="rgba(160, 180, 190, 0.35)"
              strokeWidth={HOLD_RING_STROKE}
            />
            <circle
              cx="24"
              cy="24"
              r={HOLD_RING_RADIUS}
              fill="none"
              stroke="rgba(72, 199, 214, 0.75)"
              strokeWidth={HOLD_RING_STROKE}
              strokeLinecap="square"
              strokeDasharray={`${holdProgress * HOLD_RING_CIRC} ${HOLD_RING_CIRC}`}
              transform="rotate(-90 24 24)"
            />
          </svg>
        </div>
      ) : null}
      <span className="line-clamp-2 absolute bottom-2 left-2 right-2 text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-text/90">
        {label}
      </span>
      {memberCount ? (
        <span className="sr-only">
          Community owned {ownerCount} of {memberCount}
        </span>
      ) : null}
      <span className="sr-only">{item.name}</span>
    </button>
  );
}
