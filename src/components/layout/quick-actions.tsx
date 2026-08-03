import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/lib/workspace";
import { clients, leads, services, team, therapists, TODAY, locations } from "@/lib/data";
import { useCrmData } from "@/lib/crm-data";
import { useAuth } from "@/lib/auth";
import type {
  Client,
  DayAvailability,
  Lead,
  LeadSource,
  Location,
  Service,
  ServiceKey,
  Therapist,
  Weekday,
} from "@/lib/types";

interface LeadDraft {
  name: string;
  phone: string;
  email: string;
  serviceInterest: ServiceKey;
  source: LeadSource;
  ownerId: string;
  notes: string;
}

const emptyLead: LeadDraft = {
  name: "",
  phone: "",
  email: "",
  serviceInterest: "unspecified",
  source: "Website booking",
  ownerId: "unassigned",
  notes: "",
};

interface ClientDraft {
  name: string;
  phone: string;
  email: string;
  preferredService: ServiceKey;
  locationId: string;
}

interface TherapistDraft {
  name: string;
  title: string;
  serviceKey: ServiceKey;
  weeklyAvailability: DayAvailability[];
  licensedSince: string;
  locationId: string;
}

interface RoomDraft {
  name: string;
  type: string;
  locationId: string;
  locationName: string;
  locationAddress: string;
  locationPhone: string;
}

interface ServiceDraft {
  name: string;
  durations: string;
  price: string;
  description: string;
}

const emptyClient: ClientDraft = {
  name: "",
  phone: "",
  email: "",
  preferredService: "unspecified",
  locationId: "",
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

const createWeeklyAvailability = (): DayAvailability[] =>
  WEEKDAYS.map((day) => ({
    day,
    unavailable: false,
    start: "09:00",
    end: "17:00",
  }));

const createEmptyTherapist = (): TherapistDraft => ({
  name: "",
  title: "Massage therapist",
  serviceKey: "unspecified",
  weeklyAvailability: createWeeklyAvailability(),
  licensedSince: String(new Date().getFullYear()),
  locationId: "",
});

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2);
  const minutes = index % 2 === 0 ? "00" : "30";
  return `${String(hours).padStart(2, "0")}:${minutes}`;
});

const timeLabel = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  const period = (hours ?? 0) >= 12 ? "PM" : "AM";
  const displayHour = (hours ?? 0) % 12 || 12;
  return `${displayHour}:${String(minutes ?? 0).padStart(2, "0")} ${period}`;
};

const availabilitySummary = (schedule: DayAvailability[]) => {
  const available = schedule.filter((day) => !day.unavailable);
  if (available.length === 0) return "No weekly availability";

  const sameHours = available.every(
    (day) => day.start === available[0]?.start && day.end === available[0]?.end,
  );
  if (sameHours) {
    return `${available.length} days · ${timeLabel(available[0]!.start)}–${timeLabel(available[0]!.end)}`;
  }
  return `${available.length} days with custom hours`;
};

const hasInvalidAvailability = (schedule: DayAvailability[]) =>
  schedule.some((day) => !day.unavailable && day.start >= day.end);

