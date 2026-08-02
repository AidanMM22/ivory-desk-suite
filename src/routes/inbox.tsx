import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, MessageSquare, Send, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, PageHeader, SectionTitle } from "@/components/shared/page";
import { ConsentChip } from "@/components/shared/chips";
import {
  clientById,
  conversations as seedConversations,
  leads,
  messageTemplates,
  team,
} from "@/lib/data";
import { dateTime, initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/lib/types";
import { useCrmData } from "@/lib/crm-data";

export const Route = createFileRoute("/inbox")({
  head: () => ({
    meta: [
      { title: "Inbox — M&M Spa CRM" },
      {
        name: "description",
        content:
          "Unified SMS and email inbox for M&M Massage Spa in Tacoma with consent status, templates, and internal notes.",
      },
      { property: "og:title", content: "Inbox — M&M Spa CRM" },
      {
        property: "og:description",
        content: "Unified conversations with lead and client context.",
      },
    ],
  }),
  component: InboxPage,
});

function InboxPage() {
  const { persistRecord } = useCrmData();
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState<Conversation[]>(seedConversations);
  const [activeId, setActiveId] = useState(seedConversations[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState("reply");

  const visible = items.filter((c) =>
    filter === "all"
      ? true
      : filter === "unread"
        ? c.unread
        : filter === "sms"
          ? c.channel === "sms"
          : filter === "email"
            ? c.channel === "email"
            : c.status === "closed",
  );
  const active = items.find((c) => c.id === activeId);
  const optedOut = active?.consent.sms === "denied";

  const openConversation = (id: string) => {
    setActiveId(id);
    const conversation = items.find((item) => item.id === id);
    if (!conversation || !conversation.unread) return;
    const updated = { ...conversation, unread: false };
    setItems((prev) => prev.map((c) => (c.id === id ? updated : c)));
    void persistRecord("conversations", updated).catch((error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not update the conversation."),
    );
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title="Inbox"
        description={`${items.filter((c) => c.unread).length} unread · connect a messaging provider to send SMS or email`}
      />

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)_300px]">
        <Card className="surface-soft overflow-hidden">
          <div className="border-b border-border p-3">
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="w-full flex-wrap">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
                <TabsTrigger value="sms">SMS</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <ul className="divide-y divide-border">
            {visible.length === 0 ? (
              <li className="p-4">
                <EmptyState
                  title="Nothing here"
                  description="No conversations match this filter."
                />
              </li>
            ) : (
              visible.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => openConversation(c.id)}
                    className={cn(
                      "flex w-full items-start gap-3 p-3 text-left hover:bg-accent/40",
                      c.id === activeId && "bg-accent/60",
                    )}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
                      {initialsOf(c.subjectName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{c.subjectName}</span>
                        {c.unread ? <span className="h-2 w-2 rounded-full bg-gold" /> : null}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {c.preview}
                      </span>
                      <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        {c.channel === "sms" ? (
                          <MessageSquare className="h-3 w-3" />
                        ) : (
                          <Mail className="h-3 w-3" />
                        )}
                        {dateTime(c.lastMessageAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card className="surface-soft flex min-h-[560px] flex-col">
          {active ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
                <div className="min-w-0">
                  <p className="font-display truncate text-lg">{active.subjectName}</p>
                  <p className="text-xs text-muted-foreground">
                    {active.subjectType} · {active.channel.toUpperCase()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {active.consent.sms === "granted" && active.consent.email === "granted" ? (
                    <span className="text-xs text-muted-foreground">SMS and email allowed</span>
                  ) : (
                    <>
                      {active.consent.sms !== "granted" ? (
                        <ConsentChip channel="SMS" state={active.consent.sms} />
                      ) : null}
                      {active.consent.email !== "granted" ? (
                        <ConsentChip channel="Email" state={active.consent.email} />
                      ) : null}
                    </>
                  )}
                  <Select
                    value={active.assignedToId ?? "unassigned"}
                    onValueChange={(v) => {
                      const updated = {
                        ...active,
                        assignedToId: v === "unassigned" ? undefined : v,
                      };
                      setItems((prev) => prev.map((c) => (c.id === active.id ? updated : c)));
                      void persistRecord("conversations", updated).catch((error: unknown) =>
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Could not reassign this conversation.",
                        ),
                      );
                      toast.success("Conversation reassigned");
                    }}
                  >
                    <SelectTrigger className="w-[160px]" aria-label="Assign conversation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {team.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {optedOut ? (
                <div className="border-b border-destructive/25 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                  This contact replied STOP — outbound messaging is blocked.
                </div>
              ) : null}

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {active.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[80%] rounded-xl border p-3 text-sm",
                      m.direction === "outbound"
                        ? "ml-auto border-primary/25 bg-secondary"
                        : "border-border bg-card",
                    )}
                  >
                    <p>{m.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {m.authorName} · {dateTime(m.sentAt)} · {m.status}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t border-border p-4">
                <Tabs value={mode} onValueChange={setMode}>
                  <TabsList>
                    <TabsTrigger value="reply">Reply</TabsTrigger>
                    <TabsTrigger value="note" className="gap-1.5">
                      <StickyNote className="h-3.5 w-3.5" /> Internal note
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Textarea
                  aria-label={mode === "reply" ? "Reply message" : "Internal note"}
                  rows={3}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={
                    mode === "reply"
                      ? "Write a reply — delivery requires a messaging provider"
                      : "Visible to the team only"
                  }
                  className={mode === "note" ? "bg-gold/10" : undefined}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Select onValueChange={(v) => setDraft(v)}>
                    <SelectTrigger className="w-[220px]" aria-label="Insert template">
                      <SelectValue placeholder="Insert template" />
                    </SelectTrigger>
                    <SelectContent>
                      {messageTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.body}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    disabled={!draft.trim() || (mode === "reply" && optedOut)}
                    onClick={() => {
                      const now = new Date().toISOString();
                      const updated: Conversation = {
                        ...active,
                        preview: draft.trim(),
                        lastMessageAt: now,
                        messages: [
                          ...active.messages,
                          {
                            id: crypto.randomUUID(),
                            conversationId: active.id,
                            channel: mode === "reply" ? active.channel : "internal",
                            direction: "outbound",
                            body: draft.trim(),
                            sentAt: now,
                            authorName: mode === "reply" ? "Front desk" : "Internal note",
                            status: "sent",
                          },
                        ],
                      };
                      setItems((current) =>
                        current.map((conversation) =>
                          conversation.id === active.id ? updated : conversation,
                        ),
                      );
                      void persistRecord("conversations", updated).catch((error: unknown) =>
                        toast.error(
                          error instanceof Error ? error.message : "Could not save the message.",
                        ),
                      );
                      toast.success(mode === "reply" ? "Message saved" : "Internal note saved");
                      setDraft("");
                    }}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {mode === "reply" ? "Send" : "Save note"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <CardContent className="p-6">
              <EmptyState title="Select a conversation" description="Pick a thread on the left." />
            </CardContent>
          )}
        </Card>

        <Card className="surface-soft">
          <CardContent className="space-y-4 p-4">
            <SectionTitle>Context</SectionTitle>
            {active ? (
              <>
                <div className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium">{active.subjectName}</p>
                  <p className="text-xs text-muted-foreground">
                    {active.subjectType === "client"
                      ? clientById(active.subjectId)?.phone
                      : leads.find((l) => l.id === active.subjectId)?.phone}
                  </p>
                </div>
                {active.subjectType === "client" ? (
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">
                      ${clientById(active.subjectId)?.lifetimeValue ?? 0} lifetime value
                    </p>
                    <p className="text-muted-foreground">
                      {clientById(active.subjectId)?.visitCount} visits · prefers{" "}
                      {clientById(active.subjectId)?.preferredService}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">
                      Lead · {leads.find((l) => l.id === active.subjectId)?.source}
                    </p>
                    <p className="text-muted-foreground">
                      Interested in {leads.find((l) => l.id === active.subjectId)?.serviceInterest}
                    </p>
                  </div>
                )}
                <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
                  Unsubscribe status:{" "}
                  {active.consent.unsubscribedAt
                    ? `opted out ${dateTime(active.consent.unsubscribedAt)}`
                    : "subscribed"}
                </div>
                <Input aria-label="Add tag" placeholder="Add a tag…" />
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
