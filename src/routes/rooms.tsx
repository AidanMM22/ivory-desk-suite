import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DoorOpen, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { MultiSelectDropdown } from "@/components/shared/multi-select";
import { EmptyState, PageHeader } from "@/components/shared/page";
import { appointments, locations, services } from "@/lib/data";
import { useCrmData } from "@/lib/crm-data";
import {
  allRooms,
  futureAppointmentsForRoom,
  roomIdsForService,
  servicesForRoom,
} from "@/lib/scheduling";
import type { Location, Room, RoomStatus, Service } from "@/lib/types";

export const Route = createFileRoute("/rooms")({
  head: () => ({ meta: [{ title: "Rooms — M&M Spa CRM" }] }),
  component: RoomsPage,
});

interface RoomDraft {
  name: string;
  capacity: string;
  internalNotes: string;
  status: RoomStatus;
  locationId: string;
  serviceKeys: string[];
  locationName: string;
  locationAddress: string;
  locationPhone: string;
}

const emptyDraft = (): RoomDraft => ({
  name: "",
  capacity: "1",
  internalNotes: "",
  status: "available",
  locationId: locations[0]?.id ?? "",
  serviceKeys: [],
  locationName: "",
  locationAddress: "",
  locationPhone: "",
});

function RoomsPage() {
  const { persistRecord } = useCrmData();
  const [editing, setEditing] = useState<(Room & { locationId: string }) | null>(null);
  const [draft, setDraft] = useState<RoomDraft>(emptyDraft);
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const rooms = allRooms();

  const openEditor = (room?: (typeof rooms)[number]) => {
    setEditing(room ?? null);
    setDraft(
      room
        ? {
            name: room.name,
            capacity: String(room.capacity ?? 1),
            internalNotes: room.internalNotes ?? "",
            status: room.status ?? "available",
            locationId: room.locationId,
            serviceKeys: servicesForRoom(room.id).map((service) => service.key),
            locationName: "",
            locationAddress: "",
            locationPhone: "",
          }
        : emptyDraft(),
    );
    setOpen(true);
  };

  const syncServices = async (roomId: string, selectedKeys: string[]) => {
    const selected = new Set(selectedKeys);
    const updated = services
      .map((service): Service => {
        const roomIds = roomIdsForService(service).filter((id) => id !== roomId);
        if (selected.has(service.key)) roomIds.push(roomId);
        return { ...service, roomIds: Array.from(new Set(roomIds)) };
      })
      .filter(
        (service, index) =>
          service.roomIds?.join("|") !== roomIdsForService(services[index]!).join("|"),
      );
    await Promise.all(updated.map((service) => persistRecord("services", service)));
  };

  const save = async () => {
    if (!draft.name.trim() || Number(draft.capacity) < 1) return;
    const roomId = editing?.id ?? crypto.randomUUID();
    const removedServices = editing
      ? servicesForRoom(editing.id)
          .map((service) => service.key)
          .filter((key) => !draft.serviceKeys.includes(key))
      : [];
    const impacted = editing
      ? futureAppointmentsForRoom(editing.id).filter((appointment) =>
          removedServices.includes(appointment.serviceKey),
        ).length
      : 0;
    if (
      impacted > 0 &&
      !globalThis.confirm(
        `${impacted} future appointment${impacted === 1 ? "" : "s"} use a service you removed from this room. Save anyway?`,
      )
    ) {
      return;
    }

    const currentLocation =
      locations.find((location) => location.id === draft.locationId) ??
      locations.find((location) => location.rooms.some((room) => room.id === editing?.id));
    const room: Room = {
      id: roomId,
      name: draft.name.trim(),
      type: "Treatment room",
      capacity: Number(draft.capacity),
      internalNotes: draft.internalNotes.trim(),
      status: draft.status,
    };
    const destination: Location = currentLocation
      ? {
          ...currentLocation,
          rooms: [...currentLocation.rooms.filter((item) => item.id !== editing?.id), room],
        }
      : {
          id: crypto.randomUUID(),
          name: draft.locationName.trim() || "Main location",
          address: draft.locationAddress.trim(),
          phone: draft.locationPhone.trim(),
          rooms: [room],
        };
    const source =
      editing && editing.locationId !== destination.id
        ? locations.find((location) => location.id === editing.locationId)
        : undefined;

    setSaving(true);
    try {
      if (source) {
        await persistRecord("locations", {
          ...source,
          rooms: source.rooms.filter((item) => item.id !== editing?.id),
        });
      }
      await persistRecord("locations", destination, destination.id);
      await syncServices(room.id, draft.serviceKeys);
      toast.success(editing ? "Room updated" : "Room added");
      setOpen(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not save the room.");
    } finally {
      setSaving(false);
    }
  };

  const hasHistory = editing
    ? appointments.some((appointment) => appointment.roomId === editing.id)
    : false;

  return (
    <div className="mx-auto max-w-[1300px] space-y-6">
      <PageHeader
        title="Rooms"
        description={`${rooms.length} configured rooms`}
        actions={
          <Button onClick={() => openEditor()}>
            <Plus className="mr-2 h-4 w-4" />
            Add room
          </Button>
        }
      />

      {rooms.length === 0 ? (
        <EmptyState
          icon={<DoorOpen className="h-6 w-6" />}
          title="No rooms yet"
          description="Add a treatment room and connect the services it supports."
          action={<Button onClick={() => openEditor()}>Add room</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => (
            <Card key={room.id} className="surface-soft">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-display text-lg">{room.name}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {room.locationName} · {room.status}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openEditor(room)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <Summary label="Capacity" value={String(room.capacity)} />
                  <Summary label="Services" value={String(servicesForRoom(room.id).length)} />
                  <Summary
                    label="Upcoming"
                    value={String(futureAppointmentsForRoom(room.id).length)}
                  />
                </div>
                {room.internalNotes ? (
                  <p className="text-sm text-muted-foreground">{room.internalNotes}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit room" : "Add room"}</DialogTitle>
            <DialogDescription>
              Configure capacity, availability, and compatible services.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Room name">
              <Input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </Field>
            <Field label="Capacity">
              <Input
                type="number"
                min="1"
                value={draft.capacity}
                onChange={(event) => setDraft({ ...draft, capacity: event.target.value })}
              />
            </Field>
            {locations.length > 0 ? (
              <Field label="Location">
                <Select
                  value={draft.locationId || locations[0]?.id || ""}
                  onValueChange={(locationId) => setDraft({ ...draft, locationId })}
                >
                  <SelectTrigger>
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
            ) : (
              <>
                <Field label="Location name">
                  <Input
                    value={draft.locationName}
                    onChange={(event) => setDraft({ ...draft, locationName: event.target.value })}
                  />
                </Field>
                <Field label="Location phone">
                  <Input
                    value={draft.locationPhone}
                    onChange={(event) => setDraft({ ...draft, locationPhone: event.target.value })}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Location address">
                    <Input
                      value={draft.locationAddress}
                      onChange={(event) =>
                        setDraft({ ...draft, locationAddress: event.target.value })
                      }
                    />
                  </Field>
                </div>
              </>
            )}
            <Field label="Availability status">
              <Select
                value={draft.status}
                onValueChange={(status: RoomStatus) => setDraft({ ...draft, status })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Services">
              <MultiSelectDropdown
                label="Services for this room"
                placeholder="Select services"
                options={services.map((service) => ({
                  id: service.key,
                  label: service.name,
                }))}
                value={draft.serviceKeys}
                onChange={(serviceKeys) => setDraft({ ...draft, serviceKeys })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Internal notes">
                <Textarea
                  rows={3}
                  value={draft.internalNotes}
                  onChange={(event) => setDraft({ ...draft, internalNotes: event.target.value })}
                />
              </Field>
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
                disabled={saving || !draft.name.trim() || Number(draft.capacity) < 1}
                onClick={() => void save()}
              >
                {saving ? "Saving…" : "Save room"}
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
                ? "This room has appointment history, so it will be marked inactive rather than permanently deleted."
                : "This permanently removes the room and its service assignments."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                if (!editing) return;
                const location = locations.find((item) => item.id === editing.locationId);
                if (!location) return;
                setSaving(true);
                const updatedRoom: Room = {
                  id: editing.id,
                  name: editing.name,
                  type: editing.type,
                  capacity: editing.capacity,
                  internalNotes: editing.internalNotes,
                  status: "inactive",
                };
                const updatedLocation = {
                  ...location,
                  rooms: hasHistory
                    ? location.rooms.map((room) => (room.id === editing.id ? updatedRoom : room))
                    : location.rooms.filter((room) => room.id !== editing.id),
                };
                void Promise.all([
                  persistRecord("locations", updatedLocation, updatedLocation.id),
                  ...(hasHistory
                    ? []
                    : servicesForRoom(editing.id).map((service) =>
                        persistRecord("services", {
                          ...service,
                          roomIds: roomIdsForService(service).filter((id) => id !== editing.id),
                        }),
                      )),
                ])
                  .then(() => {
                    toast.success(hasHistory ? "Room archived" : "Room deleted");
                    setDeleteOpen(false);
                    setOpen(false);
                  })
                  .catch((error: unknown) =>
                    toast.error(
                      error instanceof Error ? error.message : "Could not update the room.",
                    ),
                  )
                  .finally(() => setSaving(false));
              }}
            >
              {hasHistory ? "Archive room" : "Delete room"}
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
    <div className="rounded-lg border border-border p-2 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
