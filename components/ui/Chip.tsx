import { cn } from "../../lib/cn";
import type { HTMLAttributes } from "react";

type ChipVariant = "neutral" | "accent" | "warn" | "good" | "bad";

type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: ChipVariant;
};

const variantClasses: Record<ChipVariant, string> = {
  neutral: "border-frame text-muted",
  accent: "border-accent text-accent",
  warn: "border-warn text-warn",
  good: "border-good text-good",
  bad: "border-bad text-bad",
};

export function Chip({ className, variant = "neutral", ...props }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[8px] border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
