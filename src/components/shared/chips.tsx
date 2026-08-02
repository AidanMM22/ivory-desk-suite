import { cn } from "@/lib/utils";
import type { ChipTone } from "@/lib/format";
import type { ReactNode } from "react";

const toneClass: Record<ChipTone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  positive: "bg-secondary text-secondary-foreground border-primary/20",
  warning: "bg-warning/15 text-warning border-warning/30",
  critical: "bg-destructive/12 text-destructive border-destructive/25",
  info: "bg-info/12 text-info border-info/25",
  gold: "bg-gold/18 text-gold-foreground border-gold/35",
};

export function StatusChip({
  tone = "neutral",
  children,
  className,
  icon,
}: {
  tone?: ChipTone;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClass[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function ConsentChip({
  channel,
  state,
}: {
  channel: string;
  state: "granted" | "denied" | "pending";
}) {
  const tone: ChipTone =
    state === "granted" ? "positive" : state === "pending" ? "warning" : "critical";
  return (
    <StatusChip tone={tone}>
      {channel}: {state}
    </StatusChip>
  );
}