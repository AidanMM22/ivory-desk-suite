import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useWorkspace } from "@/lib/workspace";
import { clients, appointments } from "@/lib/data";
import { dateTime } from "@/lib/format";
import { navItems } from "./AppShell";

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, setQuickAction } = useWorkspace();
  const navigate = useNavigate();

  const go = (to: string) => {
    setPaletteOpen(false);
    void navigate({ to });
  };

  return (
    <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
      <CommandInput placeholder="Search or jump to…" />
      <CommandList>
        <CommandEmpty>No matching CRM records.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {navItems.map((item) => (
            <CommandItem key={item.to} value={`go ${item.label}`} onSelect={() => go(item.to)}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick actions">
          <CommandItem
            value="book appointment"
            onSelect={() => {
              setPaletteOpen(false);
              setQuickAction("appointment");
            }}
          >
            Book appointment
          </CommandItem>
          {(
            [
              ["client", "Add client"],
              ["therapist", "Add therapist"],
              ["room", "Add room"],
              ["service", "Add service"],
            ] as const
          ).map(([action, label]) => (
            <CommandItem
              key={action}
              value={label.toLowerCase()}
              onSelect={() => {
                setPaletteOpen(false);
                setQuickAction(action);
              }}
            >
              {label}
            </CommandItem>
          ))}
          <CommandItem
            value="send message"
            onSelect={() => {
              setPaletteOpen(false);
              setQuickAction("message");
            }}
          >
            Send message
          </CommandItem>
          <CommandItem
            value="create task"
            onSelect={() => {
              setPaletteOpen(false);
              setQuickAction("task");
            }}
          >
            Create task
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Clients">
          {clients.map((c) => (
            <CommandItem key={c.id} value={`client ${c.name}`} onSelect={() => go("/clients")}>
              {c.name}
              <span className="ml-auto text-xs text-muted-foreground">{c.visitCount} visits</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Appointments">
          {appointments.slice(0, 8).map((a) => (
            <CommandItem
              key={a.id}
              value={`appointment ${a.clientName}`}
              onSelect={() => go("/appointments")}
            >
              {a.clientName}
              <span className="ml-auto text-xs text-muted-foreground">{dateTime(a.start)}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
