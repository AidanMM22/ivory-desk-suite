import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarPlus,
  KanbanSquare,
  LayoutList,
  MessageSquare,
  Plus,
  Search,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { PageHeader, EmptyState, SectionTitle } from "@/components/shared/page";
import { ConsentChip, StatusChip } from "@/components/shared/chips";
import { activity, leads as seedLeads, serviceByKey, team, TODAY } from "@/lib/data";
import { currency, dateTime, leadStages, stageLabel, stageTone } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { useCrmData } from "@/lib/crm-data";
import type { Lead, LeadStage } from "@/lib/types";

export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { title: "Leads — M&M Spa CRM" },
      {
        name: "description",
        content:
          "Lead pipeline for M&M Massage Spa: Swedish, deep tissue, couples, and hot stone inquiries from web, Google, and referrals.",
      },
      { property: "og:title", content: "Leads — M&M Spa CRM" },
      { property: "og:description", content: "Kanban and table views of the spa lead pipeline." },
    ],
  }),
  component: LeadsPage,
});

const ownerName = (id: string) => team.find((t) => t.id === id)?.name ?? "Unassigned";

function LeadsPage() {
  const { setQuickAction } = useWorkspace();
  const { persistRecord } = useCrmData();
  const [view, setView] = useState("kanban");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sort, setSort] = useState("recent");
  const [selected, setSelected] = useState<string[]>([]);
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  const [leads, setLeads] = useState<Lead[]>(seedLeads);

  const sources = useMemo(() => Array.from(new Set(seedLeads.map((l) => l.source))), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = leads.filter((l) => {
      const matchQ =
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.phone.includes(q);
      const matchStage = stageFilter === "all" || l.stage === stageFilter;
      const matchSource = sourceFilter === "all" || l.source === sourceFilter;
      return matchQ && matchStage && matchSource;
    });
    return rows.sort((a, b) => {
      if (sort === "value") return b.value - a.value;
      if (sort === "name") return a.name.localeCompare(b.name);
      return b.lastContactAt.localeCompare(a.lastContactAt);
    });
  }, [leads, query, stageFilter, sourceFilter, sort]);

  const moveStage = (lead: Lead, stage: LeadStage) => {
    const updated = { ...lead, stage };
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)));
    setOpenLead((cur) => (cur && cur.id === lead.id ? updated : cur));
    void persistRecord("leads", updated, updated.locationId).catch((error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not save the lead."),
    );
    toast.success(`${lead.name} moved to ${stageLabel(stage)}`);
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Leads"
        description={`${filtered.length} of ${leads.length} inquiries · Tacoma, WA`}
        actions={
          <>
            <Tabs value={view} onValueChange={setView}>
              <TabsList>
                <TabsTrigger value="kanban" className="gap-1.5">
                  <KanbanSquare className="h-3.5 w-3.5" /> Kanban
                </TabsTrigger>
                <TabsTrigger value="table" className="gap-1.5">
                  <LayoutList className="h-3.5 w-3.5" /> Table
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={() => setQuickAction("lead")}>
              <UserPlus className="mr-2 h-4 w-4" /> Add lead
            </Button>
          </>
        }
      />

      <Card className="surface-soft">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search leads"
              placeholder="Search name, email, phone"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[170px]" aria-label="Filter by stage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {leadStages.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[200px]" aria-label="Filter by source">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[170px]" aria-label="Sort leads">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most recent contact</SelectItem>
              <SelectItem value="value">Highest value</SelectItem>
              <SelectItem value="name">Name A–Z</SelectItem>
            </SelectContent>
          </Select>
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} leads</span>
        </CardContent>
      </Card>

      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/25 bg-secondary px-4 py-3">
          <p className="text-sm font-medium">{selected.length} selected</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.info("Connect an SMS provider to send bulk messages.")}
          >
            Send SMS
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.info("Choose an active workspace member to reassign these leads.")}
          >
            Assign owner
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
            Clear
          </Button>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="h-6 w-6" />}
          title="No leads match these filters"
          description="Try clearing the stage or source filter, or add a new inquiry."
          action={
            <Button onClick={() => setQuickAction("lead")}>
              <Plus className="mr-2 h-4 w-4" /> Add lead
            </Button>
          }
        />
      ) : view === "kanban" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {leadStages.map((stage) => {
            const rows = filtered.filter((l) => l.stage === stage.key);
            return (
              <section key={stage.key} className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <SectionTitle>{stage.label}</SectionTitle>
                  <span className="text-xs text-muted-foreground">{rows.length}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {rows.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                      Nothing here yet
                    </p>
                  ) : (
                    rows.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setOpenLead(l)}
                        className="w-full rounded-lg border border-border bg-card p-3 text-left transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-semibold">{l.name}</p>
                          <span className="shrink-0 text-xs font-medium">{currency(l.value)}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {serviceByKey(l.serviceInterest).name}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {l.source} · Last contact {dateTime(l.lastContactAt)}
                        </p>
                        {l.consent.sms !== "granted" ? (
                          <ConsentChip channel="SMS" state={l.consent.sms} />
                        ) : null}
                        {l.nextFollowUpAt ? (
                          <p className="text-xs text-muted-foreground">
                            Follow-up {dateTime(l.nextFollowUpAt)}
                          </p>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <Card className="surface-soft overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Select all leads"
                      checked={selected.length === filtered.length && filtered.length > 0}
                      onCheckedChange={(v) => setSelected(v ? filtered.map((l) => l.id) : [])}
                    />
                  </TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Last contact</TableHead>
                  <TableHead>Next follow-up</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Consent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow key={l.id} className="cursor-pointer" onClick={() => setOpenLead(l)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        aria-label={`Select ${l.name}`}
                        checked={selected.includes(l.id)}
                        onCheckedChange={() => toggleSelect(l.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{l.phone}</p>
                    </TableCell>
                    <TableCell>
                      <StatusChip tone={stageTone[l.stage]}>{stageLabel(l.stage)}</StatusChip>
                    </TableCell>
                    <TableCell className="text-sm">{l.source}</TableCell>
                    <TableCell className="text-sm">
                      {serviceByKey(l.serviceInterest).name}
                    </TableCell>
                    <TableCell className="text-sm">{ownerName(l.ownerId)}</TableCell>
                    <TableCell className="text-sm">{dateTime(l.lastContactAt)}</TableCell>
                    <TableCell className="text-sm">
                      {l.nextFollowUpAt ? dateTime(l.nextFollowUpAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">{currency(l.value)}</TableCell>
                    <TableCell>
                      <span
                        className={
                          l.consent.sms === "granted"
                            ? "text-xs text-muted-foreground"
                            : "text-xs font-medium text-destructive"
                        }
                      >
                        {l.consent.sms === "granted" ? "Allowed" : l.consent.sms}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <LeadDrawer
        lead={openLead}
        onClose={() => setOpenLead(null)}
        onStage={moveStage}
        onBook={() => setQuickAction("appointment")}
      />
    </div>
  );
}

function LeadDrawer({
  lead,
  onClose,
  onStage,
  onBook,
}: {
  lead: Lead | null;
  onClose: () => void;
  onStage: (lead: Lead, stage: LeadStage) => void;
  onBook: () => void;
}) {
  const [note, setNote] = useState("");
  const timeline = activity.filter((e) => !e.subjectId || e.subjectId === lead?.id).slice(0, 5);

  return (
    <Sheet open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {lead ? (
          <>
            <SheetHeader>
              <SheetTitle className="font-display text-2xl">{lead.name}</SheetTitle>
              <SheetDescription>
                {lead.phone} · {lead.email}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-4 pb-8">
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip tone={stageTone[lead.stage]}>{stageLabel(lead.stage)}</StatusChip>
                <span className="text-sm text-muted-foreground">
                  {lead.source} · {currency(lead.value)} potential
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="stage-select">Stage</Label>
                  <Select value={lead.stage} onValueChange={(v) => onStage(lead, v as LeadStage)}>
                    <SelectTrigger id="stage-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {leadStages.map((s) => (
                        <SelectItem key={s.key} value={s.key}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Service interest</Label>
                  <p className="rounded-md border border-border px-3 py-2 text-sm">
                    {serviceByKey(lead.serviceInterest).name}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={onBook}>
                  <CalendarPlus className="mr-2 h-4 w-4" /> Book appointment
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toast.info("Connect a messaging provider before sending.")}
                >
                  <MessageSquare className="mr-2 h-4 w-4" /> Send message
                </Button>
                <Button variant="outline" onClick={() => toast.success("Task created")}>
                  Create task
                </Button>
              </div>

              <div className="space-y-2">
                <SectionTitle>Notes</SectionTitle>
                <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                  {lead.notes}
                </p>
                <Textarea
                  aria-label="Add note"
                  rows={3}
                  placeholder="Add a note about this inquiry…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button
                  size="sm"
                  disabled={!note.trim()}
                  onClick={() => {
                    toast.success("Note saved");
                    setNote("");
                  }}
                >
                  Save note
                </Button>
              </div>

              <div className="space-y-3">
                <SectionTitle>Activity timeline</SectionTitle>
                <ol className="space-y-4 border-l border-border pl-4">
                  <li>
                    <p className="text-sm font-medium">Lead created</p>
                    <p className="text-xs text-muted-foreground">
                      {dateTime(lead.createdAt)} · {lead.source}
                    </p>
                  </li>
                  {timeline.map((e) => (
                    <li key={e.id}>
                      <p className="text-sm font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{e.detail}</p>
                      <p className="text-xs text-muted-foreground/80">
                        {dateTime(e.at)} · {e.actor}
                      </p>
                    </li>
                  ))}
                  <li>
                    <p className="text-sm font-medium">Next follow-up</p>
                    <p className="text-xs text-muted-foreground">
                      {lead.nextFollowUpAt
                        ? dateTime(lead.nextFollowUpAt)
                        : `Not scheduled (today is ${TODAY})`}
                    </p>
                  </li>
                </ol>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
