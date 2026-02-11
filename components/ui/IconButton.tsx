import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  children: ReactNode;
};

export function IconButton({
  className,
  active = false,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-[6px] border text-text transition",
        active
          ? "border-accent/70 text-text"
          : "border-frame2/70 bg-panel2/40 text-muted hover:border-accent/70 hover:text-text",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
