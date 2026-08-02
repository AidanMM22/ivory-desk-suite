import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CalendarDays,
  ChartLine,
  CheckSquare,
  Inbox,
  LayoutDashboard,
  Megaphone,
  MessageSquarePlus,
  Search,
  Settings,
  Sparkles,
  Star,
  UserPlus,
  Users,
  UsersRound,
  Workflow,
  Menu,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { BUSINESS } from "@/lib/mock/data";
import { dateTime, roleLabel } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { CommandPalette } from "./CommandPalette";
import { QuickActionDialogs } from "./quick-actions";
import type { Role } from "@/lib/mock/types";

export const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/leads", label: "Leads", icon: UserPlus },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/appointments", label: "Appointments", icon: CalendarDays },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/automations", label: "Automations", icon: Workflow },
  { to: "/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/reviews", label: "Reviews", icon: Star },
  { to: "/therapists", label: "Therapists", icon: UsersRound },
  { to: "/reports", label: "Reports", icon: ChartLine },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav aria-label="Main" className="space-y-1">
      {navItems.map((item) => {
        const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-3 px-3 py-4">
      <div className="bg-calm grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border">
        <span className="font-display text-sm">M&amp;M</span>
      </div>
      <div className="min-w-0">
        <p className="font-display truncate text-sm leading-tight">M&amp;M Spa CRM</p>
        <p className="truncate text-xs text-muted-foreground">{BUSINESS.city}</p>
      </div>
    </div>
  );
}

function NotificationCenter() {
  const { notifications, unreadCount, markAllRead } = useWorkspace();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications (${unreadCount} unread)`}
          className="relative min-h-10 min-w-10"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-gold" />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-display text-sm">Notifications</p>
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            Mark all read
          </Button>
        </div>
        <ScrollArea className="max-h-80">
          <ul className="divide-y divide-border">
            {notifications.map((n) => (
              <li key={n.id} className={cn("px-4 py-3", !n.read && "bg-accent/40")}>
                <p className="text-sm font-medium">{n.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{n.detail}</p>
                <p className="mt-1 text-xs text-muted-foreground/80">{dateTime(n.at)}</p>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function TaskPanel() {
  const { tasks, toggleTask, setQuickAction } = useWorkspace();
  const open = tasks.filter((t) => !t.done);
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <CheckSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Tasks</span>
          <span className="rounded-full bg-secondary px-1.5 text-xs">{open.length}</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetTitle className="font-display">Tasks</SheetTitle>
        <div className="mt-4 space-y-2 px-4">
          {tasks.map((t) => (
            <label
              key={t.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent/40"
            >
              <Checkbox checked={t.done} onCheckedChange={() => toggleTask(t.id)} className="mt-0.5" />
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-sm font-medium",
                    t.done && "text-muted-foreground line-through",
                  )}
                >
                  {t.title}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Due {dateTime(t.dueAt)}
                  {t.relatedTo ? ` · ${t.relatedTo.label}` : ""}
                </span>
              </span>
            </label>
          ))}
          <Button variant="outline" className="w-full" onClick={() => setQuickAction("task")}>
            New task
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RoleSwitcher() {
  const { role, setRole } = useWorkspace();
  const roles: Role[] = ["owner", "front_desk", "therapist"];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <span className="hidden sm:inline text-muted-foreground">Viewing as</span>
          {roleLabel[role]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Preview permissions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {roles.map((r) => (
          <DropdownMenuItem key={r} onSelect={() => setRole(r)}>
            {roleLabel[r]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function QuickActionMenu() {
  const { setQuickAction } = useWorkspace();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">Quick actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setQuickAction("lead")}>
          <UserPlus className="mr-2 h-4 w-4" /> Add lead
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setQuickAction("appointment")}>
          <CalendarDays className="mr-2 h-4 w-4" /> Book appointment
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setQuickAction("message")}>
          <MessageSquarePlus className="mr-2 h-4 w-4" /> Send message
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setQuickAction("task")}>
          <CheckSquare className="mr-2 h-4 w-4" /> Create task
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { setPaletteOpen } = useWorkspace();
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPaletteOpen]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-60 shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar lg:flex">
        <div>
          <Brand />
          <div className="px-2">
            <NavList />
          </div>
        </div>
        <div className="px-5 py-4 text-xs text-muted-foreground">
          <p className="font-medium text-sidebar-foreground/80">Practice workspace</p>
          <p className="mt-1">{BUSINESS.phone}</p>
          <p>{BUSINESS.city}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
          <div className="flex items-center gap-2 px-3 py-3 sm:px-6">
            <Sheet open={mobileNav} onOpenChange={setMobileNav}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open navigation"
                  className="min-h-10 min-w-10 lg:hidden"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-sidebar p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <Brand />
                <div className="px-2">
                  <NavList onNavigate={() => setMobileNav(false)} />
                </div>
              </SheetContent>
            </Sheet>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-ring/50 sm:max-w-md"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="truncate">Search clients, leads, appointments…</span>
              <kbd className="ml-auto hidden shrink-0 rounded border border-border px-1.5 text-xs sm:inline">
                ⌘K
              </kbd>
            </button>

            <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
              <TaskPanel />
              <NotificationCenter />
              <RoleSwitcher />
              <QuickActionMenu />
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>

        <footer className="border-t border-border px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
          M&amp;M Massage Spa · {BUSINESS.city} · {BUSINESS.phone} — practice workspace with mock
          data. Messaging, payments, and automation execution are not connected.
        </footer>
      </div>

      <CommandPalette />
      <QuickActionDialogs />
    </div>
  );
}