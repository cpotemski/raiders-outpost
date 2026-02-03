import { cn } from "@/lib/cn";

type ItemTileLabelProps = {
  label: string;
  className?: string;
};

export function ItemTileLabel({ label, className }: ItemTileLabelProps) {
  const trimmedLabel = label.trim();
  const splitIndex = trimmedLabel.indexOf(" (");
  const hasSecondary = splitIndex > -1;
  const primaryLabel = hasSecondary
    ? trimmedLabel.slice(0, splitIndex)
    : trimmedLabel;
  const secondaryLabel = hasSecondary
    ? trimmedLabel.slice(splitIndex).trim()
    : null;

  return (
    <span
      title={trimmedLabel}
      className={cn(
        "absolute bottom-2 left-2 right-2 z-20 text-center text-[8px] font-semibold uppercase tracking-[0.12em] text-text/90",
        "whitespace-normal break-words leading-tight",
        className
      )}
    >
      <span className="block leading-tight">{primaryLabel}</span>
      {secondaryLabel ? (
        <span className="block text-[7px] uppercase tracking-[0.1em] text-text/70">
          {secondaryLabel}
        </span>
      ) : null}
    </span>
  );
}
