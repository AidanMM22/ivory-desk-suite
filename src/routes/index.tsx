import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  CalendarDays,
  CheckSquare,
  MessageSquarePlus,
  Star,
  TrendingUp,
  UserPlus,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, SectionTitle, EmptyState } from "@/components/shared/page";
import { StatusChip } from "@/components/shared/chips";
import {
  activity,
  appointments,
  attribution,
  automations,
  leads,
  locations,
  serviceByKey,
  therapists,
  TODAY,
} from "@/lib/data";
import {
  addMinutesLabel,
  appointmentStatusLabel,
  appointmentTone,
  clockTime,
  currency,
  dateTime,
  leadStages,
} from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — M&M Spa CRM" },
      {
        name: "description",
        content:
          "Daily operations dashboard for M&M Massage Spa in Tacoma: leads, bookings, revenue, rebooking, and automation health.",
      },
      { property: "og:title", content: "Dashboard — M&M Spa CRM" },
      {
        property: "og:description",
        content: "Leads, bookings, revenue, and automation health at a glance.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { setQuickAction, dateRange, setDateRange, locationId, setLocationId, tasks, toggleTask } =
    useWorkspace();
  const todays = appointments
    .filter((a) => a.start.startsWith(TODAY))
    .sort((a, b) => a.start.localeCompare(b.start));
  const openTasks = tasks.filter((t) => !t.done);
  const bookedLeads = leads.filter((lead) => lead.stage === "booked").length;
  const realizedRevenue = appointments
    .filter((appointment) => appointment.payment === "paid")
    .reduce((sum, appointment) => sum + appointment.price, 0);
  const kpis = [
    { label: "Leads", value: String(leads.length), delta: "Current workspace" },
    {
      label: "Appointments",
      value: String(appointments.length),
      delta: `${todays.length} scheduled today`,
    },
    {
      label: "Lead → booking",
      value: leads.length ? `${((bookedLeads / leads.length) * 100).toFixed(1)}%` : "0%",
      delta: `${bookedLeads} converted leads`,
    },
    { label: "Collected revenue", value: currency(realizedRevenue), delta: "Paid appointments" },
  ];
  const firstName = (
    (user?.user_metadata["full_name"] as string | undefined) ||
    user?.email ||
    "there"
  ).split(/[ @]/)[0];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title={`Good morning, ${firstName}`}
        description="Live workspace overview for M&M Massage Spa."
        actions={
          <>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px]" aria-label="Date range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="last_7">Last 7 days</SelectItem>
                <SelectItem value="last_30">Last 30 days</SelectItem>
                <SelectItem value="quarter">This quarter</SelectItem>
              </SelectContent>
            </Select>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="w-[190px]" aria-label="Location">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setQuickAction("lead")}>
          <UserPlus className="mr-2 h-4 w-4" /> Add lead
        </Button>
        <Button variant="outline" onClick={() => setQuickAction("appointment")}>
          <CalendarDays className="mr-2 h-4 w-4" /> Book appointment
        </Button>
        <Button variant="outline" onClick={() => setQuickAction("message")}>
          <MessageSquarePlus className="mr-2 h-4 w-4" /> Send message
        </Button>
        <Button variant="outline" onClick={() => setQuickAction("task")}>
          <CheckSquare className="mr-2 h-4 w-4" /> Create task
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="surface-soft">
            <CardContent className="p-5">
              <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
                {k.label}
              </p>
              <p className="font-display mt-2 text-3xl">{k.value}</p>
              <p className="mt-2 text-xs text-muted-foreground">{k.delta}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="surface-soft xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle className="font-display text-lg">
              Today&apos;s schedule by therapist
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/appointments">
                Open calendar <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {therapists.map((t) => {
              const rows = todays.filter((a) => a.therapistId === t.id);
              return (
                <div key={t.id} className="grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{t.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{t.availability}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {rows.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                        No appointments today
                      </p>
                    ) : (
                      rows.map((a) => (
                        <div
                          key={a.id}
                          className="min-w-[190px] flex-1 rounded-lg border border-border bg-accent/30 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium">{a.clientName}</p>
                            <StatusChip tone={appointmentTone[a.status]}>
                              {appointmentStatusLabel[a.status]}
                            </StatusChip>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {clockTime(a.start)}–{addMinutesLabel(a.start, a.duration)} ·{" "}
                            {serviceByKey(a.serviceKey).name}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="surface-soft">
          <CardHeader>
            <CardTitle className="font-display text-lg">Lead pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {leadStages.map((stage) => {
              const count = leads.filter((l) => l.stage === stage.key).length;
              return (
                <div key={stage.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{stage.label}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <Progress value={(count / Math.max(leads.length, 1)) * 100} className="h-1.5" />
                </div>
              );
            })}
            <Button variant="outline" className="w-full" asChild>
              <Link to="/leads">Open pipeline</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="surface-soft">
          <CardHeader>
            <CardTitle className="font-display text-lg">Tasks due</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {openTasks.length === 0 ? (
              <EmptyState title="All caught up" description="No open tasks for the team today." />
            ) : (
              openTasks.slice(0, 5).map((t) => (
                <label
                  key={t.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent/40"
                >
                  <Checkbox checked={t.done} onCheckedChange={() => toggleTask(t.id)} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{t.title}</span>
                    <span className="text-xs text-muted-foreground">Due {dateTime(t.dueAt)}</span>
                  </span>
                </label>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="surface-soft">
          <CardHeader>
            <CardTitle className="font-display text-lg">Recent client activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-4 border-l border-border pl-4">
              {activity.slice(0, 6).map((e) => (
                <li key={e.id}>
                  <span className="absolute -left-[5px] mt-1.5 h-2 w-2 rounded-full bg-primary" />
                  <p className="text-sm font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.detail}</p>
                  <p className="text-xs text-muted-foreground/80">
                    {dateTime(e.at)} · {e.actor}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="surface-soft">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="font-display text-lg">Automation health</CardTitle>
              <Workflow className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              {automations.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.successMetric.label} {a.successMetric.value} · {a.failureCount} failures
                    </p>
                  </div>
                  <StatusChip
                    tone={
                      a.status === "active"
                        ? "positive"
                        : a.status === "paused"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {a.status}
                  </StatusChip>
                </div>
              ))}
              <Button variant="outline" className="w-full" asChild>
                <Link to="/automations">Manage automations</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="surface-soft">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="font-display text-lg">Attribution</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              {attribution.map((a) => (
                <div key={a.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate">{a.name}</span>
                    <span className="text-muted-foreground">{a.value}%</span>
                  </div>
                  <Progress value={a.value} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="surface-soft">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">Reputation snapshot</CardTitle>
          <Star className="h-4 w-4 text-gold" />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <SectionTitle>Average rating</SectionTitle>
            <p className="font-display mt-1 text-2xl">4.8 / 5</p>
          </div>
          <div>
            <SectionTitle>Requests sent (30d)</SectionTitle>
            <p className="font-display mt-1 text-2xl">74</p>
          </div>
          <div>
            <SectionTitle>Service recovery queue</SectionTitle>
            <p className="font-display mt-1 text-2xl">2 open</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
