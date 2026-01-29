import { cn } from "../../lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

type PanelProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Panel({ className, children, ...props }: PanelProps) {
  return (
    <div className={cn("arc-panel arc-corners", className)} {...props}>
      {children}
    </div>
  );
}
