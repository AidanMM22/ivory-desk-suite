import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, MessageSquare, Search, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, PageHeader, RestrictedNotice, SectionTitle } from "@/components/shared/page";
import { ConsentChip, StatusChip } from "@/components/shared/chips";
import {
  appointments,
  clients as seedClients,
  conversations,
  serviceByKey,
  therapistById,
} from "@/lib/data";
import {
  appointmentStatusLabel,
  appointmentTone,
  currency,
  dateTime,
  initialsOf,
} from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import type { Client } from "@/lib/types";

export const Route = createFileRoute("/clients")({
  head: () => ({
    meta: [
      { title: "Clients — M&M Spa CRM" },
      {
        name: "description",
        content:
          "Client directory and 360 profiles for M&M Massage Spa in Tacoma: lifetime value, visits, preferences, packages, and consent.",
      },
      { property: "og:title", content: "Clients — M&M Spa CRM" },
      {
        property: "og:description",
        content: "Directory and client 360 profiles with consent status.",
      },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const { setQuickAction } = useWorkspace();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("all");
  const [sort, setSort] = useState("ltv");
  const [open, setOpen] = useState<Client | null>(null);

  const tags = useMemo(() => Array.from(new Set(seedClients.flatMap((c) => c.tags))), []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return seedClients
      .filter(
        (c) =>
          (!q ||
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.phone.includes(q)) &&
          (tag === "all" || c.tags.includes(tag)),
      )
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "visits") return b.visitCount - a.visitCount;
        if (sort === "recent") return (b.lastVisitAt ?? "").localeCompare(a.lastVisitAt ?? "");
        return b.lifetimeValue - a.lifetimeValue;
      });
  }, [query, tag, sort]);
  const averageLifetimeValue = seedClients.length
    ? Math.round(
        seedClients.reduce((sum, client) => sum + client.lifetimeValue, 0) / seedClients.length,
      )
    : 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Clients"
        description={`${seedClients.length} clients · average lifetime value ${currency(averageLifetimeValue)}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setQuickAction("client")}>
              <UserPlus className="mr-2 h-4 w-4" /> Add client
            </Button>
            <Button onClick={() => setQuickAction("appointment")}>
              <CalendarPlus className="mr-2 h-4 w-4" /> Book appointment
            </Button>
          </>
        }
      />

      <Card className="surface-soft">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search clients"
              className="pl-9"
              placeholder="Search by name, email, or phone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={tag} onValueChange={setTag}>
            <SelectTrigger className="w-[190px]" aria-label="Filter by tag">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {tags.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[190px]" aria-label="Sort clients">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ltv">Highest lifetime value</SelectItem>
              <SelectItem value="visits">Most visits</SelectItem>
              <SelectItem value="recent">Most recent visit</SelectItem>
              <SelectItem value="name">Name A–Z</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No clients found"
          description="Adjust your search or tag filter to see the directory again."
        />
      ) : (
        <Card className="surface-soft overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Lifetime value</TableHead>
                  <TableHead className="text-right">Visits</TableHead>
                  <TableHead>Last visit</TableHead>
                  <TableHead>Next visit</TableHead>
                  <TableHead>Preferred</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Rebooked</TableHead>
                  <TableHead>Consent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => setOpen(c)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
                          {initialsOf(c.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{c.name}</span>
                          <span className="block text-xs text-muted-foreground">{c.phone}</span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {currency(c.lifetimeValue)}
                    </TableCell>
                    <TableCell className="text-right">{c.visitCount}</TableCell>
                    <TableCell className="text-sm">
                      {c.lastVisitAt ? dateTime(c.lastVisitAt) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.nextVisitAt ? dateTime(c.nextVisitAt) : "Not booked"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {serviceByKey(c.preferredService).name}
                      <span className="block text-xs text-muted-foreground">
                        {therapistById(c.preferredTherapistId)?.name ?? "No preference"}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-48 text-xs text-muted-foreground">
                      {c.tags.slice(0, 2).join(", ")}
                      {c.tags.length > 2 ? ` +${c.tags.length - 2}` : ""}
                    </TableCell>
                    <TableCell>
                      <StatusChip tone={c.rebooked ? "positive" : "warning"}>
                        {c.rebooked ? "Rebooked" : "Needs rebooking"}
                      </StatusChip>
                    </TableCell>
                    <TableCell>
                      {c.consent.sms === "granted" && c.consent.email === "granted" ? (
                        <span className="text-xs text-muted-foreground">Contactable</span>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          {c.consent.sms !== "granted" ? (
                            <ConsentChip channel="SMS" state={c.consent.sms} />
                          ) : null}
                          {c.consent.email !== "granted" ? (
                            <ConsentChip channel="Email" state={c.consent.email} />
                          ) : null}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <ClientProfile client={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function ClientProfile({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const { role, can, setQuickAction } = useWorkspace();
  const history = appointments.filter((a) => a.clientId === client?.id);
  const convo = conversations.find((c) => c.subjectId === client?.id);

  return (
    <Sheet open={!!client} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {client ? (
          <>
            <SheetHeader>
              <SheetTitle className="font-display text-2xl">{client.name}</SheetTitle>
              <SheetDescription>
                {client.phone} · {client.email} · client since {dateTime(client.createdAt)}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-4 pb-10">
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Lifetime value" value={currency(client.lifetimeValue)} />
                <Stat label="Visits" value={String(client.visitCount)} />
                <Stat
                  label="Next visit"
                  value={client.nextVisitAt ? dateTime(client.nextVisitAt) : "Not booked"}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setQuickAction("appointment")}>
                  <CalendarPlus className="mr-2 h-4 w-4" /> Book
                </Button>
                <Button variant="outline" onClick={() => setQuickAction("message")}>
                  <MessageSquare className="mr-2 h-4 w-4" /> Message
                </Button>
                <Button variant="outline" onClick={() => toast.success("Task created")}>
                  Add task
                </Button>
              </div>

              <Tabs defaultValue="overview">
                <TabsList className="flex-wrap">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="history">Appointments</TabsTrigger>
                  <TabsTrigger value="assets">Packages</TabsTrigger>
                  <TabsTrigger value="comms">Communication</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Stat
                      label="Preferred service"
                      value={serviceByKey(client.preferredService).name}
                    />
                    <Stat
                      label="Preferred therapist"
                      value={therapistById(client.preferredTherapistId)?.name ?? "No preference"}
                    />
                    <Stat label="Birthday" value={client.birthday ?? "Not on file"} />
                    <Stat
                      label="Intake / consent forms"
                      value={client.intakeComplete ? "Complete" : "Incomplete"}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">{client.tags.join(" · ")}</p>
                  <div className="rounded-lg border border-border p-3 text-sm">
                    <SectionTitle>Marketing eligibility</SectionTitle>
                    <p className="mt-2 text-muted-foreground">
                      {client.consent.marketing
                        ? "Eligible for campaigns and lifecycle automations."
                        : "Excluded from campaigns — transactional messages only."}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <ConsentChip channel="SMS" state={client.consent.sms} />
                      <ConsentChip channel="Email" state={client.consent.email} />
                      {client.consent.unsubscribedAt ? (
                        <StatusChip tone="critical">
                          Unsubscribed {dateTime(client.consent.unsubscribedAt)}
                        </StatusChip>
                      ) : null}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="pt-4">
                  {history.length === 0 ? (
                    <EmptyState
                      title="No appointment history"
                      description="Book a first visit to start the record."
                    />
                  ) : (
                    <div className="space-y-2">
                      {history.map((a) => (
                        <div
                          key={a.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {serviceByKey(a.serviceKey).name} · {a.duration} min
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {dateTime(a.start)} · {therapistById(a.therapistId)?.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusChip tone={appointmentTone[a.status]}>
                              {appointmentStatusLabel[a.status]}
                            </StatusChip>
                            <span className="text-sm">{currency(a.price)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="assets" className="space-y-3 pt-4">
                  <SectionTitle>Packages</SectionTitle>
                  {client.packages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active packages.</p>
                  ) : (
                    client.packages.map((p) => (
                      <div key={p.id} className="rounded-lg border border-border p-3 text-sm">
                        <p className="font-medium">{p.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.remaining} remaining · expires {p.expiresAt}
                        </p>
                      </div>
                    ))
                  )}
                  <SectionTitle>Gift cards</SectionTitle>
                  {client.giftCards.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No gift cards on file.</p>
                  ) : (
                    client.giftCards.map((g) => (
                      <div key={g.id} className="rounded-lg border border-border p-3 text-sm">
                        <p className="font-medium">{g.code}</p>
                        <p className="text-xs text-muted-foreground">
                          Balance {currency(g.balance)}
                        </p>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="comms" className="space-y-3 pt-4">
                  {convo ? (
                    convo.messages.map((m) => (
                      <div key={m.id} className="rounded-lg border border-border p-3">
                        <p className="text-sm">{m.body}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {m.channel.toUpperCase()} · {m.direction} · {dateTime(m.sentAt)} ·{" "}
                          {m.authorName}
                        </p>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="No conversation yet"
                      description="Messages sent from the inbox will appear here."
                    />
                  )}
                </TabsContent>

                <TabsContent value="notes" className="space-y-3 pt-4">
                  <div className="rounded-lg border border-border p-3">
                    <SectionTitle>Internal note</SectionTitle>
                    {can("clients.allNotes") ? (
                      <p className="mt-2 text-sm text-muted-foreground">{client.internalNote}</p>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Hidden for the Therapist role — internal notes are limited to your own
                        clients.
                      </p>
                    )}
                  </div>
                  {can("clients.allNotes") ? (
                    <RestrictedNotice>
                      Treatment / intake note (restricted): {client.restrictedNote}
                    </RestrictedNotice>
                  ) : (
                    <RestrictedNotice>
                      Restricted intake notes are not visible in the{" "}
                      {role === "therapist" ? "Therapist" : "current"} role preview.
                    </RestrictedNotice>
                  )}
                  <Textarea
                    aria-label="Add internal note"
                    rows={3}
                    placeholder="Add an internal note…"
                  />
                  <Button size="sm" onClick={() => toast.success("Note saved")}>
                    Save note
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <SectionTitle>{label}</SectionTitle>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
