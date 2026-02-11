import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function EmptyState({ className, children, ...props }: EmptyStateProps) {
  return (
    <div className={cn("hud-empty-state", className)} {...props}>
      {children}
    </div>
  );
}