export function TherapistAvailabilityEditor({
  value,
  onChange,
}: {
  value: DayAvailability[];
  onChange: (value: DayAvailability[]) => void;
}) {
  const [bulkStart, setBulkStart] = useState("09:00");
  const [bulkEnd, setBulkEnd] = useState("17:00");

  const updateDay = (day: Weekday, update: Partial<DayAvailability>) => {
    onChange(value.map((entry) => (entry.day === day ? { ...entry, ...update } : entry)));
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Weekly availability</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Set shared hours, then adjust individual days as needed.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Field label="Start for available days">
            <TimeSelect
              ariaLabel="Start time for all available days"
              value={bulkStart}
              onChange={setBulkStart}
            />
          </Field>
          <Field label="End for available days">
            <TimeSelect
              ariaLabel="End time for all available days"
              value={bulkEnd}
              onChange={setBulkEnd}
            />
          </Field>
          <Button
            type="button"
            variant="outline"
            disabled={bulkStart >= bulkEnd}
            onClick={() =>
              onChange(
                value.map((day) =>
                  day.unavailable ? day : { ...day, start: bulkStart, end: bulkEnd },
                ),
              )
            }
          >
            Apply to available
          </Button>
        </div>
        {bulkStart >= bulkEnd ? (
          <p className="mt-2 text-xs text-destructive">End time must be after start time.</p>
        ) : null}
      </div>

      <div className="space-y-2">
        {value.map((day) => (
          <div
            key={day.day}
            className={`grid gap-3 rounded-lg border border-border p-3 transition-colors sm:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center ${
              day.unavailable ? "bg-muted/60 text-muted-foreground" : "bg-background"
            }`}
          >
            <span className="text-sm font-medium">{day.day}</span>
            <TimeSelect
              ariaLabel={`${day.day} start time`}
              value={day.start}
              onChange={(start) => updateDay(day.day, { start })}
              disabled={day.unavailable}
            />
            <TimeSelect
              ariaLabel={`${day.day} end time`}
              value={day.end}
              onChange={(end) => updateDay(day.day, { end })}
              disabled={day.unavailable}
            />
            <label
              htmlFor={`unavailable-${day.day}`}
              className="flex cursor-pointer items-center gap-2 text-xs whitespace-nowrap"
            >
              <Checkbox
                id={`unavailable-${day.day}`}
                checked={day.unavailable}
                onCheckedChange={(checked) => updateDay(day.day, { unavailable: checked === true })}
              />
              No availability
            </label>
            {!day.unavailable && day.start >= day.end ? (
              <p className="text-xs text-destructive sm:col-start-2 sm:col-span-3">
                End time must be after start time.
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimeSelect({
  ariaLabel,
  value,
  onChange,
  disabled = false,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger aria-label={ariaLabel} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TIME_OPTIONS.map((time) => (
          <SelectItem key={time} value={time}>
            {timeLabel(time)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const emptyRoom: RoomDraft = {
  name: "",
  type: "Massage room",
  locationId: "",
  locationName: "",
  locationAddress: "",
  locationPhone: "",
};

const emptyService: ServiceDraft = {
  name: "",
  durations: "60",
  price: "",
  description: "",
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

const parseDurations = (value: string) =>
  Array.from(
    new Set(
      value
        .split(",")
        .map((duration) => Number(duration.trim()))
        .filter((duration) => Number.isInteger(duration) && duration > 0),
    ),
  ).sort((a, b) => a - b);

export function QuickActionDialogs() {
  const { quickAction, setQuickAction, addTask } = useWorkspace();
  const { persistRecord } = useCrmData();
  const { user } = useAuth();
  const [leadDraft, setLeadDraft] = useState<LeadDraft>(emptyLead);
  const [clientDraft, setClientDraft] = useState<ClientDraft>(emptyClient);
  const [therapistDraft, setTherapistDraft] = useState<TherapistDraft>(createEmptyTherapist);
  const [roomDraft, setRoomDraft] = useState<RoomDraft>(emptyRoom);
  const [serviceDraft, setServiceDraft] = useState<ServiceDraft>(emptyService);
  const [saving, setSaving] = useState(false);
  const close = () => setQuickAction(null);

  return (
    <>
      <Dialog open={quickAction === "lead"} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Add lead</DialogTitle>
            <DialogDescription>Add an inquiry to the shared lead pipeline.</DialogDescription>
          </DialogHeader>
          <LeadForm value={leadDraft} onChange={setLeadDraft} />
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              disabled={
                !leadDraft.name.trim() || (!leadDraft.phone.trim() && !leadDraft.email.trim())
              }
              onClick={() => {
                const now = new Date().toISOString();
                const lead: Lead = {
                  id: crypto.randomUUID(),
                  ...leadDraft,
                  name: leadDraft.name.trim(),
                  phone: leadDraft.phone.trim(),
                  email: leadDraft.email.trim(),
                  stage: "new",
                  lastContactAt: now,
                  nextFollowUpAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                  value:
                    services.find((service) => service.key === leadDraft.serviceInterest)?.price ??
                    0,
                  consent: {
                    sms: "pending",
                    email: "pending",
                    marketing: false,
                    updatedAt: now,
                  },
                  ownerId: user?.id ?? "unassigned",
                  locationId: locations[0]?.id ?? "",
                  createdAt: now,
                };
                void persistRecord("leads", lead, lead.locationId)
                  .then(() => {
                    setLeadDraft(emptyLead);
                    toast.success("Lead saved");
                    close();
                  })
                  .catch((error: unknown) =>
                    toast.error(
                      error instanceof Error ? error.message : "Could not save the lead.",
                    ),
                  );
              }}
            >
              Save lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quickAction === "client"} onOpenChange={(open) => !open && close()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Add client</DialogTitle>
            <DialogDescription>Create a client profile in this workspace.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input
                id="client-name"
                autoFocus
                placeholder="Client name"
                value={clientDraft.name}
                onChange={(event) => setClientDraft({ ...clientDraft, name: event.target.value })}
              />
            </Field>
            <Field label="Phone">
              <Input
                id="client-phone"
                type="tel"
                placeholder="(253) 555-0123"
                value={clientDraft.phone}
                onChange={(event) => setClientDraft({ ...clientDraft, phone: event.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input
                id="client-email"
                type="email"
                placeholder="client@example.com"
                value={clientDraft.email}
                onChange={(event) => setClientDraft({ ...clientDraft, email: event.target.value })}
              />
            </Field>
            <Field label="Preferred service">
              <Select
                value={clientDraft.preferredService}
                onValueChange={(preferredService) =>
                  setClientDraft({ ...clientDraft, preferredService })
                }
              >
                <SelectTrigger id="client-service">
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
            {locations.length > 0 ? (
              <div className="sm:col-span-2">
                <Field label="Location">
                  <Select
                    value={clientDraft.locationId || locations[0]?.id || ""}
                    onValueChange={(locationId) => setClientDraft({ ...clientDraft, locationId })}
                  >
                    <SelectTrigger id="client-location">
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
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              disabled={
                saving ||
                !clientDraft.name.trim() ||
                (!clientDraft.phone.trim() && !clientDraft.email.trim())
              }
              onClick={() => {
                const now = new Date().toISOString();
                const locationId = clientDraft.locationId || locations[0]?.id || "";
                const client: Client = {
                  id: crypto.randomUUID(),
                  name: clientDraft.name.trim(),
                  phone: clientDraft.phone.trim(),
                  email: clientDraft.email.trim(),
                  lifetimeValue: 0,
                  visitCount: 0,
                  preferredService: clientDraft.preferredService,
                  tags: [],
                  rebooked: false,
                  consent: {
                    sms: "pending",
                    email: "pending",
                    marketing: false,
                    updatedAt: now,
                  },
                  intakeComplete: false,
                  restrictedNote: "",
                  internalNote: "",
                  packages: [],
                  giftCards: [],
                  locationId,
                  createdAt: now,
                };
                setSaving(true);
                void persistRecord("clients", client, locationId)
                  .then(() => {
                    setClientDraft(emptyClient);
                    toast.success("Client saved");
                    close();
                  })
                  .catch((error: unknown) =>
                    toast.error(
                      error instanceof Error ? error.message : "Could not save the client.",
                    ),
                  )
                  .finally(() => setSaving(false));
              }}
            >
              {saving ? "Saving…" : "Save client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quickAction === "therapist"} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Add therapist</DialogTitle>
            <DialogDescription>Add a provider to scheduling and reporting.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input
                id="therapist-name"
                autoFocus
                placeholder="Therapist name"
                value={therapistDraft.name}
                onChange={(event) =>
                  setTherapistDraft({ ...therapistDraft, name: event.target.value })
                }
              />
            </Field>
            <Field label="Title">
              <Input
                id="therapist-title"
                value={therapistDraft.title}
                onChange={(event) =>
                  setTherapistDraft({ ...therapistDraft, title: event.target.value })
                }
              />
            </Field>
            <Field label="Primary service">
              <Select
                value={therapistDraft.serviceKey}
                onValueChange={(serviceKey) => setTherapistDraft({ ...therapistDraft, serviceKey })}
              >
                <SelectTrigger id="therapist-service">
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
                id="licensed-since"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={therapistDraft.licensedSince}
                onChange={(event) =>
                  setTherapistDraft({ ...therapistDraft, licensedSince: event.target.value })
                }
              />
            </Field>
            {locations.length > 0 ? (
              <Field label="Location">
                <Select
                  value={therapistDraft.locationId || locations[0]?.id || ""}
                  onValueChange={(locationId) =>
                    setTherapistDraft({ ...therapistDraft, locationId })
                  }
                >
                  <SelectTrigger id="therapist-location">
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
            <div className="sm:col-span-2">
              <TherapistAvailabilityEditor
                value={therapistDraft.weeklyAvailability}
                onChange={(weeklyAvailability) =>
                  setTherapistDraft({ ...therapistDraft, weeklyAvailability })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              disabled={
                saving ||
                !therapistDraft.name.trim() ||
                !therapistDraft.title.trim() ||
                !therapistDraft.licensedSince ||
                hasInvalidAvailability(therapistDraft.weeklyAvailability)
              }
              onClick={() => {
                const locationId = therapistDraft.locationId || locations[0]?.id || "";
                const therapist: Therapist = {
                  id: crypto.randomUUID(),
                  name: therapistDraft.name.trim(),
                  title: therapistDraft.title.trim(),
                  initials: initials(therapistDraft.name),
                  specialties:
                    therapistDraft.serviceKey === "unspecified" ? [] : [therapistDraft.serviceKey],
                  availability: availabilitySummary(therapistDraft.weeklyAvailability),
                  weeklyAvailability: therapistDraft.weeklyAvailability,
                  weeklyAppointments: 0,
                  utilization: 0,
                  rebookingRate: 0,
                  reviewRating: 0,
                  licensedSince: Number(therapistDraft.licensedSince),
                  locationId,
                  active: true,
                };
                setSaving(true);
                void persistRecord("therapists", therapist, locationId)
                  .then(() => {
                    setTherapistDraft(createEmptyTherapist());
                    toast.success("Therapist saved");
                    close();
                  })
                  .catch((error: unknown) =>
                    toast.error(
                      error instanceof Error ? error.message : "Could not save the therapist.",
                    ),
                  )
                  .finally(() => setSaving(false));
              }}
            >
              {saving ? "Saving…" : "Save therapist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quickAction === "room"} onOpenChange={(open) => !open && close()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Add room</DialogTitle>
            <DialogDescription>
              {locations.length > 0
                ? "Add a treatment room to one of your locations."
                : "Create your first location and treatment room together."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {locations.length > 0 ? (
              <div className="sm:col-span-2">
                <Field label="Location">
                  <Select
                    value={roomDraft.locationId || locations[0]?.id || ""}
                    onValueChange={(locationId) => setRoomDraft({ ...roomDraft, locationId })}
                  >
                    <SelectTrigger id="room-location">
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
              </div>
            ) : (
              <>
                <Field label="Location name">
                  <Input
                    id="new-location-name"
                    placeholder="Main location"
                    value={roomDraft.locationName}
                    onChange={(event) =>
                      setRoomDraft({ ...roomDraft, locationName: event.target.value })
                    }
                  />
                </Field>
                <Field label="Location phone">
                  <Input
                    id="new-location-phone"
                    type="tel"
                    placeholder="(253) 555-0123"
                    value={roomDraft.locationPhone}
                    onChange={(event) =>
                      setRoomDraft({ ...roomDraft, locationPhone: event.target.value })
                    }
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Location address">
                    <Input
                      id="new-location-address"
                      placeholder="Street, city, state"
                      value={roomDraft.locationAddress}
                      onChange={(event) =>
                        setRoomDraft({ ...roomDraft, locationAddress: event.target.value })
                      }
                    />
                  </Field>
                </div>
              </>
            )}
            <Field label="Room name">
              <Input
                id="room-name"
                autoFocus={locations.length > 0}
                placeholder="Room 1"
                value={roomDraft.name}
                onChange={(event) => setRoomDraft({ ...roomDraft, name: event.target.value })}
              />
            </Field>
            <Field label="Room type">
              <Input
                id="room-type"
                placeholder="Massage room"
                value={roomDraft.type}
                onChange={(event) => setRoomDraft({ ...roomDraft, type: event.target.value })}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              disabled={
                saving ||
                !roomDraft.name.trim() ||
                !roomDraft.type.trim() ||
                (locations.length === 0 && !roomDraft.locationName.trim())
              }
              onClick={() => {
                const existing =
                  locations.find((location) => location.id === roomDraft.locationId) ??
                  locations[0];
                const room = {
                  id: crypto.randomUUID(),
                  name: roomDraft.name.trim(),
                  type: roomDraft.type.trim(),
                };
                const location: Location = existing
                  ? { ...existing, rooms: [...existing.rooms, room] }
                  : {
                      id: crypto.randomUUID(),
                      name: roomDraft.locationName.trim(),
                      address: roomDraft.locationAddress.trim(),
                      phone: roomDraft.locationPhone.trim(),
                      rooms: [room],
                    };
                setSaving(true);
                void persistRecord("locations", location, location.id)
                  .then(() => {
                    setRoomDraft(emptyRoom);
                    toast.success("Room saved");
                    close();
                  })
                  .catch((error: unknown) =>
                    toast.error(
                      error instanceof Error ? error.message : "Could not save the room.",
                    ),
                  )
                  .finally(() => setSaving(false));
              }}
            >
              {saving ? "Saving…" : "Save room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quickAction === "service"} onOpenChange={(open) => !open && close()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Add service</DialogTitle>
            <DialogDescription>
              Add an active service to booking and client records.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Service name">
                <Input
                  id="service-name"
                  autoFocus
                  placeholder="Deep tissue massage"
                  value={serviceDraft.name}
                  onChange={(event) =>
                    setServiceDraft({ ...serviceDraft, name: event.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Durations">
              <Input
                id="service-durations"
                inputMode="numeric"
                placeholder="60, 90"
                value={serviceDraft.durations}
                onChange={(event) =>
                  setServiceDraft({ ...serviceDraft, durations: event.target.value })
                }
              />
            </Field>
            <Field label="Starting price">
              <Input
                id="service-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="95"
                value={serviceDraft.price}
                onChange={(event) =>
                  setServiceDraft({ ...serviceDraft, price: event.target.value })
                }
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <Textarea
                  id="service-description"
                  rows={3}
                  placeholder="Optional internal description"
                  value={serviceDraft.description}
                  onChange={(event) =>
                    setServiceDraft({ ...serviceDraft, description: event.target.value })
                  }
                />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              disabled={
                saving ||
                !serviceDraft.name.trim() ||
                parseDurations(serviceDraft.durations).length === 0 ||
                serviceDraft.price === "" ||
                Number(serviceDraft.price) < 0
              }
              onClick={() => {
                const id = crypto.randomUUID();
                const service: Service = {
                  id,
                  key: id,
                  name: serviceDraft.name.trim(),
                  durations: parseDurations(serviceDraft.durations),
                  price: Number(serviceDraft.price),
                  description: serviceDraft.description.trim(),
                  active: true,
                };
                setSaving(true);
                void persistRecord("services", service)
                  .then(() => {
                    setServiceDraft(emptyService);
                    toast.success("Service saved");
                    close();
                  })
                  .catch((error: unknown) =>
                    toast.error(
                      error instanceof Error ? error.message : "Could not save the service.",
                    ),
                  )
                  .finally(() => setSaving(false));
              }}
            >
              {saving ? "Saving…" : "Save service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quickAction === "appointment"} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Book appointment</DialogTitle>
            <DialogDescription>
              Create an appointment from your configured CRM records.
            </DialogDescription>
          </DialogHeader>
          <BookingForm />
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              disabled={
                services.length === 0 ||
                therapists.length === 0 ||
                locations.every((location) => location.rooms.length === 0) ||
                clients.length + leads.length === 0
              }
              onClick={() => {
                toast.info("Appointment creation is not connected to the database form yet.");
                close();
              }}
            >
              Book appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quickAction === "message"} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Send message</DialogTitle>
            <DialogDescription>
              Connect a messaging provider before sending SMS or email.
            </DialogDescription>
          </DialogHeader>
          <MessageForm />
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              disabled
              onClick={() => {
                close();
              }}
            >
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskDialog
        open={quickAction === "task"}
        onClose={close}
        onCreate={(title) => {
          addTask(title, `${TODAY}T17:00:00`);
          toast.success("Task created");
          close();
        }}
      />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export function LeadForm({
  value,
  onChange,
}: {
  value: LeadDraft;
  onChange: (value: LeadDraft) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name">
        <Input
          id="full-name"
          placeholder="Jamie Ortega"
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
      </Field>
      <Field label="Phone">
        <Input
          id="phone"
          placeholder="(253) 555-0123"
          value={value.phone}
          onChange={(event) => onChange({ ...value, phone: event.target.value })}
        />
      </Field>
      <Field label="Email">
        <Input
          id="email"
          type="email"
          placeholder="jamie@example.com"
          value={value.email}
          onChange={(event) => onChange({ ...value, email: event.target.value })}
        />
      </Field>
      <Field label="Service interest">
        <Select
          value={value.serviceInterest}
          onValueChange={(serviceInterest: ServiceKey) => onChange({ ...value, serviceInterest })}
        >
          <SelectTrigger id="service-interest">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unspecified">Not specified</SelectItem>
            {services.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Source">
        <Select
          value={value.source}
          onValueChange={(source: LeadSource) => onChange({ ...value, source })}
        >
          <SelectTrigger id="source">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[
              "Website booking",
              "Google Business Profile",
              "Instagram",
              "Referral",
              "Missed call",
              "Walk-in",
              "Yelp",
            ].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Owner">
        <Select value={value.ownerId} onValueChange={(ownerId) => onChange({ ...value, ownerId })}>
          <SelectTrigger id="owner">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Current user</SelectItem>
            {team.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Notes">
          <Textarea
            id="notes"
            placeholder="What are they looking for?"
            rows={3}
            value={value.notes}
            onChange={(event) => onChange({ ...value, notes: event.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

export function BookingForm() {
  const availableServices = services.filter((item) => item.active);
  const [service, setService] = useState(availableServices[0]?.key ?? "");
  const selected = availableServices.find((item) => item.key === service);
  const rooms = locations.flatMap((location) => location.rooms);
  if (
    !selected ||
    therapists.length === 0 ||
    rooms.length === 0 ||
    clients.length + leads.length === 0
  ) {
    return (
      <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
        Add a client or lead, an active service, a therapist, and a treatment room before booking.
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Client or lead">
        <Select defaultValue={clients[0]?.id ?? leads[0]!.id}>
          <SelectTrigger id="client-or-lead">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} · client
              </SelectItem>
            ))}
            {leads.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name} · lead
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Service">
        <Select value={service} onValueChange={setService}>
          <SelectTrigger id="service">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableServices.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Duration">
        <Select defaultValue={String(selected.durations[0])} key={selected.key}>
          <SelectTrigger id="duration">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {selected.durations.map((dur) => (
              <SelectItem key={dur} value={String(dur)}>
                {dur} minutes
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Therapist">
        <Select defaultValue={therapists[0]!.id}>
          <SelectTrigger id="therapist">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {therapists.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Room">
        <Select defaultValue={rooms[0]!.id}>
          <SelectTrigger id="room">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {rooms.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name} · {r.type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Date">
        <Input id="date" type="date" defaultValue={TODAY} />
      </Field>
      <Field label="Time">
        <Input id="time" type="time" defaultValue="14:00" />
      </Field>
      <Field label="Price">
        <Input id="price" defaultValue={`$${selected.price}`} key={selected.price} />
      </Field>
      <Field label="Source">
        <Select defaultValue="Website booking">
          <SelectTrigger id="booking-source">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["Website booking", "Google Business Profile", "Referral", "Walk-in", "Instagram"].map(
              (s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Appointment notes">
          <Textarea
            id="appointment-notes"
            rows={2}
            placeholder="Preferences, add-ons, arrival notes"
          />
        </Field>
      </div>
    </div>
  );
}

export function MessageForm() {
  if (leads.length + clients.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
        Add a lead or client before composing a message.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <Field label="Recipient">
        <Select defaultValue={leads[0]?.id ?? clients[0]!.id}>
          <SelectTrigger id="recipient">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[...leads, ...clients].map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Channel">
        <Select defaultValue="sms">
          <SelectTrigger id="channel">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Message">
        <Textarea
          id="message"
          rows={4}
          defaultValue="Hi! This is M&M Massage Spa in Tacoma. We have a few openings this week — would you like me to hold one for you?"
        />
      </Field>
    </div>
  );
}

export function TaskDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (title: string) => void;
}) {
  const [title, setTitle] = useState("");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Create task</DialogTitle>
          <DialogDescription>Tasks are shared with your workspace.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Task">
            <Input
              id="task"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Call Curtis back about deep tissue"
            />
          </Field>
          <Field label="Due">
            <Input id="due" type="date" defaultValue={TODAY} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!title.trim()}
            onClick={() => {
              onCreate(title.trim());
              setTitle("");
            }}
          >
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
