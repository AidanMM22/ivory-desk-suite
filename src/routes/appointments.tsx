import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Clock, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EmptyState, PageHeader, SectionTitle } from "@/components/shared/page";
import { StatusChip } from "@/components/shared/chips";
import { BookingForm } from "@/components/layout/quick-actions";
import {
  appointments as seedAppointments,
  day,
  locations,
  serviceByKey,
  therapistById,
  therapists,
  TODAY,
} from "@/lib/mock/data";
import {
  addMinutesLabel,
  appointmentStatusLabel,
  appointmentTone,
  clockTime,
  currency,
  dateTime,
  minutesFromMidnight,
  shortDate,
} from "@/lib/format";
import type { Appointment } from "@/lib/mock/types";

export const Route = createFileRoute("/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments — M&M Spa CRM" },
      {
        name: "description",
        content:
          "Day, week, month, and list views of massage appointments at M&M Massage Spa in Tacoma, with therapist and room filters.",
      },
      { property: "og:title", content: "Appointments — M&M Spa CRM" },
      { property: "og:description", content: "Calendar and list views with reminder and deposit status." },
    ],
  }),
  component: AppointmentsPage,
});

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const rooms = locations[0]!.rooms;

const reminderTone = {
  sent: "positive",
  scheduled: "info",
  failed: "critical",
  not_scheduled: "warning",
} as const;

