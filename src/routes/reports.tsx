import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page";
import { StatusChip } from "@/components/shared/chips";
import {
  automations,
  bookingsBySource,
  conversionFunnel,
  retentionCohorts,
  revenueTrend,
  services,
  therapists,
} from "@/lib/mock/data";
import { currency } from "@/lib/format";

const percent = (n: number) => `${Math.round(n <= 1 ? n * 100 : n)}%`;
const serviceMix = services.map((s, i) => ({ name: s.name, value: [42, 31, 15, 12][i] ?? 8 }));

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — M&M Spa CRM" },
      {
        name: "description",
        content:
          "Revenue trends, bookings by source and service, conversion funnel, retention, and automation performance for M&M Massage Spa.",
      },
      { property: "og:title", content: "Reports — M&M Spa CRM" },
      { property: "og:description", content: "Operational analytics with realistic sample data." },
    ],
  }),
  component: ReportsPage,
});

const PIE = ["var(--sage)", "var(--eucalyptus)", "var(--gold)", "var(--muted-foreground)"];

function ReportsPage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader title="Reports" description="Trailing 6 months · sample data for this practice workspace" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="surface-soft">
          <CardHeader>
            <CardTitle className="font-display text-lg">Revenue trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip formatter={(v: number) => currency(v)} />
                <Line type="monotone" dataKey="revenue" stroke="var(--eucalyptus)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="surface-soft">
          <CardHeader>
            <CardTitle className="font-display text-lg">Bookings by source</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bookingsBySource}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="source" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip />
                <Bar dataKey="bookings" fill="var(--sage)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="surface-soft">
          <CardHeader>
            <CardTitle className="font-display text-lg">Service mix</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={serviceMix} dataKey="value" nameKey="name" outerRadius={90} label>
                  {serviceMix.map((_entry: { name: string; value: number }, i: number) => (
                    <Cell key={i} fill={PIE[i % PIE.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="surface-soft">
          <CardHeader>
            <CardTitle className="font-display text-lg">Conversion funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {conversionFunnel.map((f) => (
              <div key={f.stage} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{f.stage}</span>
                  <span className="font-display">{f.value}</span>
                </div>
                <span className="block h-2 rounded-full bg-secondary">
                  <span
                    className="block h-2 rounded-full bg-eucalyptus"
                    style={{ width: `${(f.value / conversionFunnel[0]!.value) * 100}%` }}
                  />
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="surface-soft">
          <CardHeader>
            <CardTitle className="font-display text-lg">Therapist performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {therapists.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
              >
                <span className="min-w-0 truncate font-medium">{t.name}</span>
                <span className="flex flex-wrap gap-1.5">
                  <StatusChip>{t.weeklyAppointments} appts</StatusChip>
                  <StatusChip tone="info">Util {percent(t.utilization)}</StatusChip>
                  <StatusChip tone="positive">Rebook {percent(t.rebookingRate)}</StatusChip>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="surface-soft">
          <CardHeader>
            <CardTitle className="font-display text-lg">Retention cohorts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {retentionCohorts.map((c) => (
              <div key={c.cohort} className="flex items-center justify-between gap-2 text-sm">
                <span>{c.cohort}</span>
                <span className="flex gap-1.5">
                  <StatusChip>M1 {percent(c.m1)}</StatusChip>
                  <StatusChip>M3 {percent(c.m3)}</StatusChip>
                  <StatusChip>M2 {percent(c.m2)}</StatusChip>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="surface-soft lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-lg">Automation performance</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            {automations.slice(0, 8).map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
              >
                <span className="min-w-0 truncate">{a.name}</span>
                <StatusChip tone={a.failureCount > 2 ? "warning" : "positive"}>
                  {a.successMetric.value}
                </StatusChip>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}