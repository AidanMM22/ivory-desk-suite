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
import { clients, leads, services, therapists, TODAY, locations } from "@/lib/mock/data";

export function QuickActionDialogs() {
  const { quickAction, setQuickAction, addTask } = useWorkspace();
  const close = () => setQuickAction(null);

  return (
    <>
      <Dialog open={quickAction === "lead"} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Add lead</DialogTitle>
            <DialogDescription>
              Practice workspace — new leads are stored in this session only.
            </DialogDescription>
          </DialogHeader>
          <LeadForm />
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success("Lead saved", { description: "Speed-to-lead follow-up queued (mock)." });
                close();
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
              Tacoma, WA · questions? {locations[0]!.phone}
            </DialogDescription>
          </DialogHeader>
          <BookingForm />
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success("Appointment booked", {
                  description: "Confirmation + reminders scheduled (mock).",
                });
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
              Messaging is not connected yet — sends are simulated.
            </DialogDescription>
          </DialogHeader>
          <MessageForm />
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success("Message queued (mock)");
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

export function LeadForm() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name">
        <Input id="full-name" placeholder="Jamie Ortega" />
      </Field>
      <Field label="Phone">
        <Input id="phone" placeholder="(253) 555-0123" />
      </Field>
      <Field label="Email">
        <Input id="email" type="email" placeholder="jamie@example.com" />
      </Field>
      <Field label="Service interest">
        <Select defaultValue="swedish">
          <SelectTrigger id="service-interest">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {services.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Source">
        <Select defaultValue="Website booking">
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
        <Select defaultValue="u-2">
          <SelectTrigger id="owner">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="u-1">Marisol Vega</SelectItem>
            <SelectItem value="u-2">Dana Whitfield</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Notes">
          <Textarea id="notes" placeholder="What are they looking for?" rows={3} />
        </Field>
      </div>
    </div>
  );
}

export function BookingForm() {
  const [service, setService] = useState("swedish");
  const selected = services.find((s) => s.key === service) ?? services[0]!;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Client or lead">
        <Select defaultValue={clients[0]!.id}>
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
            {services
              .filter((s) => s.active)
              .map((s) => (
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
        <Select defaultValue="room-1">
          <SelectTrigger id="room">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {locations[0]!.rooms.map((r) => (
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
          <Textarea id="appointment-notes" rows={2} placeholder="Preferences, add-ons, arrival notes" />
        </Field>
      </div>
    </div>
  );
}

export function MessageForm() {
  return (
    <div className="space-y-4">
      <Field label="Recipient">
        <Select defaultValue={leads[0]!.id}>
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
          <DialogDescription>Tasks live in this practice workspace session.</DialogDescription>
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