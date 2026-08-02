# M&M Spa Console

Build a polished responsive desktop-first CRM web app called “M&M Spa CRM” for M&M Massage Spa in Tacoma, Washington. This is phase 1: a fully navigable frontend using realistic mock data and clean component boundaries, prepared for a future Supabase backend. Do not attempt to connect a real database yet.

Brand and visual direction:
- Calm premium wellness aesthetic inspired by mandmmassagespa.com, but designed as a highly usable operational CRM, not a marketing website.
- Warm ivory background, charcoal text, muted sage, subtle eucalyptus green, and restrained gold accents. Avoid purple gradients and generic SaaS styling.
- Use a tasteful serif for display headings and a highly legible sans-serif for UI/body text.
- Compact left sidebar, top command/search bar, generous whitespace, clear status chips, excellent tables, cards, forms, empty states, and mobile responsiveness.
- Include the business phone (253) 753-4727 and Tacoma, WA where contextually appropriate.

Information architecture and working navigation:
1. Dashboard
2. Leads
3. Clients
4. Appointments
5. Inbox
6. Automations
7. Campaigns
8. Reviews
9. Therapists
10. Reports
11. Settings

Build these key screens and interactions:

Dashboard:
- Date range filter and location selector.
- KPI cards: new leads, booked appointments, lead-to-booking conversion, revenue, rebooking rate, no-show rate, review rating.
- Today’s schedule timeline by therapist.
- Lead pipeline summary, tasks due, recent client activity, automation health, and attribution breakdown.
- Quick actions: add lead, book appointment, send message, create task.

Leads:
- Kanban and table toggle.
- Stages: New, Contacted, Qualified, Booking Pending, Booked, Lost.
- Lead source, service interest, owner, last contact, next follow-up, value, consent status.
- Search/filter/sort, bulk selection, add lead modal, lead detail drawer with activity timeline, notes, tasks, messages, stage changes, and book appointment action.
- Include realistic leads for Swedish massage, deep tissue, couples massage, and hot stone massage.

Clients:
- Searchable client directory with lifetime value, last/next visit, visit count, preferred therapist/service, tags, rebooking status, and communication consent.
- Client 360 profile with contact info, preferences, appointment history, packages/gift cards, forms/consents status, communication timeline, internal notes, tasks, and marketing eligibility.
- Clearly label sensitive treatment/intake notes as restricted and keep mock content non-medical and generic.

Appointments:
- Day/week/month calendar views and list view.
- Therapist and room filters, appointment statuses, drag-ready visual layout, new appointment flow, reschedule/cancel/no-show actions.
- Booking form: client, service, duration, therapist, room, date/time, price, source, notes.
- Services should include Swedish, Deep Tissue, Couples, and Hot Stone with reasonable mock durations/prices.
- Show reminder delivery status and deposit/payment status.

Inbox:
- Unified conversation UI for SMS/email with conversation list, filters, unread states, client/lead context panel, templates, composer, assignment, and internal note mode.
- Message content is mocked; clearly show consent/unsubscribe status.

Automations:
- Visual automation library and management screen with cards and status controls.
- Include these workflows: New lead speed-to-lead follow-up; Appointment confirmation; 24-hour reminder; 2-hour reminder; Missed-call text back; Post-visit thank-you; Review request; No-show recovery; Rebooking reminder; Lapsed client reactivation at 60/90/180 days; Birthday offer; Incomplete intake reminder.
- Each automation detail should show trigger, wait steps, conditions, message steps, exit criteria, audience size, last run, success metric, failure count, and run history.
- Add create/edit automation drawer with a simple vertical workflow builder UI. Frontend only.

Campaigns:
- Campaign list, audience segments, draft/scheduled/sent states, basic composer preview, performance metrics, and create campaign flow.

Reviews:
- Rating overview, request funnel, review feed, source filters, response status, and mock response composer. Include service recovery queue for low ratings.

Therapists:
- Staff cards/table with availability, specialties, appointments, utilization, rebooking rate, and review rating. Therapist profile with schedule and performance.

Reports:
- Revenue trend, bookings by source/service/therapist, conversion funnel, retention cohorts, rebooking, no-shows/cancellations, campaign attribution, and automation performance. Use clean charts with realistic mock data.

Settings:
- Business profile, locations, services/pricing, rooms/resources, team/roles, pipeline stages, tags/custom fields, message templates, communication preferences/consent, integrations placeholders, notification settings, and audit log.
- Integration placeholders for Supabase, GitHub, Twilio, email provider, Google Business Profile, Stripe, and existing website booking source.

Global behavior:
- Every sidebar item and major CTA should navigate or open a meaningful modal/drawer; avoid dead buttons.
- Seed coherent realistic mock data reused across screens.
- Provide toasts for mock save/send/status actions.
- Add a global search/command palette.
- Add role switcher for Owner, Front Desk, and Therapist to preview permissions; therapist role should visibly restrict sensitive business settings and other therapists’ client notes.
- Add notification center and task panel.
- Use TypeScript, Tailwind, shadcn/ui, Lucide icons, and Recharts where appropriate.
- Structure mock types/services so Supabase queries can replace them later. Create central domain types for Lead, Client, Appointment, Therapist, Service, Conversation, Message, Task, Automation, Campaign, Review, Consent, and ActivityEvent.
- Include clear loading skeletons and empty states.
- Ensure accessibility: keyboard navigation, visible focus states, labels, adequate contrast.
- Do not build real messaging, payments, or automation execution yet, and do not claim they are connected. Mark the app subtly as “Practice workspace” in the UI.

Start with the full application shell, dashboard, Leads, Clients, Appointments, Inbox, Automations, and Settings as the most detailed screens. The remaining modules must still be polished and navigable, even if slightly lighter in depth.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ivory-desk-suite.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/15e8eac4-f624-47ec-8fd8-755a39e1cf33).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
