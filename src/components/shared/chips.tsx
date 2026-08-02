import { cn } from "@/lib/utils";
import type { ChipTone } from "@/lib/format";
import type { ReactNode } from "react";

const toneClass: Record<ChipTone, string> = {
  neutral: "bg-muted/70 text-muted-foreground",
  positive: "bg-success/10 text-success",
  warning: "bg-warning/12 text-gold-foreground",
  critical: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
  gold: "bg-gold/12 text-gold-foreground",
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
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
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
