import { useState } from "react";
import { CalendarDays, Check, ChevronsUpDown, Clock } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MultiSelectDropdown } from "@/components/shared/multi-select";
import { ServiceDurationPrices } from "@/components/shared/service-duration-prices";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/lib/workspace";
import { clients, services, therapists, TODAY, locations } from "@/lib/data";
import { useCrmData } from "@/lib/crm-data";
import { availableClientTags } from "@/lib/client-tags";
import { currency } from "@/lib/format";
import {
  eligibleRooms,
  eligibleTherapists,
  hasSchedulingConflict,
  allRooms,
  roomIdsForService,
  therapistIdsForService,
  therapistAvailableAt,
  therapistHasSchedulingConflict,
  roomHasSchedulingConflict,
} from "@/lib/scheduling";
import {
  durationOptionsFromDrafts,
  durationPriceDraftsAreValid,
  emptyDurationPriceDraft,
  serviceDurationOptions,
  servicePriceForDuration,
  type DurationPriceDraft,
} from "@/lib/service-pricing";
import { cn } from "@/lib/utils";
import type {
  Appointment,
  Client,
  DayAvailability,
  LeadSource,
  Location,
  RoomStatus,
  Service,
  ServiceKey,
  Therapist,
  Weekday,
} from "@/lib/types";

interface ClientDraft {
  name: string;
  phone: string;
  email: string;
  preferredService: ServiceKey;
  locationId: string;
  tags: string[];
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
  capacity: string;
  internalNotes: string;
  status: RoomStatus;
  serviceKeys: string[];
  locationId: string;
  locationName: string;
  locationAddress: string;
  locationPhone: string;
}

interface ServiceDraft {
  name: string;
  durationPrices: DurationPriceDraft[];
  cleanupMinutes: string;
  description: string;
  roomIds: string[];
  therapistIds: string[];
  active: boolean;
}

const emptyClient: ClientDraft = {
  name: "",
  phone: "",
  email: "",
  preferredService: "unspecified",
  locationId: "",
  tags: [],
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
  capacity: "1",
  internalNotes: "",
  status: "available",
  serviceKeys: [],
  locationId: "",
  locationName: "",
  locationAddress: "",
  locationPhone: "",
};

