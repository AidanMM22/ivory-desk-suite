import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, SectionTitle } from "@/components/shared/page";
import { StatusChip } from "@/components/shared/chips";
import { reviews as seedReviews } from "@/lib/mock/data";
import { useCrmData } from "@/lib/crm-data";
import type { Review } from "@/lib/mock/types";

const reviewFunnel: { label: string; value: number }[] = [
  { label: "Requests sent", value: 186 },
  { label: "Opened", value: 141 },
  { label: "Clicked through", value: 78 },
  { label: "Reviews left", value: 52 },
];
import { shortDate } from "@/lib/format";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Reviews — M&M Spa CRM" },
      {
        name: "description",
        content:
          "Monitor ratings, review requests, and service recovery for M&M Massage Spa in Tacoma, WA.",
      },
      { property: "og:title", content: "Reviews — M&M Spa CRM" },
      {
        property: "og:description",
        content: "Rating overview, request funnel, and response queue.",
      },
    ],
  }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const { persistRecord } = useCrmData();
  const [source, setSource] = useState("all");
  const [reviews, setReviews] = useState<Review[]>(seedReviews);
  const [reply, setReply] = useState<Record<string, string>>({});
  const visible = reviews.filter((r) => source === "all" || r.source === source);
  const average = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
  const recovery = reviews.filter((r) => r.rating <= 3);

  return (
    <div className="mx-auto max-w-[1300px] space-y-6">
      <PageHeader
        title="Reviews"
        description={`${average} average across ${reviews.length} reviews`}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="surface-soft">
          <CardHeader>
            <CardTitle className="font-display text-lg">Rating overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-display text-4xl">{average}</p>
            {[5, 4, 3, 2, 1].map((n) => {
              const count = reviews.filter((r) => Math.round(r.rating) === n).length;
              return (
                <div key={n} className="flex items-center gap-2 text-xs">
                  <span className="w-8">{n}★</span>
                  <span className="h-2 flex-1 rounded-full bg-secondary">
                    <span
                      className="block h-2 rounded-full bg-gold"
                      style={{ width: `${(count / reviews.length) * 100}%` }}
                    />
                  </span>
                  <span className="w-6 text-right text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="surface-soft">
          <CardHeader>
            <CardTitle className="font-display text-lg">Request funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reviewFunnel.map((f) => (
              <div key={f.label} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>{f.label}</span>
                  <span className="font-display">{f.value}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="surface-soft">
          <CardHeader>
            <CardTitle className="font-display text-lg">Service recovery queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recovery.length === 0 ? (
              <p className="text-sm text-muted-foreground">No low ratings to recover.</p>
            ) : (
              recovery.map((r) => (
                <div key={r.id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium">
                    {r.clientName} · {r.rating}★
                  </p>
                  <p className="text-xs text-muted-foreground">{r.body}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => toast.success("Recovery task created for the front desk")}
                  >
                    Create recovery task
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={source} onValueChange={setSource}>
        <TabsList>
          <TabsTrigger value="all">All sources</TabsTrigger>
          <TabsTrigger value="Google">Google</TabsTrigger>
          <TabsTrigger value="Yelp">Yelp</TabsTrigger>
          <TabsTrigger value="Facebook">Facebook</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {visible.map((r) => (
          <Card key={r.id} className="surface-soft">
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex" aria-label={`${r.rating} stars`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < r.rating ? "fill-gold text-gold" : "text-muted-foreground"}`}
                      />
                    ))}
                  </span>
                  <p className="text-sm font-medium">{r.clientName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{r.source}</span>
                  {r.responded ? (
                    <span className="text-xs text-muted-foreground">Responded</span>
                  ) : (
                    <StatusChip tone="warning">Needs response</StatusChip>
                  )}
                  <span className="text-xs text-muted-foreground">{shortDate(r.createdAt)}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{r.body}</p>
              {!r.responded ? (
                <div className="space-y-2">
                  <SectionTitle>Draft response</SectionTitle>
                  <Textarea
                    aria-label={`Response to ${r.clientName}`}
                    rows={2}
                    value={reply[r.id] ?? ""}
                    onChange={(e) => setReply((p) => ({ ...p, [r.id]: e.target.value }))}
                    placeholder="Thank you for visiting M&M Massage Spa…"
                  />
                  <Button
                    size="sm"
                    disabled={!(reply[r.id] ?? "").trim()}
                    onClick={() => {
                      const updated = { ...r, responded: true };
                      setReviews((current) =>
                        current.map((review) => (review.id === r.id ? updated : review)),
                      );
                      void persistRecord("reviews", updated).catch((error: unknown) =>
                        toast.error(
                          error instanceof Error ? error.message : "Could not save the response.",
                        ),
                      );
                      toast.success("Response saved");
                    }}
                  >
                    Post response
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