function AppointmentsPage() {
  const [view, setView] = useState("day");
  const [therapistFilter, setTherapistFilter] = useState("all");
  const [roomFilter, setRoomFilter] = useState("all");
  const [booking, setBooking] = useState(false);
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [rows, setRows] = useState<Appointment[]>(seedAppointments);

  const filtered = useMemo(
    () =>
      rows
        .filter(
          (a) =>
            (therapistFilter === "all" || a.therapistId === therapistFilter) &&
            (roomFilter === "all" || a.roomId === roomFilter),
        )
        .sort((a, b) => a.start.localeCompare(b.start)),
    [rows, therapistFilter, roomFilter],
  );

  const weekDays = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map((i) => day(i)), []);
  const today = filtered.filter((a) => a.start.startsWith(TODAY));

  const setStatus = (appt: Appointment, status: Appointment["status"], message: string) => {
    setRows((prev) => prev.map((a) => (a.id === appt.id ? { ...a, status } : a)));
    setDetail((cur) => (cur && cur.id === appt.id ? { ...cur, status } : cur));
    toast.success(message);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Appointments"
        description={`${today.length} appointments today · ${rooms.length} treatment rooms in Tacoma`}
        actions={
          <>
            <Select value={therapistFilter} onValueChange={setTherapistFilter}>
              <SelectTrigger className="w-[180px]" aria-label="Filter by therapist">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All therapists</SelectItem>
                {therapists.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={roomFilter} onValueChange={setRoomFilter}>
              <SelectTrigger className="w-[170px]" aria-label="Filter by room">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All rooms</SelectItem>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setBooking(true)}>
              <CalendarPlus className="mr-2 h-4 w-4" /> New appointment
            </Button>
          </>
        }
      />

      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="day">Day</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>
      </Tabs>

      {view === "day" ? (
        <Card className="surface-soft">
          <CardHeader>
            <CardTitle className="font-display text-lg">
              {shortDate(TODAY)} · day view by therapist
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="min-w-[860px]">
              <div
                className="grid gap-2 border-b border-border pb-2 text-xs text-muted-foreground"
                style={{ gridTemplateColumns: `120px repeat(${therapists.length}, minmax(0,1fr))` }}
              >
                <span>Time</span>
                {therapists.map((t) => (
                  <span key={t.id} className="truncate font-medium text-foreground">
                    {t.name}
                  </span>
                ))}
              </div>
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="grid gap-2 border-b border-border/60 py-2"
                  style={{ gridTemplateColumns: `120px repeat(${therapists.length}, minmax(0,1fr))` }}
                >
                  <span className="text-xs text-muted-foreground">
                    {hour % 12 === 0 ? 12 : hour % 12}:00{hour >= 12 ? "p" : "a"}
                  </span>
                  {therapists.map((t) => {
                    const slot = today.find(
                      (a) =>
                        a.therapistId === t.id &&
                        Math.floor(minutesFromMidnight(a.start) / 60) === hour,
                    );
                    return (
                      <div key={t.id} className="min-h-[46px]">
                        {slot ? (
                          <button
                            type="button"
                            onClick={() => setDetail(slot)}
                            className="group flex w-full items-start gap-2 rounded-lg border border-primary/25 bg-accent/50 p-2 text-left hover:shadow-md"
                          >
                            <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100" />
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-semibold">
                                {slot.clientName}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {clockTime(slot.start)}–{addMinutesLabel(slot.start, slot.duration)} ·{" "}
                                {serviceByKey(slot.serviceKey).name}
                              </span>
                            </span>
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {view === "week" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {weekDays.map((dstr) => {
            const items = filtered.filter((a) => a.start.startsWith(dstr));
            return (
              <Card key={dstr} className="surface-soft">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {shortDate(dstr)}
                    {dstr === TODAY ? " · today" : ""}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                      Open day
                    </p>
                  ) : (
                    items.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setDetail(a)}
                        className="w-full rounded-lg border border-border p-2 text-left hover:bg-accent/40"
                      >
                        <p className="truncate text-xs font-semibold">{a.clientName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {clockTime(a.start)} · {serviceByKey(a.serviceKey).name}
                        </p>
                        <StatusChip tone={appointmentTone[a.status]} className="mt-1">
                          {appointmentStatusLabel[a.status]}
                        </StatusChip>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      {view === "month" ? (
        <Card className="surface-soft">
          <CardHeader>
            <CardTitle className="font-display text-lg">Month overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-xs">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <span key={d} className="p-2 text-center font-medium text-muted-foreground">
                  {d}
                </span>
              ))}
              {Array.from({ length: 35 }).map((_, i) => {
                const dstr = day(i - 7);
                const items = filtered.filter((a) => a.start.startsWith(dstr));
                return (
                  <div
                    key={dstr}
                    className={`min-h-[76px] rounded-md border p-1.5 ${
                      dstr === TODAY ? "border-primary/40 bg-accent/40" : "border-border"
                    }`}
                  >
                    <p className="text-muted-foreground">{shortDate(dstr)}</p>
                    {items.slice(0, 2).map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setDetail(a)}
                        className="mt-1 block w-full truncate rounded bg-secondary px-1 py-0.5 text-left text-[11px]"
                      >
                        {clockTime(a.start)} {a.clientName}
                      </button>
                    ))}
                    {items.length > 2 ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        +{items.length - 2} more
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {view === "list" ? (
        filtered.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-6 w-6" />}
            title="No appointments match these filters"
            description="Try another therapist or room."
          />
        ) : (
          <Card className="surface-soft overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Therapist</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reminder</TableHead>
                    <TableHead>Deposit</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.id} className="cursor-pointer" onClick={() => setDetail(a)}>
                      <TableCell className="text-sm">{dateTime(a.start)}</TableCell>
                      <TableCell className="font-medium">{a.clientName}</TableCell>
                      <TableCell className="text-sm">
                        {serviceByKey(a.serviceKey).name} · {a.duration}m
                      </TableCell>
                      <TableCell className="text-sm">{therapistById(a.therapistId)?.name}</TableCell>
                      <TableCell className="text-sm">
                        {rooms.find((r) => r.id === a.roomId)?.name}
                      </TableCell>
                      <TableCell>
                        <StatusChip tone={appointmentTone[a.status]}>
                          {appointmentStatusLabel[a.status]}
                        </StatusChip>
                      </TableCell>
                      <TableCell>
                        <StatusChip tone={reminderTone[a.reminder]}>
                          {a.reminder.replace("_", " ")}
                        </StatusChip>
                      </TableCell>
                      <TableCell>
                        <StatusChip
                          tone={
                            a.deposit === "paid"
                              ? "positive"
                              : a.deposit === "unpaid"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {a.deposit.replace("_", " ")}
                        </StatusChip>
                      </TableCell>
                      <TableCell className="text-right text-sm">{currency(a.price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )
      ) : null}

      <Sheet open={booking} onOpenChange={setBooking}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">New appointment</SheetTitle>
            <SheetDescription>
              M&amp;M Massage Spa · Tacoma, WA · {locations[0]!.phone}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-10">
            <BookingForm />
            <Button
              className="w-full"
              onClick={() => {
                toast.success("Appointment booked", {
                  description: "Confirmation and reminders scheduled (mock).",
                });
                setBooking(false);
              }}
            >
              Book appointment
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {detail ? (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-2xl">{detail.clientName}</SheetTitle>
                <SheetDescription>
                  {serviceByKey(detail.serviceKey).name} · {detail.duration} minutes ·{" "}
                  {currency(detail.price)}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-10">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Detail label="When" value={dateTime(detail.start)} />
                  <Detail
                    label="Therapist"
                    value={therapistById(detail.therapistId)?.name ?? "Unassigned"}
                  />
                  <Detail
                    label="Room"
                    value={rooms.find((r) => r.id === detail.roomId)?.name ?? "—"}
                  />
                  <Detail label="Source" value={detail.source} />
                  <Detail label="Reminder" value={detail.reminder.replace("_", " ")} />
                  <Detail label="Deposit" value={detail.deposit.replace("_", " ")} />
                  <Detail label="Payment" value={detail.payment} />
                  <Detail label="Status" value={appointmentStatusLabel[detail.status]} />
                </div>
                <div className="rounded-lg border border-border p-3">
                  <SectionTitle>Notes</SectionTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {detail.notes || "No appointment notes."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => toast.success("Reschedule flow opened (mock)")}
                  >
                    Reschedule
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setStatus(detail, "cancelled", "Appointment cancelled")}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setStatus(detail, "no_show", "Marked as no-show — recovery queued")}
                  >
                    Mark no-show
                  </Button>
                  <Button onClick={() => setStatus(detail, "checked_in", "Client checked in")}>
                    Check in
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <SectionTitle>{label}</SectionTitle>
      <p className="mt-1 text-sm font-medium capitalize">{value}</p>
    </div>
  );
}