const emptyService: ServiceDraft = {
  name: "",
  durationPrices: [emptyDurationPriceDraft()],
  cleanupMinutes: "0",
  description: "",
  roomIds: [],
  therapistIds: [],
  active: true,
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export function QuickActionDialogs() {
  const { quickAction, setQuickAction, addTask } = useWorkspace();
  const { persistRecord } = useCrmData();
  const [clientDraft, setClientDraft] = useState<ClientDraft>(emptyClient);
  const [therapistDraft, setTherapistDraft] = useState<TherapistDraft>(createEmptyTherapist);
  const [roomDraft, setRoomDraft] = useState<RoomDraft>(emptyRoom);
  const [serviceDraft, setServiceDraft] = useState<ServiceDraft>(emptyService);
  const [saving, setSaving] = useState(false);
  const close = () => setQuickAction(null);

  return (
    <>
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
            <div className="sm:col-span-2">
              <Field label="Tags">
                <MultiSelectDropdown
                  label="Client tags"
                  value={clientDraft.tags}
                  options={availableClientTags().map((tag) => ({ id: tag, label: tag }))}
                  placeholder="Add tags"
                  onChange={(tags) => setClientDraft({ ...clientDraft, tags })}
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
                  tags: clientDraft.tags,
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
                const selectedService = services.find(
                  (service) => service.key === therapistDraft.serviceKey,
                );
                const serviceUpdate = selectedService
                  ? {
                      ...selectedService,
                      therapistIds: Array.from(
                        new Set([...therapistIdsForService(selectedService), therapist.id]),
                      ),
                    }
                  : null;
                void Promise.all([
                  persistRecord("therapists", therapist, locationId),
                  ...(serviceUpdate ? [persistRecord("services", serviceUpdate)] : []),
                ])
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
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
            <Field label="Capacity">
              <Input
                id="room-capacity"
                type="number"
                min="1"
                value={roomDraft.capacity}
                onChange={(event) => setRoomDraft({ ...roomDraft, capacity: event.target.value })}
              />
            </Field>
            <Field label="Availability">
              <Select
                value={roomDraft.status}
                onValueChange={(status) =>
                  setRoomDraft({ ...roomDraft, status: status as RoomStatus })
                }
              >
                <SelectTrigger id="room-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Services">
                <MultiSelectDropdown
                  label="Services for this room"
                  value={roomDraft.serviceKeys}
                  options={services.map((service) => ({
                    id: service.key,
                    label: service.name,
                  }))}
                  placeholder="Choose services"
                  onChange={(serviceKeys) => setRoomDraft({ ...roomDraft, serviceKeys })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Internal notes">
                <Textarea
                  id="room-notes"
                  rows={2}
                  value={roomDraft.internalNotes}
                  onChange={(event) =>
                    setRoomDraft({ ...roomDraft, internalNotes: event.target.value })
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
                !roomDraft.name.trim() ||
                !roomDraft.type.trim() ||
                Number(roomDraft.capacity) < 1 ||
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
                  capacity: Number(roomDraft.capacity),
                  internalNotes: roomDraft.internalNotes.trim(),
                  status: roomDraft.status,
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
                const selectedServices = new Set(roomDraft.serviceKeys);
                const serviceUpdates = services.map((service) => ({
                  ...service,
                  roomIds: Array.from(
                    new Set([
                      ...roomIdsForService(service),
                      ...(selectedServices.has(service.key) ? [room.id] : []),
                    ]),
                  ),
                }));
                void Promise.all([
                  persistRecord("locations", location, location.id),
                  ...serviceUpdates.map((service) => persistRecord("services", service)),
                ])
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
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
            <ServiceDurationPrices
              value={serviceDraft.durationPrices}
              onChange={(durationPrices) => setServiceDraft({ ...serviceDraft, durationPrices })}
            />
            <Field label="Cleanup / buffer">
              <Input
                id="service-cleanup"
                type="number"
                min="0"
                step="5"
                value={serviceDraft.cleanupMinutes}
                onChange={(event) =>
                  setServiceDraft({ ...serviceDraft, cleanupMinutes: event.target.value })
                }
              />
            </Field>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
              <div>
                <Label htmlFor="service-active">Active</Label>
                <p className="text-xs text-muted-foreground">Available for booking</p>
              </div>
              <Switch
                id="service-active"
                checked={serviceDraft.active}
                onCheckedChange={(active) => setServiceDraft({ ...serviceDraft, active })}
              />
            </div>
            <div className="sm:col-span-2">
              <Field label="Compatible rooms">
                <MultiSelectDropdown
                  label="Rooms for this service"
                  value={serviceDraft.roomIds}
                  options={allRooms().map((room) => ({
                    id: room.id,
                    label: `${room.name} · ${room.locationName}`,
                  }))}
                  placeholder="Choose rooms"
                  onChange={(roomIds) => setServiceDraft({ ...serviceDraft, roomIds })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Qualified therapists">
                <MultiSelectDropdown
                  label="Therapists for this service"
                  value={serviceDraft.therapistIds}
                  options={therapists.map((therapist) => ({
                    id: therapist.id,
                    label: therapist.name,
                  }))}
                  placeholder="Choose therapists"
                  onChange={(therapistIds) => setServiceDraft({ ...serviceDraft, therapistIds })}
                />
              </Field>
            </div>
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
                !durationPriceDraftsAreValid(serviceDraft.durationPrices) ||
                Number(serviceDraft.cleanupMinutes) < 0
              }
              onClick={() => {
                const id = crypto.randomUUID();
                const durationOptions = durationOptionsFromDrafts(serviceDraft.durationPrices);
                const service: Service = {
                  id,
                  key: id,
                  name: serviceDraft.name.trim(),
                  durations: durationOptions.map((option) => option.duration),
                  durationOptions,
                  cleanupMinutes: Number(serviceDraft.cleanupMinutes),
                  price: durationOptions[0]!.price,
                  description: serviceDraft.description.trim(),
                  roomIds: serviceDraft.roomIds,
                  therapistIds: serviceDraft.therapistIds,
                  active: serviceDraft.active,
                };
                setSaving(true);
                const selectedTherapists = new Set(serviceDraft.therapistIds);
                const therapistUpdates = therapists
                  .filter((therapist) => selectedTherapists.has(therapist.id))
                  .map((therapist) => ({
                    ...therapist,
                    specialties: Array.from(new Set([...therapist.specialties, service.key])),
                  }));
                void Promise.all([
                  persistRecord("services", service),
                  ...therapistUpdates.map((therapist) =>
                    persistRecord("therapists", therapist, therapist.locationId),
                  ),
                ])
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
          <BookingForm onBooked={close} />
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancel
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

export function BookingForm({ onBooked }: { onBooked?: (appointment: Appointment) => void }) {
  const { persistRecord } = useCrmData();
  const availableServices = services.filter((item) => item.active);
  const activeClients = clients.filter((client) => !client.archivedAt);
  const [service, setService] = useState(availableServices[0]?.key ?? "");
  const selected = availableServices.find((item) => item.key === service);
  const durationOptions = selected ? serviceDurationOptions(selected) : [];
  const eligibleServiceRooms = selected ? eligibleRooms(selected) : [];
  const qualifiedTherapists = selected ? eligibleTherapists(selected) : [];
  const [subjectId, setSubjectId] = useState("");
  const [duration, setDuration] = useState(String(durationOptions[0]?.duration ?? 60));
  const [therapistId, setTherapistId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [date, setDate] = useState(TODAY);
  const [time, setTime] = useState("14:00");
  const [source, setSource] = useState<LeadSource>("Website booking");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const serviceDuration = Number(duration);
  const cleanupMinutes = selected?.cleanupMinutes ?? 0;
  const candidateStart =
    date && time && Number.isFinite(serviceDuration)
      ? new Date(`${date}T${time}:00`).toISOString()
      : "";
  const selectedTimeIsPast =
    candidateStart !== "" && new Date(candidateStart).getTime() < Date.now();
  const slotAvailableRooms =
    candidateStart && !selectedTimeIsPast
      ? eligibleServiceRooms.filter(
          (room) =>
            !roomHasSchedulingConflict({
              start: candidateStart,
              duration: serviceDuration,
              cleanupMinutes,
              roomId: room.id,
            }),
        )
      : [];
  const locationCompatibleTherapists = qualifiedTherapists.filter((therapist) =>
    eligibleServiceRooms.some((room) => room.locationId === therapist.locationId),
  );
  const scheduledTherapists =
    candidateStart && !selectedTimeIsPast
      ? locationCompatibleTherapists.filter((therapist) =>
          therapistAvailableAt(therapist, candidateStart, serviceDuration, cleanupMinutes),
        )
      : [];
  const availableTherapists = scheduledTherapists.filter(
    (therapist) =>
      !therapistHasSchedulingConflict({
        start: candidateStart,
        duration: serviceDuration,
        cleanupMinutes,
        therapistId: therapist.id,
      }),
  );
  const effectiveTherapistId = availableTherapists.some((item) => item.id === therapistId)
    ? therapistId
    : "";
  const selectedTherapist = availableTherapists.find(
    (therapist) => therapist.id === effectiveTherapistId,
  );
  const availableRooms = selectedTherapist
    ? slotAvailableRooms.filter((room) => room.locationId === selectedTherapist.locationId)
    : slotAvailableRooms;
  const effectiveRoomId = availableRooms.some((item) => item.id === roomId) ? roomId : "";
  const selectedPrice = selected ? servicePriceForDuration(selected, serviceDuration) : 0;
  const bookingBlocker = !subjectId
    ? "Search for and select a client to continue."
    : qualifiedTherapists.length === 0
      ? "No active therapist is assigned to perform this service."
      : eligibleServiceRooms.length === 0
        ? "No available room is assigned to this service."
        : locationCompatibleTherapists.length === 0
          ? "The qualified therapists and compatible rooms for this service are assigned to different locations."
          : selectedTimeIsPast
            ? "Choose a future appointment time."
            : scheduledTherapists.length === 0
              ? "No qualified therapist is scheduled for the full appointment and cleanup time."
              : availableTherapists.length === 0
                ? "All qualified therapists are already booked during this time."
                : !effectiveTherapistId
                  ? "Choose an available therapist to continue."
                  : availableRooms.length === 0
                    ? "No compatible room is free at the selected therapist's location."
                    : !effectiveRoomId
                      ? "Choose an available room to continue."
                      : null;

  if (!selected || activeClients.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
        Add a client and an active service before booking.
      </div>
    );
  }

  const selectService = (serviceKey: string) => {
    const next = availableServices.find((item) => item.key === serviceKey);
    const nextOptions = next ? serviceDurationOptions(next) : [];
    setService(serviceKey);
    setDuration(String(nextOptions[0]?.duration ?? 60));
    setTherapistId("");
    setRoomId("");
  };

  const book = () => {
    const subject = activeClients.find((item) => item.id === subjectId);
    const therapist = availableTherapists.find((item) => item.id === effectiveTherapistId);
    const room = availableRooms.find((item) => item.id === effectiveRoomId);
    if (!subject || !therapist || !room) {
      toast.error("Choose a client, available therapist, and available room.");
      return;
    }
    const start = new Date(`${date}T${time}:00`).toISOString();
    if (new Date(start).getTime() < Date.now()) {
      toast.error("Choose a future appointment time.");
      return;
    }
    if (!therapistAvailableAt(therapist, start, serviceDuration, cleanupMinutes)) {
      toast.error(`${therapist.name} is not available for the full appointment and buffer time.`);
      return;
    }
    if (
      hasSchedulingConflict({
        start,
        duration: serviceDuration,
        cleanupMinutes,
        roomId: room.id,
        therapistId: therapist.id,
      })
    ) {
      toast.error("That room or therapist is already booked during this time.");
      return;
    }
    const appointment: Appointment = {
      id: crypto.randomUUID(),
      clientId: subject.id,
      clientName: subject.name,
      serviceKey: selected.key,
      duration: serviceDuration,
      therapistId: therapist.id,
      roomId: room.id,
      start,
      status: "confirmed",
      price: selectedPrice,
      deposit: "not_required",
      payment: "due",
      reminder: "scheduled",
      source,
      notes: notes.trim(),
      locationId: room.locationId,
    };
    const bookedClient = subject.tags.includes("Lead")
      ? { ...subject, tags: subject.tags.filter((tag) => tag !== "Lead") }
      : null;
    setSaving(true);
    void Promise.all([
      persistRecord("appointments", appointment, appointment.locationId),
      ...(bookedClient ? [persistRecord("clients", bookedClient, bookedClient.locationId)] : []),
    ])
      .then(() => {
        toast.success("Appointment booked");
        onBooked?.(appointment);
      })
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : "Could not book the appointment."),
      )
      .finally(() => setSaving(false));
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Client">
        <ClientSearchCombobox clients={activeClients} value={subjectId} onChange={setSubjectId} />
      </Field>
      <Field label="Service">
        <Select value={service} onValueChange={selectService}>
          <SelectTrigger id="service">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableServices.map((item) => (
              <SelectItem key={item.key} value={item.key}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Service duration">
        <Select
          value={duration}
          onValueChange={(value) => {
            setDuration(value);
            setTherapistId("");
            setRoomId("");
          }}
        >
          <SelectTrigger id="duration">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {durationOptions.map((option) => (
              <SelectItem key={option.duration} value={String(option.duration)}>
                {option.duration} minutes · {currency(option.price)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Price">
        <div className="flex h-10 items-center justify-between rounded-md border border-border bg-muted/30 px-3">
          <span className="font-medium">{currency(selectedPrice)}</span>
          <span className="text-xs text-muted-foreground">Set by duration</span>
        </div>
      </Field>
      <div className="rounded-xl border border-border bg-muted/20 p-4 sm:col-span-2">
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Appointment date and time</p>
            <p className="text-xs text-muted-foreground">
              Availability updates automatically as you make a selection.
            </p>
          </div>
        </div>
        <DateTimeFields
          date={date}
          time={time}
          onDateChange={(value) => {
            setDate(value);
            setTherapistId("");
            setRoomId("");
          }}
          onTimeChange={(value) => {
            setTime(value);
            setTherapistId("");
            setRoomId("");
          }}
        />
      </div>
      <Field label="Qualified therapist">
        <Select
          value={effectiveTherapistId}
          onValueChange={(value) => {
            setTherapistId(value);
            setRoomId("");
          }}
          disabled={availableTherapists.length === 0}
        >
          <SelectTrigger id="therapist">
            <SelectValue placeholder="Choose an available therapist" />
          </SelectTrigger>
          <SelectContent>
            {availableTherapists.map((therapist) => (
              <SelectItem key={therapist.id} value={therapist.id}>
                {therapist.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Compatible room">
        <Select
          value={effectiveRoomId}
          onValueChange={setRoomId}
          disabled={availableRooms.length === 0}
        >
          <SelectTrigger id="room">
            <SelectValue placeholder="Choose an available room" />
          </SelectTrigger>
          <SelectContent>
            {availableRooms.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.name} · {room.locationName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Source">
        <Select value={source} onValueChange={(value) => setSource(value as LeadSource)}>
          <SelectTrigger id="booking-source">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["Website booking", "Google Business Profile", "Referral", "Walk-in", "Instagram"].map(
              (item) => (
                <SelectItem key={item} value={item}>
                  {item}
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
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
      </div>
      {bookingBlocker ? (
        <p className="sm:col-span-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
          {bookingBlocker}
        </p>
      ) : null}
      <Button
        className="sm:col-span-2"
        disabled={
          saving || !!bookingBlocker || !date || !time || Number(duration) <= 0 || selectedPrice < 0
        }
        onClick={book}
      >
        {saving ? "Booking…" : "Book appointment"}
      </Button>
    </div>
  );
}

function ClientSearchCombobox({
  clients: availableClients,
  value,
  onChange,
}: {
  clients: Client[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedClient = availableClients.find((client) => client.id === value);
  const q = query.trim().toLowerCase();
  const matchingClients = availableClients.filter(
    (client) =>
      !q ||
      client.name.toLowerCase().includes(q) ||
      client.phone.toLowerCase().includes(q) ||
      client.email.toLowerCase().includes(q),
  );

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 w-full justify-between px-3 font-normal"
        >
          <span className={cn("truncate", !selectedClient && "text-muted-foreground")}>
            {selectedClient ? selectedClient.name : "Type a name, phone, or email"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            autoFocus
            placeholder="Search name, phone, or email…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {matchingClients.length === 0 ? (
              <CommandEmpty>No client matches that search.</CommandEmpty>
            ) : (
              <CommandGroup>
                {matchingClients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={client.id}
                    onSelect={() => {
                      onChange(client.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("h-4 w-4", client.id === value ? "opacity-100" : "opacity-0")}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{client.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[client.phone, client.email].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const BOOKING_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2);
  const minutes = index % 2 === 0 ? 0 : 30;
  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  return {
    value,
    label: new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
});

function DateTimeFields({
  date,
  time,
  onDateChange,
  onTimeChange,
}: {
  date: string;
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const selectedDate = date ? new Date(`${date}T12:00:00`) : undefined;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Date</Label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full justify-start bg-background px-3 font-normal"
            >
              <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
              {selectedDate ? format(selectedDate, "EEE, MMM d, yyyy") : "Choose a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              disabled={{ before: startOfDay(new Date()) }}
              onSelect={(nextDate) => {
                if (!nextDate) return;
                onDateChange(format(nextDate, "yyyy-MM-dd"));
                setCalendarOpen(false);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-1.5">
        <Label>Start time</Label>
        <Select value={time} onValueChange={onTimeChange}>
          <SelectTrigger className="bg-background">
            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Choose a time" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {BOOKING_TIME_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function MessageForm() {
  if (clients.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
        Add a client before composing a message.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <Field label="Recipient">
        <Select defaultValue={clients[0]!.id}>
          <SelectTrigger id="recipient">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {clients.map((p) => (
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
