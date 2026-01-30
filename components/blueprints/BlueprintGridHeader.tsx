import { cn } from "@/lib/cn";

type BlueprintGridHeaderProps = {
  query: string;
  onQueryChange: (value: string) => void;
  showNeededOnly: boolean;
  onToggleNeededOnly: () => void;
  ownedCount: number;
  totalCount: number;
};

export function BlueprintGridHeader({
  query,
  onQueryChange,
  showNeededOnly,
  onToggleNeededOnly,
  ownedCount,
  totalCount,
}: BlueprintGridHeaderProps) {
  return (
    <div className="arc-panel-header flex-col items-start gap-3 sm:flex-row sm:items-center">
      <div>
        <p className="hud-label">Blueprints</p>
      </div>
      <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
        <label className="relative">
          <span className="sr-only">Quicksearch</span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="SEARCH..."
            className="h-8 w-28 border-b border-frame2 bg-transparent px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text placeholder:text-muted/70 focus:border-accent/60 focus:outline-none sm:w-44"
          />
        </label>
        <button
          type="button"
          aria-pressed={showNeededOnly}
          aria-label="Filter needed only"
          onClick={onToggleNeededOnly}
          className={cn(
            "h-8 border px-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
            showNeededOnly
              ? "border-accent/70 text-text"
              : "border-frame2 text-muted hover:border-accent/60"
          )}
        >
          Needed Only
        </button>
        <span className="hud-label">
          {ownedCount}/{totalCount}
        </span>
      </div>
    </div>
  );
}
