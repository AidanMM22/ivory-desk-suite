import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelectDropdown } from "@/components/shared/multi-select";
import { EmptyState, PageHeader } from "@/components/shared/page";
import { services, therapists, appointments } from "@/lib/data";
import { useCrmData } from "@/lib/crm-data";
import { currency } from "@/lib/format";
import {
  allRooms,
  futureAppointmentsForService,
  roomIdsForService,
  therapistIdsForService,
} from "@/lib/scheduling";
import type { Service, Therapist } from "@/lib/types";

export const Route = createFileRoute("/services")({
  head: () => ({ meta: [{ title: "Services — M&M Spa CRM" }] }),
  component: ServicesPage,
});

interface ServiceDraft {
  name: string;
  description: string;
  durations: string;
  cleanupMinutes: string;
  price: string;
  roomIds: string[];
  therapistIds: string[];
  active: boolean;
}

const parseDurations = (value: string) =>
  Array.from(
    new Set(
      value
        .split(",")
        .map((duration) => Number(duration.trim()))
        .filter((duration) => Number.isInteger(duration) && duration > 0),
    ),
  ).sort((a, b) => a - b);

const emptyDraft = (): ServiceDraft => ({
  name: "",
  description: "",
  durations: "60",
  cleanupMinutes: "0",
  price: "",
  roomIds: [],
  therapistIds: [],
  active: true,
});

const draftFromService = (service: Service): ServiceDraft => ({
  name: service.name,
  description: service.description,
  durations: service.durations.join(", "),
  cleanupMinutes: String(service.cleanupMinutes ?? 0),
  price: String(service.price),
  roomIds: roomIdsForService(service),
  therapistIds: therapistIdsForService(service),
  active: service.active,
});

