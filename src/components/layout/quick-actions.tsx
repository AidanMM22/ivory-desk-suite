import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import type { Lead, LeadSource, ServiceKey } from "@/lib/types";

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

export function QuickActionDialogs() {
  const { quickAction, setQuickAction, addTask } = useWorkspace();
  const { persistRecord } = useCrmData();
  const { user } = useAuth();
  const [leadDraft, setLeadDraft] = useState<LeadDraft>(emptyLead);
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
