import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, MessageSquare, Search, Trash2, UserPlus, Users } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { MultiSelectDropdown } from "@/components/shared/multi-select";
import {
  appointments,
  clients as seedClients,
  conversations,
  locations,
  serviceByKey,
  services,
  therapistById,
  therapists,
} from "@/lib/data";
import {
  appointmentStatusLabel,
  appointmentTone,
  currency,
  dateTime,
  initialsOf,
} from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { useCrmData } from "@/lib/crm-data";
import { availableClientTags } from "@/lib/client-tags";
import type { Client } from "@/lib/types";

export const Route = createFileRoute("/clients")({
  head: () => ({
    meta: [
      { title: "Clients — M&M Spa CRM" },
      {
        name: "description",
        content:
          "Client directory and editable profiles for M&M Massage Spa in Tacoma: contact details, visits, preferences, tags, notes, and consent.",
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
  const { can, setQuickAction } = useWorkspace();
  const { persistRecord, removeRecord } = useCrmData();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("all");
  const [sort, setSort] = useState("ltv");
  const [open, setOpen] = useState<Client | null>(null);
  const [removing, setRemoving] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  const tags = availableClientTags();
  const activeClients = seedClients.filter((client) => !client.archivedAt);

  const q = query.trim().toLowerCase();
  const rows = activeClients
    .filter(
      (client) =>
        (!q ||
          client.name.toLowerCase().includes(q) ||
          client.email.toLowerCase().includes(q) ||
          client.phone.includes(q)) &&
        (tag === "all" || client.tags.includes(tag)),
    )
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "visits") return b.visitCount - a.visitCount;
      if (sort === "recent") return (b.lastVisitAt ?? "").localeCompare(a.lastVisitAt ?? "");
      return b.lifetimeValue - a.lifetimeValue;
    });
  const averageLifetimeValue = activeClients.length
    ? Math.round(
        activeClients.reduce((sum, client) => sum + client.lifetimeValue, 0) / activeClients.length,
      )
    : 0;
  const removingHasHistory = removing
    ? appointments.some((appointment) => appointment.clientId === removing.id)
    : false;

  const removeClient = async () => {
    if (!removing) return;
    setDeleting(true);
    try {
      if (removingHasHistory) {
        await persistRecord(
          "clients",
          { ...removing, archivedAt: new Date().toISOString() },
          removing.locationId,
        );
        toast.success("Client archived");
      } else {
        await removeRecord("clients", removing.id);
        toast.success("Client removed");
      }
      if (open?.id === removing.id) setOpen(null);
      setRemoving(null);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not remove the client.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Clients"
        description={`${activeClients.length} clients · average lifetime value ${currency(averageLifetimeValue)}`}
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
                  <TableHead>Consent</TableHead>
                  {can("clients.delete") ? (
                    <TableHead className="text-right">
                      <span className="sr-only">Remove</span>
                    </TableHead>
                  ) : null}
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
                    {can("clients.delete") ? (
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            setRemoving(c);
                          }}
                        >
                          <Trash2 className="mr-1.5 h-4 w-4" />
                          Remove
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <ClientProfile client={open} onClose={() => setOpen(null)} onUpdate={setOpen} />

      <AlertDialog open={!!removing} onOpenChange={(isOpen) => !isOpen && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {removingHasHistory ? `Archive ${removing?.name}?` : `Remove ${removing?.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {removingHasHistory
                ? "This client has appointment history. The profile will be archived and hidden from the client list while historical appointments remain intact."
                : "This permanently removes the client profile. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void removeClient();
              }}
            >
              {deleting ? "Removing…" : removingHasHistory ? "Archive client" : "Remove client"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ClientProfile({
  client,
  onClose,
  onUpdate,
}: {
  client: Client | null;
  onClose: () => void;
  onUpdate: (client: Client) => void;
}) {
  const { role, can, setQuickAction } = useWorkspace();
  const { persistRecord } = useCrmData();
  const history = appointments.filter((a) => a.clientId === client?.id);
  const convo = conversations.find((c) => c.subjectId === client?.id);
  const canEdit = can("clients.edit");
  const canEditInternalNotes = can("clients.internalNotes");
  const canEditRestrictedNotes = can("clients.restrictedNotes");

  const saveClient = async () => {
    if (!client || !canEdit) return;
    if (!client.name.trim() || (!client.phone.trim() && !client.email.trim())) {
      toast.error("Add a client name and either a phone number or email.");
      return;
    }
    try {
      await persistRecord(
        "clients",
        {
          ...client,
          name: client.name.trim(),
          phone: client.phone.trim(),
          email: client.email.trim(),
        },
        client.locationId,
      );
      toast.success("Client updated");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not update the client.");
    }
  };

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
                {canEdit ? <Button onClick={() => void saveClient()}>Save changes</Button> : null}
              </div>

              <Tabs defaultValue="overview">
                <TabsList className="flex-wrap">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="history">Appointments</TabsTrigger>
                  <TabsTrigger value="comms">Communication</TabsTrigger>
                  <TabsTrigger value="editable-notes">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="pt-4">
                  <ClientOverviewEditor
                    client={client}
                    canEdit={canEdit}
                    role={role}
                    onChange={onUpdate}
                    onSave={() => void saveClient()}
                  />
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

                <TabsContent value="editable-notes" className="space-y-3 pt-4">
                  <div className="rounded-lg border border-border p-3">
                    <SectionTitle>Internal note · Owner and front desk</SectionTitle>
                    {canEditInternalNotes ? (
                      <Textarea
                        className="mt-2"
                        aria-label="Internal client note"
                        rows={4}
                        placeholder="Add scheduling, service, or customer-care context…"
                        value={client.internalNote}
                        onChange={(event) =>
                          onUpdate({ ...client, internalNote: event.target.value })
                        }
                      />
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Your {role.replace("_", " ")} role cannot view or edit internal notes.
                      </p>
                    )}
                  </div>
                  {canEditRestrictedNotes ? (
                    <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-3 dark:border-amber-900 dark:bg-amber-950/20">
                      <SectionTitle>Restricted treatment / intake note · Owner only</SectionTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        You can access this field because you are signed in as the workspace owner.
                      </p>
                      <Textarea
                        className="mt-2 bg-background"
                        aria-label="Restricted treatment or intake note"
                        rows={4}
                        placeholder="No restricted note has been added yet."
                        value={client.restrictedNote}
                        onChange={(event) =>
                          onUpdate({ ...client, restrictedNote: event.target.value })
                        }
                      />
                    </div>
                  ) : (
                    <RestrictedNotice>
                      Restricted treatment and intake notes are owner-only. You are signed in with
                      the {role.replace("_", " ")} role.
                    </RestrictedNotice>
                  )}
                  {canEditInternalNotes || canEditRestrictedNotes ? (
                    <Button className="w-full" onClick={() => void saveClient()}>
                      Save notes
                    </Button>
                  ) : null}
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function ClientOverviewEditor({
  client,
  canEdit,
  role,
  onChange,
  onSave,
}: {
  client: Client;
  canEdit: boolean;
  role: string;
  onChange: (client: Client) => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <ProfileField label="Full name">
          <Input
            value={client.name}
            disabled={!canEdit}
            onChange={(event) => onChange({ ...client, name: event.target.value })}
          />
        </ProfileField>
        <ProfileField label="Phone">
          <Input
            type="tel"
            value={client.phone}
            disabled={!canEdit}
            onChange={(event) => onChange({ ...client, phone: event.target.value })}
          />
        </ProfileField>
        <ProfileField label="Email">
          <Input
            type="email"
            value={client.email}
            disabled={!canEdit}
            onChange={(event) => onChange({ ...client, email: event.target.value })}
          />
        </ProfileField>
        <ProfileField label="Birthday">
          <Input
            type="date"
            value={client.birthday ?? ""}
            disabled={!canEdit}
            onChange={(event) => onChange({ ...client, birthday: event.target.value || undefined })}
          />
        </ProfileField>
        <ProfileField label="Preferred service">
          <Select
            value={client.preferredService}
            disabled={!canEdit}
            onValueChange={(preferredService) => onChange({ ...client, preferredService })}
          >
            <SelectTrigger>
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
        </ProfileField>
        <ProfileField label="Preferred therapist">
          <Select
            value={client.preferredTherapistId ?? "none"}
            disabled={!canEdit}
            onValueChange={(preferredTherapistId) =>
              onChange({
                ...client,
                preferredTherapistId:
                  preferredTherapistId === "none" ? undefined : preferredTherapistId,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No preference</SelectItem>
              {therapists
                .filter((therapist) => therapist.active)
                .map((therapist) => (
                  <SelectItem key={therapist.id} value={therapist.id}>
                    {therapist.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </ProfileField>
        <ProfileField label="Location">
          <Select
            value={client.locationId}
            disabled={!canEdit}
            onValueChange={(locationId) => onChange({ ...client, locationId })}
          >
            <SelectTrigger>
              <SelectValue placeholder="No location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ProfileField>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
          <div>
            <Label htmlFor="client-intake">Intake complete</Label>
            <p className="text-xs text-muted-foreground">Intake and consent forms received</p>
          </div>
          <Switch
            id="client-intake"
            checked={client.intakeComplete}
            disabled={!canEdit}
            onCheckedChange={(intakeComplete) => onChange({ ...client, intakeComplete })}
          />
        </div>
      </div>

      <ProfileField label="Tags">
        {canEdit ? (
          <MultiSelectDropdown
            label="Client tags"
            value={client.tags}
            options={availableClientTags().map((tag) => ({ id: tag, label: tag }))}
            placeholder="Add tags"
            onChange={(tags) => onChange({ ...client, tags })}
          />
        ) : (
          <p className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
            {client.tags.join(" · ") || "No tags"}
          </p>
        )}
      </ProfileField>

      <div className="grid gap-4 sm:grid-cols-2">
        <ProfileField label="SMS consent">
          <Select
            value={client.consent.sms}
            disabled={!canEdit}
            onValueChange={(sms) =>
              onChange({
                ...client,
                consent: {
                  ...client.consent,
                  sms: sms as Client["consent"]["sms"],
                  updatedAt: new Date().toISOString(),
                },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="granted">Granted</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
            </SelectContent>
          </Select>
        </ProfileField>
        <ProfileField label="Email consent">
          <Select
            value={client.consent.email}
            disabled={!canEdit}
            onValueChange={(email) =>
              onChange({
                ...client,
                consent: {
                  ...client.consent,
                  email: email as Client["consent"]["email"],
                  updatedAt: new Date().toISOString(),
                },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="granted">Granted</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
            </SelectContent>
          </Select>
        </ProfileField>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
        <div>
          <Label htmlFor="client-marketing">Marketing eligible</Label>
          <p className="text-xs text-muted-foreground">Allow campaigns and lifecycle automations</p>
        </div>
        <Switch
          id="client-marketing"
          checked={client.consent.marketing}
          disabled={!canEdit}
          onCheckedChange={(marketing) =>
            onChange({
              ...client,
              consent: {
                ...client.consent,
                marketing,
                updatedAt: new Date().toISOString(),
              },
            })
          }
        />
      </div>

      {canEdit ? (
        <Button className="w-full" onClick={onSave}>
          Save client changes
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Your {role.replace("_", " ")} role has view-only access to client profiles.
        </p>
      )}
    </div>
  );
}

function ProfileField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
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
