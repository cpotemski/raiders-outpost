import { cn } from "../../lib/cn";
import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-[10px] border border-frame bg-panel2 px-3 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none",
        className
      )}
      {...props}
    />
  );
}
