import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "./auth";
import { useCrmData } from "./crm-data";
import { notifications as seedNotifications, tasks as seedTasks, locations } from "./data";
import type { NotificationItem, Role, Task } from "./types";

export type QuickAction =
  "lead" | "client" | "therapist" | "room" | "service" | "appointment" | "message" | "task" | null;

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
  "settings.business" | "settings.team" | "reports.revenue" | "clients.allNotes" | "campaigns.send";

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
  const { membership, user } = useAuth();
  const { persistRecord } = useCrmData();
  const role = membership?.role ?? "owner";
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "all");
  const [dateRange, setDateRange] = useState("last_30");
  const [notifications, setNotifications] = useState<NotificationItem[]>(seedNotifications);
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [quickAction, setQuickAction] = useState<QuickAction>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const value = useMemo<WorkspaceValue>(
    () => ({
      role,
      setRole: () => undefined,
      can: (permission) => permissions[role].includes(permission),
      locationId,
      setLocationId,
      dateRange,
      setDateRange,
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      markAllRead: () => {
        const updated = notifications.map((notification) => ({ ...notification, read: true }));
        setNotifications(updated);
        void Promise.all(
          updated.map((notification) =>
            persistRecord("notifications", notification as unknown as Record<string, unknown>),
          ),
        ).catch(() => toast.error("Notifications could not be updated."));
      },
      tasks,
      toggleTask: (id) => {
        setTasks((prev) => {
          const updated = prev.map((task) =>
            task.id === id ? { ...task, done: !task.done } : task,
          );
          const changed = updated.find((task) => task.id === id);
          if (changed) {
            void persistRecord("tasks", changed as unknown as Record<string, unknown>).catch(() =>
              toast.error("Task could not be updated."),
            );
          }
          return updated;
        });
      },
      addTask: (title, dueAt) => {
        const task: Task = {
          id: crypto.randomUUID(),
          title,
          dueAt,
          ownerId: user?.id ?? "unassigned",
          priority: "normal",
          done: false,
        };
        setTasks((prev) => [task, ...prev]);
        void persistRecord("tasks", task as unknown as Record<string, unknown>).catch(() =>
          toast.error("Task could not be saved."),
        );
      },
      quickAction,
      setQuickAction,
      paletteOpen,
      setPaletteOpen,
    }),
    [
      role,
      locationId,
      dateRange,
      notifications,
      tasks,
      quickAction,
      paletteOpen,
      persistRecord,
      user?.id,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
