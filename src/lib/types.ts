/**
 * Central domain types for M&M Spa CRM.
 * Domain shapes used by the Supabase-backed CRM.
 * without touching UI components.
 */

export type ID = string;

export type Role = "owner" | "front_desk" | "therapist";

export type ConsentChannel = "sms" | "email";

export interface Consent {
  sms: "granted" | "denied" | "pending";
  email: "granted" | "denied" | "pending";
  marketing: boolean;
  unsubscribedAt?: string | undefined;
  updatedAt: string;
}

export type ServiceKey =
  "unspecified" | "swedish" | "deep-tissue" | "couples" | "hot-stone" | "prenatal";

export interface Service {
  id: ID;
  key: ServiceKey;
  name: string;
  durations: number[];
  price: number;
  description: string;
  active: boolean;
}

export type LeadStage = "new" | "contacted" | "qualified" | "booking_pending" | "booked" | "lost";

export type LeadSource =
  | "Website booking"
  | "Google Business Profile"
  | "Instagram"
  | "Walk-in"
  | "Referral"
  | "Missed call"
  | "Yelp";

export interface Lead {
  id: ID;
  name: string;
  phone: string;
  email: string;
  stage: LeadStage;
  source: LeadSource;
  serviceInterest: ServiceKey;
  ownerId: ID;
  lastContactAt: string;
  nextFollowUpAt?: string | undefined;
  value: number;
  consent: Consent;
  locationId: ID;
  notes: string;
  createdAt: string;
}

export interface Client {
  id: ID;
  name: string;
  phone: string;
  email: string;
  lifetimeValue: number;
  visitCount: number;
  lastVisitAt?: string | undefined;
  nextVisitAt?: string | undefined;
  preferredTherapistId?: ID | undefined;
  preferredService: ServiceKey;
  tags: string[];
  rebooked: boolean;
  consent: Consent;
  birthday?: string | undefined;
  intakeComplete: boolean;
  restrictedNote: string;
  internalNote: string;
  packages: { id: ID; label: string; remaining: number; expiresAt: string }[];
  giftCards: { id: ID; code: string; balance: number }[];
  locationId: ID;
  createdAt: string;
}

export type AppointmentStatus =
  "confirmed" | "pending" | "checked_in" | "completed" | "cancelled" | "no_show";

export interface Appointment {
  id: ID;
  clientId?: ID | undefined;
  leadId?: ID | undefined;
  clientName: string;
  serviceKey: ServiceKey;
  duration: number;
  therapistId: ID;
  roomId: ID;
  start: string;
  status: AppointmentStatus;
  price: number;
  deposit: "paid" | "unpaid" | "not_required";
  payment: "paid" | "due" | "refunded";
  reminder: "sent" | "scheduled" | "failed" | "not_scheduled";
  source: LeadSource;
  notes: string;
  locationId: ID;
}

export interface Therapist {
  id: ID;
  name: string;
  title: string;
  initials: string;
  specialties: ServiceKey[];
  availability: string;
  weeklyAppointments: number;
  utilization: number;
  rebookingRate: number;
  reviewRating: number;
  licensedSince: number;
  locationId: ID;
  active: boolean;
}

export type MessageChannel = "sms" | "email" | "internal";

export interface Message {
  id: ID;
  conversationId: ID;
  channel: MessageChannel;
  direction: "inbound" | "outbound";
  body: string;
  sentAt: string;
  authorName: string;
  status: "delivered" | "sent" | "read" | "failed";
}

export interface Conversation {
  id: ID;
  subjectName: string;
  subjectType: "lead" | "client";
  subjectId: ID;
  channel: Exclude<MessageChannel, "internal">;
  lastMessageAt: string;
  preview: string;
  unread: boolean;
  assignedToId?: ID | undefined;
  status: "open" | "snoozed" | "closed";
  consent: Consent;
  messages: Message[];
}

export interface Task {
  id: ID;
  title: string;
  dueAt: string;
  ownerId: ID;
  relatedTo?: { type: "lead" | "client" | "appointment"; id: ID; label: string } | undefined;
  priority: "low" | "normal" | "high";
  done: boolean;
}

export type AutomationStatus = "active" | "paused" | "draft";

export interface AutomationStep {
  kind: "trigger" | "wait" | "condition" | "message" | "task" | "exit";
  label: string;
  detail: string;
}

export interface Automation {
  id: ID;
  name: string;
  category: "Speed to lead" | "Reminders" | "Retention" | "Reputation" | "Lifecycle";
  status: AutomationStatus;
  description: string;
  trigger: string;
  exitCriteria: string;
  audienceSize: number;
  lastRunAt: string;
  successMetric: { label: string; value: string };
  failureCount: number;
  steps: AutomationStep[];
  runHistory: { id: ID; at: string; subject: string; outcome: "success" | "failed" | "skipped" }[];
}

export interface Campaign {
  id: ID;
  name: string;
  channel: "sms" | "email";
  status: "draft" | "scheduled" | "sent";
  segment: string;
  audienceSize: number;
  scheduledFor?: string | undefined;
  sentAt?: string | undefined;
  preview: string;
  metrics: { delivered: number; opened: number; clicked: number; booked: number; revenue: number };
}

export interface Review {
  id: ID;
  clientName: string;
  rating: number;
  source: "Google" | "Yelp" | "Facebook" | "In-app";
  body: string;
  createdAt: string;
  responded: boolean;
  therapistId?: ID | undefined;
  recoveryNeeded: boolean;
}

export interface ActivityEvent {
  id: ID;
  at: string;
  type: "note" | "message" | "stage" | "appointment" | "task" | "automation" | "review";
  title: string;
  detail: string;
  actor: string;
  subjectId?: ID | undefined;
}

export interface Location {
  id: ID;
  name: string;
  address: string;
  phone: string;
  rooms: { id: ID; name: string; type: string }[];
}

export interface TeamMember {
  id: ID;
  name: string;
  role: Role;
  email: string;
  initials: string;
}

export interface NotificationItem {
  id: ID;
  title: string;
  detail: string;
  at: string;
  read: boolean;
  tone: "info" | "warning" | "success";
}
