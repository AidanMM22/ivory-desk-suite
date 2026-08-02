import type {
  AppointmentStatus,
  AutomationStatus,
  LeadStage,
  Role,
} from "./mock/types";

export const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** ISO string -> "Aug 2" (timezone-stable: parses the literal string) */
export const shortDate = (iso: string) => {
  const [datePart] = iso.split("T");
  const [, m, dd] = (datePart ?? "").split("-");
  return `${MONTHS[Number(m) - 1] ?? ""} ${Number(dd)}`;
};

/** ISO string -> "3:30p" */
export const clockTime = (iso: string) => {
  const time = iso.split("T")[1] ?? "00:00";
  const [hRaw, min] = time.split(":");
  const h = Number(hRaw);
  const suffix = h >= 12 ? "p" : "a";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${min}${suffix}`;
};

export const dateTime = (iso: string) => `${shortDate(iso)} · ${clockTime(iso)}`;

export const isSameDay = (iso: string, dayStr: string) => iso.startsWith(dayStr);

export const minutesFromMidnight = (iso: string) => {
  const time = iso.split("T")[1] ?? "00:00";
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
};

export const addMinutesLabel = (iso: string, minutes: number) => {
  const total = minutesFromMidnight(iso) + minutes;
  const h = Math.floor(total / 60);
  const m = total % 60;
  const suffix = h >= 12 ? "p" : "a";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")}${suffix}`;
};

export const leadStages: { key: LeadStage; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "booking_pending", label: "Booking Pending" },
  { key: "booked", label: "Booked" },
  { key: "lost", label: "Lost" },
];

export const stageLabel = (stage: LeadStage) =>
  leadStages.find((s) => s.key === stage)?.label ?? stage;

export const appointmentStatusLabel: Record<AppointmentStatus, string> = {
  confirmed: "Confirmed",
  pending: "Pending",
  checked_in: "Checked in",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export const automationStatusLabel: Record<AutomationStatus, string> = {
  active: "Active",
  paused: "Paused",
  draft: "Draft",
};

export const roleLabel: Record<Role, string> = {
  owner: "Owner",
  front_desk: "Front Desk",
  therapist: "Therapist",
};

export type ChipTone = "neutral" | "positive" | "warning" | "critical" | "info" | "gold";

export const stageTone: Record<LeadStage, ChipTone> = {
  new: "info",
  contacted: "neutral",
  qualified: "gold",
  booking_pending: "warning",
  booked: "positive",
  lost: "critical",
};

export const appointmentTone: Record<AppointmentStatus, ChipTone> = {
  confirmed: "positive",
  pending: "warning",
  checked_in: "info",
  completed: "neutral",
  cancelled: "critical",
  no_show: "critical",
};

export const initialsOf = (name: string) =>
  name
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");