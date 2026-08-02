import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PageHeader, SectionTitle } from "@/components/shared/page";
import { StatusChip } from "@/components/shared/chips";
import { appointments, therapists } from "@/lib/mock/data";
import { clockTime, dateTime, initialsOf, percent } from "@/lib/format";
import type { Therapist } from "@/lib/mock/types";

export const Route = createFileRoute("/therapists")({
  head: () => ({
    meta: [
      { title: "Therapists — M&M Spa CRM" },
      {
        name: "description",
        content:
          "Massage therapist roster for M&M Massage Spa: availability, specialties, utilization, rebooking, and review ratings.",
      },
      { property: "og:title", content: "Therapists — M&M Spa CRM" },
      { property: "og:description", content: "Staff availability and performance at a glance." },
    ],
  }),
  component: TherapistsPage,
});

function TherapistsPage() {
  const [detail, setDetail] = useState<Therapist | null>(null);

  return (
    <div className="mx-auto max-w-[1300px] space-y-6">
      <PageHeader
        title="Therapists"
        description={`${therapists.length} licensed therapists · Tacoma, WA`}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {therapists.map((t) => (
          <Card key={t.id} className="surface-soft">
            <CardHeader className="gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold">
                  {initialsOf(t.name)}
                </span>
                <div className="min-w-0">
                  <CardTitle className="font-display truncate text-base">{t.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{t.title}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {t.specialties.map((s) => (
                  <StatusChip key={s}>{s}</StatusChip>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <Stat label="Utilization" value={percent(t.utilization)} />
                <Stat label="Rebooking" value={percent(t.rebookingRate)} />
                <Stat label="Rating" value={t.reviewRating.toFixed(1)} />
              </div>
              <p className="text-xs text-muted-foreground">
                {t.weeklyAppointments} appointments this week · {t.availabilityNote}
              </p>
              <Button variant="outline" className="w-full" onClick={() => setDetail(t)}>
                View profile
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {detail ? (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-2xl">{detail.name}</SheetTitle>
                <SheetDescription>
                  {detail.title} · {detail.availabilityNote}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-10">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <Stat label="Utilization" value={percent(detail.utilization)} />
                  <Stat label="Rebooking" value={percent(detail.rebookingRate)} />
                  <Stat label="Rating" value={detail.reviewRating.toFixed(1)} />
                </div>
                <div>
                  <SectionTitle>Upcoming schedule</SectionTitle>
                  <ul className="mt-2 space-y-2">
                    {appointments
                      .filter((a) => a.therapistId === detail.id)
                      .slice(0, 6)
                      .map((a) => (
                        <li key={a.id} className="rounded-lg border border-border p-3 text-sm">
                          <p className="font-medium">{a.clientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {dateTime(a.start)} · {clockTime(a.start)} · {a.duration} min
                          </p>
                        </li>
                      ))}
                  </ul>
                </div>
                <div>
                  <SectionTitle>Weekly availability</SectionTitle>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {detail.workDays.map((d) => (
                      <StatusChip key={d} tone="positive">
                        {d}
                      </StatusChip>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-display text-base text-foreground">{value}</p>
    </div>
  );
}