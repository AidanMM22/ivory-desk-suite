import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PageHeader, SectionTitle } from "@/components/shared/page";
import { StatusChip } from "@/components/shared/chips";
import { automations as seed } from "@/lib/mock/data";
import { dateTime } from "@/lib/format";
import type { Automation } from "@/lib/mock/types";

export const Route = createFileRoute("/automations")({
  head: () => ({
    meta: [
      { title: "Automations — M&M Spa CRM" },
      {
        name: "description",
        content:
          "Automation library for M&M Massage Spa: speed-to-lead, reminders, review requests, no-show recovery, and reactivation workflows.",
      },
      { property: "og:title", content: "Automations — M&M Spa CRM" },
      { property: "og:description", content: "Workflow library with triggers, waits, and run history." },
    ],
  }),
  component: AutomationsPage,
});

const stepTone = {
  trigger: "info",
  wait: "neutral",
  condition: "gold",
  message: "positive",
  task: "warning",
  exit: "neutral",
} as const;

function AutomationsPage() {
  const [rows, setRows] = useState<Automation[]>(seed);
  const [detail, setDetail] = useState<Automation | null>(null);
  const [builder, setBuilder] = useState(false);

  const toggle = (a: Automation) => {
    const status = a.status === "active" ? "paused" : "active";
    setRows((prev) => prev.map((r) => (r.id === a.id ? { ...r, status } : r)));
    setDetail((cur) => (cur && cur.id === a.id ? { ...cur, status } : cur));
    toast.success(`${a.name} ${status === "active" ? "activated" : "paused"} (mock)`);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Automations"
        description={`${rows.filter((r) => r.status === "active").length} active workflows · execution is not connected yet`}
        actions={
          <Button onClick={() => setBuilder(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create automation
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((a) => (
          <Card key={a.id} className="surface-soft flex flex-col">
            <CardHeader className="gap-2">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="font-display text-base leading-snug">{a.name}</CardTitle>
                <Switch
                  checked={a.status === "active"}
                  onCheckedChange={() => toggle(a)}
                  aria-label={`Toggle ${a.name}`}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <StatusChip
                  tone={a.status === "active" ? "positive" : a.status === "paused" ? "warning" : "neutral"}
                >
                  {a.status}
                </StatusChip>
                <StatusChip>{a.category}</StatusChip>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-3">
              <p className="text-sm text-muted-foreground">{a.description}</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Audience {a.audienceSize} · {a.steps.length} steps</p>
                <p>
                  {a.successMetric.label} {a.successMetric.value} · {a.failureCount} failures
                </p>
                <p>Last run {dateTime(a.lastRunAt)}</p>
              </div>
              <Button variant="outline" onClick={() => setDetail(a)}>
                View workflow
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {detail ? (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-2xl">{detail.name}</SheetTitle>
                <SheetDescription>{detail.description}</SheetDescription>
              </SheetHeader>
              <div className="space-y-6 px-4 pb-10">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Meta label="Trigger" value={detail.trigger} />
                  <Meta label="Exit criteria" value={detail.exitCriteria} />
                  <Meta label="Audience size" value={String(detail.audienceSize)} />
                  <Meta label="Last run" value={dateTime(detail.lastRunAt)} />
                  <Meta
                    label={detail.successMetric.label}
                    value={detail.successMetric.value}
                  />
                  <Meta label="Failures" value={String(detail.failureCount)} />
                </div>

                <div>
                  <SectionTitle>Workflow</SectionTitle>
                  <ol className="mt-3 space-y-2 border-l border-border pl-4">
                    {detail.steps.map((s, i) => (
                      <li key={`${s.label}-${i}`} className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{s.label}</p>
                          <StatusChip tone={stepTone[s.kind]}>{s.kind}</StatusChip>
                        </div>
                        {s.detail ? (
                          <p className="mt-1 text-xs text-muted-foreground">{s.detail}</p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <SectionTitle>Run history</SectionTitle>
                  <ul className="mt-3 space-y-2">
                    {detail.runHistory.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
                      >
                        <span className="min-w-0 truncate">{r.subject}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="text-xs text-muted-foreground">{dateTime(r.at)}</span>
                          <StatusChip
                            tone={
                              r.outcome === "success"
                                ? "positive"
                                : r.outcome === "failed"
                                  ? "critical"
                                  : "neutral"
                            }
                          >
                            {r.outcome}
                          </StatusChip>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => toggle(detail)}>
                    {detail.status === "active" ? "Pause" : "Activate"}
                  </Button>
                  <Button variant="outline" onClick={() => setBuilder(true)}>
                    Edit workflow
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={builder} onOpenChange={setBuilder}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">Automation builder</SheetTitle>
            <SheetDescription>
              Frontend-only builder — nothing runs until the backend is connected.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-10">
            <div className="space-y-1.5">
              <Label htmlFor="au-name">Name</Label>
              <Input id="au-name" placeholder="Post-visit thank-you" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="au-trigger">Trigger</Label>
              <Input id="au-trigger" placeholder="Appointment marked completed" />
            </div>
            <div className="space-y-2">
              <SectionTitle>Steps</SectionTitle>
              {["Wait 2 hours", "Send SMS", "Exit on reply"].map((s, i) => (
                <div
                  key={s}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-secondary text-xs">
                    {i + 1}
                  </span>
                  {s}
                </div>
              ))}
              <Button variant="outline" className="w-full" onClick={() => toast("Step added (mock)")}>
                <Workflow className="mr-2 h-4 w-4" /> Add step
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="au-message">Message body</Label>
              <Textarea id="au-message" rows={3} placeholder="Thanks for visiting M&M Massage Spa…" />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                toast.success("Automation saved as draft");
                setBuilder(false);
              }}
            >
              Save draft
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <SectionTitle>{label}</SectionTitle>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}