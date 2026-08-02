import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { notifications as seedNotifications, tasks as seedTasks, locations } from "./mock/data";
import type { NotificationItem, Role, Task } from "./mock/types";

export type QuickAction = "lead" | "appointment" | "message" | "task" | null;

interface WorkspaceValue {
  role: Role;
  setRole: (role: Role) => void;
  can: (permission: Permission) => boolean;
  locationId: string;
  setLocationId: (id: string) => void;
  dateRange: string;
  setDateRange: (range: string) => void;
  notifications: NotificationItem[];
  markAllRead: () => void;
  unreadCount: number;
  tasks: Task[];
  toggleTask: (id: string) => void;
  addTask: (title: string, dueAt: string) => void;
  quickAction: QuickAction;
  setQuickAction: (action: QuickAction) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
}

export type Permission =
  | "settings.business"
  | "settings.team"
  | "reports.revenue"
  | "clients.allNotes"
  | "campaigns.send";

const permissions: Record<Role, Permission[]> = {
  owner: [
    "settings.business",
    "settings.team",
    "reports.revenue",
    "clients.allNotes",
    "campaigns.send",
  ],
  front_desk: ["reports.revenue", "clients.allNotes", "campaigns.send"],
  therapist: [],
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("owner");
  const [locationId, setLocationId] = useState(locations[0]!.id);
  const [dateRange, setDateRange] = useState("last_30");
  const [notifications, setNotifications] = useState<NotificationItem[]>(seedNotifications);
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [quickAction, setQuickAction] = useState<QuickAction>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const value = useMemo<WorkspaceValue>(
    () => ({
      role,
      setRole,
      can: (permission) => permissions[role].includes(permission),
      locationId,
      setLocationId,
      dateRange,
      setDateRange,
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      markAllRead: () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
      tasks,
      toggleTask: (id) =>
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))),
      addTask: (title, dueAt) =>
        setTasks((prev) => [
          {
            id: `tk-${prev.length + 1}-${title.length}`,
            title,
            dueAt,
            ownerId: "u-1",
            priority: "normal",
            done: false,
          },
          ...prev,
        ]),
      quickAction,
      setQuickAction,
      paletteOpen,
      setPaletteOpen,
    }),
    [role, locationId, dateRange, notifications, tasks, quickAction, paletteOpen],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}