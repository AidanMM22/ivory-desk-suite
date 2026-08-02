import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  activity,
  appointments,
  auditLog,
  automations,
  BUSINESS,
  campaigns,
  clients,
  conversations,
  leads,
  locations,
  messageTemplates,
  notifications,
  reviews,
  services,
  tasks,
  team,
  therapists,
} from "@/lib/mock/data";
import type { Role } from "@/lib/mock/types";
import { getSupabaseClient } from "@/lib/supabase/client";

export type CrmEntityType =
  | "activity"
  | "appointments"
  | "audit_log"
  | "automations"
  | "business"
  | "campaigns"
  | "clients"
  | "conversations"
  | "leads"
  | "locations"
  | "message_templates"
  | "notifications"
  | "reviews"
  | "services"
  | "tasks"
  | "team"
  | "therapists";

type JsonRecord = Record<string, unknown>;

interface DatabaseRecord {
  workspace_id: string;
  entity_type: CrmEntityType;
  entity_id: string;
  location_id: string | null;
  payload: JsonRecord;
}

interface CrmDataValue {
  revision: number;
  workspaceId: string | null;
  persistRecord: (
    entityType: CrmEntityType,
    entity: object & { id?: string },
    locationId?: string,
  ) => Promise<void>;
  removeRecord: (entityType: CrmEntityType, entityId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const CrmDataContext = createContext<CrmDataValue | null>(null);

const listTargets: Record<Exclude<CrmEntityType, "business">, JsonRecord[]> = {
  activity: activity as unknown as JsonRecord[],
  appointments: appointments as unknown as JsonRecord[],
  audit_log: auditLog as unknown as JsonRecord[],
  automations: automations as unknown as JsonRecord[],
  campaigns: campaigns as unknown as JsonRecord[],
  clients: clients as unknown as JsonRecord[],
  conversations: conversations as unknown as JsonRecord[],
  leads: leads as unknown as JsonRecord[],
  locations: locations as unknown as JsonRecord[],
  message_templates: messageTemplates as unknown as JsonRecord[],
  notifications: notifications as unknown as JsonRecord[],
  reviews: reviews as unknown as JsonRecord[],
  services: services as unknown as JsonRecord[],
  tasks: tasks as unknown as JsonRecord[],
  team: team as unknown as JsonRecord[],
  therapists: therapists as unknown as JsonRecord[],
};

const seedSnapshot = {
  business: { ...BUSINESS } as JsonRecord,
  lists: Object.fromEntries(
    Object.entries(listTargets).map(([key, rows]) => [
      key,
      rows.map((row) => structuredClone(row)),
    ]),
  ) as Record<Exclude<CrmEntityType, "business">, JsonRecord[]>,
};

function recordId(entityType: CrmEntityType, entity: JsonRecord, index: number) {
  if (entityType === "business") return "default";
  return String(entity["id"] ?? `${entityType}-${index + 1}`);
}

function locationIdOf(entity: JsonRecord) {
  const locationId = entity["locationId"];
  return typeof locationId === "string" ? locationId : null;
}

function seedRows(workspaceId: string, userId: string): DatabaseRecord[] {
  const rows: DatabaseRecord[] = [
    {
      workspace_id: workspaceId,
      entity_type: "business",
      entity_id: "default",
      location_id: null,
      payload: seedSnapshot.business,
    },
  ];

  for (const [entityType, entities] of Object.entries(seedSnapshot.lists) as [
    Exclude<CrmEntityType, "business">,
    JsonRecord[],
  ][]) {
    entities.forEach((entity, index) => {
      rows.push({
        workspace_id: workspaceId,
        entity_type: entityType,
        entity_id: recordId(entityType, entity, index),
        location_id: locationIdOf(entity),
        payload: entity,
      });
    });
  }

  return rows.map((row) => ({ ...row, updated_by: userId })) as DatabaseRecord[];
}

function hydrate(records: DatabaseRecord[]) {
  const grouped = new Map<CrmEntityType, JsonRecord[]>();
  for (const record of records) {
    const existing = grouped.get(record.entity_type) ?? [];
    existing.push(record.payload);
    grouped.set(record.entity_type, existing);
  }

  const business = grouped.get("business")?.[0];
  if (business) Object.assign(BUSINESS, business);

  for (const [entityType, target] of Object.entries(listTargets) as [
    Exclude<CrmEntityType, "business">,
    JsonRecord[],
  ][]) {
    const databaseRows = grouped.get(entityType);
    if (databaseRows) target.splice(0, target.length, ...databaseRows);
  }
}

function upsertHydratedRecord(entityType: CrmEntityType, entity: JsonRecord, entityId: string) {
  if (entityType === "business") {
    Object.assign(BUSINESS, entity);
    return;
  }

  const target = listTargets[entityType];
  const index = target.findIndex((row) => String(row["id"]) === entityId);
  if (index >= 0) target[index] = entity;
  else target.unshift(entity);
}

export function CrmDataProvider({
  workspaceId,
  userId,
  role,
  children,
}: {
  workspaceId: string;
  userId: string;
  role: Role;
  children: ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const supabase = getSupabaseClient();

  const refresh = useCallback(async () => {
    if (!supabase) return;
    setError(null);

    const { data, error: queryError } = await supabase
      .from("crm_records")
      .select("workspace_id, entity_type, entity_id, location_id, payload")
      .eq("workspace_id", workspaceId)
      .order("entity_type")
      .order("entity_id");

    if (queryError) throw queryError;

    let records = (data ?? []) as DatabaseRecord[];
    if (records.length === 0 && (role === "owner" || role === "front_desk")) {
      const seed = seedRows(workspaceId, userId);
      for (let index = 0; index < seed.length; index += 100) {
        const { error: seedError } = await supabase
          .from("crm_records")
          .upsert(seed.slice(index, index + 100), {
            onConflict: "workspace_id,entity_type,entity_id",
          });
        if (seedError) throw seedError;
      }

      const { data: seededData, error: seededQueryError } = await supabase
        .from("crm_records")
        .select("workspace_id, entity_type, entity_id, location_id, payload")
        .eq("workspace_id", workspaceId)
        .order("entity_type")
        .order("entity_id");
      if (seededQueryError) throw seededQueryError;
      records = (seededData ?? []) as DatabaseRecord[];
    }

    hydrate(records);
    setRevision((value) => value + 1);
  }, [role, supabase, userId, workspaceId]);

  useEffect(() => {
    let active = true;

    void refresh()
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Could not load CRM data.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    if (!supabase) return () => undefined;
    const channel = supabase
      .channel(`crm-records:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crm_records",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => void refresh().catch(() => undefined),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [refresh, supabase, workspaceId]);

  const persistRecord = useCallback(
    async (entityType: CrmEntityType, entity: object & { id?: string }, locationId?: string) => {
      if (!supabase) return;
      const jsonEntity = entity as JsonRecord;
      const entityId = recordId(entityType, jsonEntity, 0);
      const { error: persistError } = await supabase.from("crm_records").upsert(
        {
          workspace_id: workspaceId,
          entity_type: entityType,
          entity_id: entityId,
          location_id: locationId ?? locationIdOf(jsonEntity),
          payload: jsonEntity,
          updated_by: userId,
        },
        { onConflict: "workspace_id,entity_type,entity_id" },
      );
      if (persistError) throw persistError;
      upsertHydratedRecord(entityType, jsonEntity, entityId);
      setRevision((value) => value + 1);
    },
    [supabase, userId, workspaceId],
  );

  const removeRecord = useCallback(
    async (entityType: CrmEntityType, entityId: string) => {
      if (!supabase) return;
      const { error: removeError } = await supabase
        .from("crm_records")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId);
      if (removeError) throw removeError;
      if (entityType !== "business") {
        const target = listTargets[entityType];
        const index = target.findIndex((row) => String(row["id"]) === entityId);
        if (index >= 0) target.splice(index, 1);
      }
      setRevision((value) => value + 1);
    },
    [supabase, workspaceId],
  );

  const value = useMemo<CrmDataValue>(
    () => ({ revision, workspaceId, persistRecord, removeRecord, refresh }),
    [persistRecord, refresh, removeRecord, revision, workspaceId],
  );

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading your workspace…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="font-display text-2xl">CRM data could not load</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            onClick={() => {
              setLoading(true);
              void refresh()
                .then(() => setError(null))
                .catch((caught: unknown) =>
                  setError(caught instanceof Error ? caught.message : "Could not load CRM data."),
                )
                .finally(() => setLoading(false));
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <CrmDataContext.Provider value={value}>
      <Fragment key={revision}>{children}</Fragment>
    </CrmDataContext.Provider>
  );
}

export function useCrmData() {
  const context = useContext(CrmDataContext);
  if (!context) {
    return {
      revision: 0,
      workspaceId: null,
      persistRecord: async () => undefined,
      removeRecord: async () => undefined,
      refresh: async () => undefined,
    } satisfies CrmDataValue;
  }
  return context;
}
