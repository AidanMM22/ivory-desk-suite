import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { TherapistAvailabilityEditor } from "@/components/layout/quick-actions";
import { PageHeader, SectionTitle } from "@/components/shared/page";
import { appointments, locations, serviceByKey, services, therapists } from "@/lib/data";
import { useCrmData } from "@/lib/crm-data";
import { clockTime, dateTime, initialsOf } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

const percent = (n: number) => `${Math.round(n * (n <= 1 ? 100 : 1))}%`;
import type { DayAvailability, ServiceKey, Therapist, Weekday } from "@/lib/types";

const scheduleTime = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  const period = (hours ?? 0) >= 12 ? "PM" : "AM";
  return `${(hours ?? 0) % 12 || 12}:${String(minutes ?? 0).padStart(2, "0")} ${period}`;
};

const WEEKDAYS: Weekday[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface TherapistDraft {
  name: string;
  title: string;
  serviceKey: ServiceKey;
  licensedSince: string;
  locationId: string;
  active: boolean;
  weeklyAvailability: DayAvailability[];
}

const therapistDraft = (therapist: Therapist): TherapistDraft => ({
  name: therapist.name,
  title: therapist.title,
  serviceKey: therapist.specialties[0] ?? "unspecified",
  licensedSince: String(therapist.licensedSince),
  locationId: therapist.locationId,
  active: therapist.active,
  weeklyAvailability:
    therapist.weeklyAvailability?.map((day) => ({ ...day })) ??
    WEEKDAYS.map((day) => ({ day, unavailable: false, start: "09:00", end: "17:00" })),
});

const availabilitySummary = (schedule: DayAvailability[]) => {
  const available = schedule.filter((day) => !day.unavailable);
  if (available.length === 0) return "No weekly availability";
  const sameHours = available.every(
    (day) => day.start === available[0]?.start && day.end === available[0]?.end,
  );
  return sameHours
    ? `${available.length} days · ${scheduleTime(available[0]!.start)}–${scheduleTime(available[0]!.end)}`
    : `${available.length} days with custom hours`;
};

const invalidAvailability = (schedule: DayAvailability[]) =>
  schedule.some((day) => !day.unavailable && day.start >= day.end);

export const Route = createFileRoute("/therapists")({
  head: () => ({
    meta: [
      { title: "Therapists — M&M Spa CRM" },
      {
        name: "description",
        content:
          "Massage therapist roster for M&M Massage Spa: availability, specialties, utilization, rebooking, and review ratings.",
      },
      { property: "og:title", content: "Therapists — M&M Spa CRM" },
      { property: "og:description", content: "Staff availability and performance at a glance." },
    ],
  }),
  component: TherapistsPage,
});

function TherapistsPage() {
  const { setQuickAction } = useWorkspace();
  const { persistRecord, removeRecord } = useCrmData();
  const [detail, setDetail] = useState<Therapist | null>(null);
  const [editing, setEditing] = useState<Therapist | null>(null);
  const [draft, setDraft] = useState<TherapistDraft | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openEditor = (therapist: Therapist) => {
    setDetail(null);
    setEditing(therapist);
    setDraft(therapistDraft(therapist));
  };

  return (
    <div className="mx-auto max-w-[1300px] space-y-6">
      <PageHeader
        title="Therapists"
        description={`${therapists.length} licensed therapists · Tacoma, WA`}
        actions={
          <Button onClick={() => setQuickAction("therapist")}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add therapist
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {therapists.map((t) => (
          <Card key={t.id} className="surface-soft">
            <CardHeader className="gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold">
                  {initialsOf(t.name)}
                </span>
                <div className="min-w-0">
                  <CardTitle className="font-display truncate text-base">{t.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {t.title}
                    {!t.active ? " · Inactive" : ""}
                  </p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t.specialties.length
                  ? t.specialties.map((specialty) => serviceByKey(specialty).name).join(" · ")
                  : "No specialties added"}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <Stat label="Utilization" value={percent(t.utilization)} />
                <Stat label="Rebooking" value={percent(t.rebookingRate)} />
                <Stat label="Rating" value={t.reviewRating.toFixed(1)} />
              </div>
              <p className="text-xs text-muted-foreground">
                {t.weeklyAppointments} appointments this week · {t.availability}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setDetail(t)}>
                  View profile
                </Button>
                <Button variant="outline" onClick={() => openEditor(t)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {detail ? (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-2xl">{detail.name}</SheetTitle>
                <SheetDescription>
                  {detail.title} · {detail.availability}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-10">
                <Button variant="outline" className="w-full" onClick={() => openEditor(detail)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit therapist
                </Button>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <Stat label="Utilization" value={percent(detail.utilization)} />
                  <Stat label="Rebooking" value={percent(detail.rebookingRate)} />
                  <Stat label="Rating" value={detail.reviewRating.toFixed(1)} />
                </div>
                {detail.weeklyAvailability ? (
                  <div>
                    <SectionTitle>Weekly availability</SectionTitle>
                    <div className="mt-2 divide-y divide-border rounded-lg border border-border">
                      {detail.weeklyAvailability.map((day) => (
                        <div
                          key={day.day}
                          className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${
                            day.unavailable ? "bg-muted/50 text-muted-foreground" : ""
                          }`}
                        >
                          <span>{day.day}</span>
                          <span className="text-xs">
                            {day.unavailable
                              ? "Unavailable"
                              : `${scheduleTime(day.start)}–${scheduleTime(day.end)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div>
                  <SectionTitle>Upcoming schedule</SectionTitle>
                  <ul className="mt-2 space-y-2">
                    {appointments
                      .filter((a) => a.therapistId === detail.id)
                      .slice(0, 6)
                      .map((a) => (
                        <li key={a.id} className="rounded-lg border border-border p-3 text-sm">
                          <p className="font-medium">{a.clientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {dateTime(a.start)} · {clockTime(a.start)} · {a.duration} min
                          </p>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setEditing(null);
            setDraft(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Edit therapist</DialogTitle>
            <DialogDescription>
              Update profile, scheduling, location, and availability.
            </DialogDescription>
          </DialogHeader>
          {editing && draft ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <Input
                  id="edit-therapist-name"
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </Field>
              <Field label="Title">
                <Input
                  id="edit-therapist-title"
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                />
              </Field>
              <Field label="Primary service">
                <Select
                  value={draft.serviceKey}
                  onValueChange={(serviceKey) => setDraft({ ...draft, serviceKey })}
                >
                  <SelectTrigger id="edit-therapist-service">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unspecified">Not specified</SelectItem>
                    {services.map((service) => (
                      <SelectItem key={service.key} value={service.key}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Licensed since">
                <Input
                  id="edit-licensed-since"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={draft.licensedSince}
                  onChange={(event) => setDraft({ ...draft, licensedSince: event.target.value })}
                />
              </Field>
              {locations.length > 0 ? (
                <Field label="Location">
                  <Select
                    value={draft.locationId || locations[0]?.id || ""}
                    onValueChange={(locationId) => setDraft({ ...draft, locationId })}
                  >
                    <SelectTrigger id="edit-therapist-location">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                <div>
                  <Label htmlFor="edit-therapist-active">Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Available for scheduling and assignment
                  </p>
                </div>
                <Switch
                  id="edit-therapist-active"
                  checked={draft.active}
                  onCheckedChange={(active) => setDraft({ ...draft, active })}
                />
              </div>
              <div className="sm:col-span-2">
                <TherapistAvailabilityEditor
                  value={draft.weeklyAvailability}
                  onChange={(weeklyAvailability) => setDraft({ ...draft, weeklyAvailability })}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter className="sm:justify-between">
            <Button variant="destructive" disabled={saving} onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                disabled={saving}
                onClick={() => {
                  setEditing(null);
                  setDraft(null);
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={
                  saving ||
                  !editing ||
                  !draft ||
                  !draft.name.trim() ||
                  !draft.title.trim() ||
                  !draft.licensedSince ||
                  invalidAvailability(draft.weeklyAvailability)
                }
                onClick={() => {
                  if (!editing || !draft) return;
                  const updated: Therapist = {
                    ...editing,
                    name: draft.name.trim(),
                    title: draft.title.trim(),
                    initials: initialsOf(draft.name),
                    specialties: draft.serviceKey === "unspecified" ? [] : [draft.serviceKey],
                    licensedSince: Number(draft.licensedSince),
                    locationId: draft.locationId || locations[0]?.id || "",
                    active: draft.active,
                    availability: availabilitySummary(draft.weeklyAvailability),
                    weeklyAvailability: draft.weeklyAvailability,
                  };
                  setSaving(true);
                  void persistRecord("therapists", updated, updated.locationId)
                    .then(() => {
                      toast.success("Therapist updated");
                      setEditing(null);
                      setDraft(null);
                    })
                    .catch((error: unknown) =>
                      toast.error(
                        error instanceof Error ? error.message : "Could not update the therapist.",
                      ),
                    )
                    .finally(() => setSaving(false));
                }}
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {editing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the therapist profile. Existing appointment history will
              remain, but the therapist will no longer be available for scheduling.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting || !editing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                if (!editing) return;
                setDeleting(true);
                void removeRecord("therapists", editing.id)
                  .then(() => {
                    toast.success("Therapist deleted");
                    setDeleteOpen(false);
                    setEditing(null);
                    setDraft(null);
                  })
                  .catch((error: unknown) =>
                    toast.error(
                      error instanceof Error ? error.message : "Could not delete the therapist.",
                    ),
                  )
                  .finally(() => setDeleting(false));
              }}
            >
              {deleting ? "Deleting…" : "Delete therapist"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-display text-base text-foreground">{value}</p>
    </div>
  );
}
