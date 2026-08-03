import type {
  ActivityEvent,
  Appointment,
  Automation,
  Campaign,
  Client,
  Conversation,
  Lead,
  Location,
  NotificationItem,
  Review,
  Service,
  ServiceKey,
  Task,
  TeamMember,
  Therapist,
} from "./types";

/**
 * Runtime collections hydrated exclusively from Supabase by CrmDataProvider.
 * They intentionally start empty: a new workspace never receives sample records.
 */
export const TODAY = new Date().toISOString().slice(0, 10);

export const BUSINESS = {
  name: "",
  workspace: "",
  phone: "",
  city: "",
  website: "",
};

export const day = (offset: number) => {
  const date = new Date(`${TODAY}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

export const locations: Location[] = [];
export const services: Service[] = [];
export const team: TeamMember[] = [];
export const therapists: Therapist[] = [];
export const leads: Lead[] = [];
export const clients: Client[] = [];
export const appointments: Appointment[] = [];
export const conversations: Conversation[] = [];
export const tasks: Task[] = [];
export const automations: Automation[] = [];
export const campaigns: Campaign[] = [];
export const reviews: Review[] = [];
export const activity: ActivityEvent[] = [];
export const notifications: NotificationItem[] = [];

export const serviceByKey = (key: ServiceKey): Service =>
  services.find((service) => service.key === key) ?? {
    id: `missing-${key}`,
    key,
    name: key === "unspecified" ? "Not specified" : "Service unavailable",
    durations: [],
    price: 0,
    description: "",
    active: false,
  };

export const therapistById = (id?: string) => therapists.find((therapist) => therapist.id === id);

export const clientById = (id?: string) => clients.find((client) => client.id === id);

export const revenueTrend: { month: string; revenue: number; bookings: number }[] = [];
export const bookingsBySource: { source: string; bookings: number }[] = [];
export const bookingsByService: { name: string; value: number; revenue: number }[] = [];
export const conversionFunnel: { stage: string; value: number }[] = [];
export const retentionCohorts: { cohort: string; m1: number; m2: number; m3: number }[] = [];
export const noShowTrend: { week: string; noShows: number; cancellations: number }[] = [];
export const attribution: { name: string; value: number }[] = [];
export const auditLog: { id: string; at: string; actor: string; action: string }[] = [];
export const messageTemplates: {
  id: string;
  name: string;
  channel: "sms" | "email";
  body: string;
}[] = [];