function ServicesPage() {
  const { persistRecord, removeRecord } = useCrmData();
  const [editing, setEditing] = useState<Service | null>(null);
  const [draft, setDraft] = useState<ServiceDraft>(emptyDraft);
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const rooms = allRooms();
  const openEditor = (service?: Service) => {
    setEditing(service ?? null);
    setDraft(service ? draftFromService(service) : emptyDraft());
    setOpen(true);
  };

  const syncTherapists = async (serviceKey: string, selectedIds: string[]) => {
    const selected = new Set(selectedIds);
    const changed = therapists
      .map((therapist): Therapist => {
        const specialties = therapist.specialties.filter((key) => key !== serviceKey);
        if (selected.has(therapist.id)) specialties.push(serviceKey);
        return { ...therapist, specialties };
      })
      .filter(
        (therapist, index) =>
          therapist.specialties.join("|") !== therapists[index]?.specialties.join("|"),
      );
    await Promise.all(
      changed.map((therapist) => persistRecord("therapists", therapist, therapist.locationId)),
    );
  };

  const save = async () => {
    const durations = parseDurations(draft.durations);
    if (!draft.name.trim() || durations.length === 0 || draft.price === "") return;
    const removedRooms = editing
      ? roomIdsForService(editing).filter((id) => !draft.roomIds.includes(id))
      : [];
    const removedTherapists = editing
      ? therapistIdsForService(editing).filter((id) => !draft.therapistIds.includes(id))
      : [];
    const impacted = editing
      ? futureAppointmentsForService(editing.key).filter(
          (appointment) =>
            removedRooms.includes(appointment.roomId) ||
            removedTherapists.includes(appointment.therapistId),
        ).length
      : 0;
    if (
      impacted > 0 &&
      !globalThis.confirm(
        `${impacted} future appointment${impacted === 1 ? "" : "s"} use a room or therapist you removed. Save anyway?`,
      )
    ) {
      return;
    }

    const id = editing?.id ?? crypto.randomUUID();
    const service: Service = {
      id,
      key: editing?.key ?? id,
      name: draft.name.trim(),
      description: draft.description.trim(),
      durations,
      cleanupMinutes: Number(draft.cleanupMinutes) || 0,
      price: Number(draft.price),
      roomIds: draft.roomIds,
      therapistIds: draft.therapistIds,
      active: draft.active,
    };
    setSaving(true);
    try {
      await persistRecord("services", service);
      await syncTherapists(service.key, service.therapistIds ?? []);
      toast.success(editing ? "Service updated" : "Service added");
      setOpen(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not save the service.");
    } finally {
      setSaving(false);
    }
  };

  const hasHistory = editing
    ? appointments.some((appointment) => appointment.serviceKey === editing.key)
    : false;

  return (
    <div className="mx-auto max-w-[1300px] space-y-6">
      <PageHeader
        title="Services"
        description={`${services.length} configured services`}
        actions={
          <Button onClick={() => openEditor()}>
            <Plus className="mr-2 h-4 w-4" />
            Add service
          </Button>
        }
      />

      {services.length === 0 ? (
        <EmptyState
          title="No services yet"
          description="Add a service to connect durations, rooms, and qualified therapists."
          action={<Button onClick={() => openEditor()}>Add service</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <Card key={service.id} className="surface-soft">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-display text-lg">{service.name}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {service.active ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openEditor(service)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {service.description ? (
                  <p className="text-muted-foreground">{service.description}</p>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <Summary label="Duration" value={`${service.durations.join(" / ")} min`} />
                  <Summary label="Cleanup" value={`${service.cleanupMinutes ?? 0} min`} />
                  <Summary label="Price" value={currency(service.price)} />
                  <Summary label="Rooms" value={String(roomIdsForService(service).length)} />
                  <Summary
                    label="Therapists"
                    value={String(therapistIdsForService(service).length)}
                  />
                  <Summary
                    label="Upcoming"
                    value={String(futureAppointmentsForService(service.key).length)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit service" : "Add service"}</DialogTitle>
            <DialogDescription>
              Configure actual treatment time, cleanup time, rooms, and qualified therapists.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Service name">
              <Input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </Field>
            <Field label="Price">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={draft.price}
                onChange={(event) => setDraft({ ...draft, price: event.target.value })}
              />
            </Field>
            <Field label="Service durations">
              <Input
                placeholder="60, 90"
                value={draft.durations}
                onChange={(event) => setDraft({ ...draft, durations: event.target.value })}
              />
            </Field>
            <Field label="Cleanup / buffer minutes">
              <Input
                type="number"
                min="0"
                step="5"
                value={draft.cleanupMinutes}
                onChange={(event) => setDraft({ ...draft, cleanupMinutes: event.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description (optional)">
                <Textarea
                  rows={3}
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
              </Field>
            </div>
            <Field label="Rooms">
              <MultiSelectDropdown
                label="Rooms for this service"
                placeholder="Select rooms"
                options={rooms.map((room) => ({
                  id: room.id,
                  label: room.name,
                  detail: room.locationName,
                }))}
                value={draft.roomIds}
                onChange={(roomIds) => setDraft({ ...draft, roomIds })}
              />
            </Field>
            <Field label="Qualified therapists">
              <MultiSelectDropdown
                label="Therapists for this service"
                placeholder="Select therapists"
                options={therapists.map((therapist) => ({
                  id: therapist.id,
                  label: therapist.name,
                }))}
                value={draft.therapistIds}
                onChange={(therapistIds) => setDraft({ ...draft, therapistIds })}
              />
            </Field>
            <div className="flex items-center justify-between rounded-lg border border-border p-3 sm:col-span-2">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive services are hidden from new bookings.
                </p>
              </div>
              <Switch
                checked={draft.active}
                onCheckedChange={(active) => setDraft({ ...draft, active })}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            {editing ? (
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                {hasHistory ? "Archive" : "Delete"}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={
                  saving ||
                  !draft.name.trim() ||
                  parseDurations(draft.durations).length === 0 ||
                  draft.price === ""
                }
                onClick={() => void save()}
              >
                {saving ? "Saving…" : "Save service"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hasHistory ? `Archive ${editing?.name}?` : `Delete ${editing?.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {hasHistory
                ? "This service has appointment history, so it will be made inactive instead of permanently deleted."
                : "This permanently deletes the service and removes it from therapist qualifications."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                if (!editing) return;
                setSaving(true);
                const operation = hasHistory
                  ? persistRecord("services", { ...editing, active: false })
                  : Promise.all([
                      removeRecord("services", editing.id),
                      syncTherapists(editing.key, []),
                    ]).then(() => undefined);
                void operation
                  .then(() => {
                    toast.success(hasHistory ? "Service archived" : "Service deleted");
                    setDeleteOpen(false);
                    setOpen(false);
                  })
                  .catch((error: unknown) =>
                    toast.error(
                      error instanceof Error ? error.message : "Could not update the service.",
                    ),
                  )
                  .finally(() => setSaving(false));
              }}
            >
              {hasHistory ? "Archive service" : "Delete service"}
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

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
