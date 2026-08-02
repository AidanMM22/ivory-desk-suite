import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, SectionTitle, EmptyState } from "@/components/shared/page";
import { StatusChip } from "@/components/shared/chips";
import { auditLog, BUSINESS, locations, messageTemplates, services, team } from "@/lib/data";
import { currency, dateTime, leadStages, roleLabel } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — M&M Spa CRM" },
      {
        name: "description",
        content:
          "Configure business profile, services and pricing, rooms, team roles, templates, consent, and integrations for M&M Massage Spa.",
      },
      { property: "og:title", content: "Settings — M&M Spa CRM" },
      {
        property: "og:description",
        content: "Business profile, services, team, templates, and integrations.",
      },
    ],
  }),
  component: SettingsPage,
});

const integrations = [
  {
    name: "Supabase",
    detail: "Database and authentication",
    status: isSupabaseConfigured ? "Connected" : "Needs environment variables",
  },
  { name: "GitHub", detail: "Source control sync", status: "Connected" },
  { name: "Twilio", detail: "SMS + missed-call text back", status: "Placeholder" },
  { name: "Email provider", detail: "Transactional + campaign email", status: "Placeholder" },
  { name: "Google Business Profile", detail: "Reviews and profile leads", status: "Placeholder" },
  { name: "Stripe", detail: "Deposits, packages, gift cards", status: "Placeholder" },
  {
    name: `${BUSINESS.website} booking`,
    detail: "Existing website booking source",
    status: "Placeholder",
  },
];

function SettingsPage() {
  const { can, role } = useWorkspace();

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <PageHeader title="Settings" description={`Workspace access · ${roleLabel[role]}`} />

      <Tabs defaultValue="business">
        <TabsList className="flex-wrap">
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline &amp; tags</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="pt-4">
          {can("settings.business") ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="surface-soft">
                <CardHeader>
                  <CardTitle className="font-display text-lg">Business profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="biz-name">Business name</Label>
                    <Input id="biz-name" defaultValue={BUSINESS.name} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="biz-phone">Phone</Label>
                    <Input id="biz-phone" defaultValue={BUSINESS.phone} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="biz-city">City</Label>
                    <Input id="biz-city" defaultValue={BUSINESS.city} />
                  </div>
                  <Button onClick={() => toast.success("Business profile saved")}>Save</Button>
                </CardContent>
              </Card>
              <Card className="surface-soft">
                <CardHeader>
                  <CardTitle className="font-display text-lg">Locations &amp; rooms</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {locations.map((l) => (
                    <div key={l.id} className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium">{l.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.address} · {l.phone}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {l.rooms.map((r) => `${r.name} · ${r.type}`).join("  /  ")}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="surface-soft lg:col-span-2">
                <CardHeader>
                  <CardTitle className="font-display text-lg">
                    Communication preferences &amp; notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {[
                    "Require SMS consent before marketing",
                    "Honor STOP replies automatically",
                    "Email me a daily schedule digest",
                    "Notify on new leads",
                    "Notify on no-shows",
                    "Quiet hours 9:00p–8:00a",
                  ].map((p, i) => (
                    <label
                      key={p}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
                    >
                      {p}
                      <Switch defaultChecked={i !== 5} aria-label={p} />
                    </label>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : (
            <EmptyState
              icon={<Lock className="h-6 w-6" />}
              title="Restricted for the Therapist role"
              description="Business profile, locations, and communication settings are limited to Owner accounts."
            />
          )}
        </TabsContent>

        <TabsContent value="services" className="pt-4">
          <Card className="surface-soft overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Durations</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.description}</p>
                      </TableCell>
                      <TableCell className="text-sm">{s.durations.join(" / ")} min</TableCell>
                      <TableCell className="text-right">{currency(s.price)}</TableCell>
                      <TableCell>
                        {s.active ? (
                          <span className="text-xs text-muted-foreground">Active</span>
                        ) : (
                          <StatusChip>Hidden</StatusChip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="pt-4">
          {can("settings.team") ? (
            <Card className="surface-soft">
              <CardContent className="space-y-3 p-4">
                {team.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{roleLabel[m.role]}</span>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => toast.info("Team invitations require the invitation workflow.")}
                >
                  Invite teammate
                </Button>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={<Lock className="h-6 w-6" />}
              title="Team &amp; roles are Owner-only"
              description="An Owner account is required to manage team access."
            />
          )}
        </TabsContent>

        <TabsContent value="pipeline" className="grid gap-4 pt-4 lg:grid-cols-2">
          <Card className="surface-soft">
            <CardHeader>
              <CardTitle className="font-display text-lg">Pipeline stages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {leadStages.map((s, i) => (
                <div
                  key={s.key}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-secondary text-xs">
                    {i + 1}
                  </span>
                  {s.label}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="surface-soft">
            <CardHeader>
              <CardTitle className="font-display text-lg">Tags &amp; custom fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {[
                  "VIP",
                  "Monthly member",
                  "Couples",
                  "Athlete",
                  "Gift card buyer",
                  "Lapsed 90d",
                ].map((t) => (
                  <StatusChip key={t}>{t}</StatusChip>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-tag">Add tag</Label>
                <Input id="new-tag" placeholder="Prenatal" />
              </div>
              <Button variant="outline" onClick={() => toast.success("Tag added")}>
                Add tag
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="pt-4">
          <Card className="surface-soft">
            <CardContent className="space-y-3 p-4">
              {messageTemplates.map((t) => (
                <div key={t.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{t.name}</p>
                    <span className="text-[11px] font-medium tracking-wide text-muted-foreground">
                      {t.channel.toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="pt-4">
          <div className="grid gap-3 md:grid-cols-2">
            {integrations.map((i) => (
              <Card key={i.name} className="surface-soft">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.detail}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusChip tone="warning">{i.status}</StatusChip>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toast("Connect this integration in a later phase")}
                    >
                      Connect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="audit" className="pt-4">
          <Card className="surface-soft">
            <CardContent className="p-4">
              <SectionTitle>Recent changes</SectionTitle>
              <ul className="mt-3 space-y-2">
                {auditLog.map((a) => (
                  <li key={a.id} className="rounded-lg border border-border p-3 text-sm">
                    <p>{a.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.actor} · {dateTime(a.at)}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
