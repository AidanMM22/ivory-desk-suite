import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader, SectionTitle } from "@/components/shared/page";
import { StatusChip } from "@/components/shared/chips";
import { campaigns } from "@/lib/mock/data";
import { dateTime } from "@/lib/format";

export const Route = createFileRoute("/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns — M&M Spa CRM" },
      {
        name: "description",
        content:
          "Plan, schedule, and measure SMS and email campaigns for M&M Massage Spa clients in Tacoma, WA.",
      },
      { property: "og:title", content: "Campaigns — M&M Spa CRM" },
      { property: "og:description", content: "Audience segments, drafts, schedules, and performance." },
    ],
  }),
  component: CampaignsPage,
});

function CampaignsPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto max-w-[1300px] space-y-6">
      <PageHeader
        title="Campaigns"
        description="Broadcast SMS and email to consented audiences — sending is simulated"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create campaign
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {campaigns.map((c) => (
          <Card key={c.id} className="surface-soft">
            <CardHeader className="gap-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="font-display text-base">{c.name}</CardTitle>
                <StatusChip
                  tone={c.status === "sent" ? "positive" : c.status === "scheduled" ? "info" : "neutral"}
                >
                  {c.status}
                </StatusChip>
              </div>
              <p className="text-xs text-muted-foreground">
                {c.channel.toUpperCase()} · {c.segment} · {c.audienceSize} recipients ·{" "}
                {c.sendAt ? dateTime(c.sendAt) : "no send date"}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-border bg-card p-3 text-sm">{c.preview}</div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <Metric label="Delivered" value={c.metrics.delivered} />
                <Metric label="Opens" value={c.metrics.opened} />
                <Metric label="Clicks" value={c.metrics.clicked} />
                <Metric label="Booked" value={c.metrics.booked} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => toast("Preview opened (mock)")}>
                  Preview
                </Button>
                <Button size="sm" onClick={() => toast.success("Campaign duplicated")}>
                  Duplicate
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Create campaign</DialogTitle>
            <DialogDescription>Draft only — nothing is sent in this workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cp-name">Campaign name</Label>
              <Input id="cp-name" placeholder="March hot stone offer" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-segment">Audience segment</Label>
              <Input id="cp-segment" placeholder="Lapsed 90 days · SMS consented" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-body">Message</Label>
              <Textarea id="cp-body" rows={3} placeholder="Hi {{first_name}}, we saved you a spot…" />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                toast.success("Campaign saved as draft");
                setOpen(false);
              }}
            >
              Save draft
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="surface-soft">
        <CardContent className="p-4">
          <SectionTitle>Audience segments</SectionTitle>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              "All consented clients",
              "Lapsed 60 days",
              "Lapsed 90 days",
              "Deep tissue regulars",
              "Couples massage buyers",
              "Gift card recipients",
            ].map((s) => (
              <StatusChip key={s}>{s}</StatusChip>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-2 text-center">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-display text-base text-foreground">{value}</p>
    </div>
  );
}