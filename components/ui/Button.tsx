import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "default" | "primary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-[10px] border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition";

const variantClasses: Record<ButtonVariant, string> = {
  default: "border-frame text-text hover:border-accent/70",
  primary: "border-accent bg-accent/15 text-text hover:border-accent",
  ghost: "border-transparent text-muted hover:text-text",
};

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(baseClasses, variantClasses[variant], className)}
      {...props}
    />
  );
}
