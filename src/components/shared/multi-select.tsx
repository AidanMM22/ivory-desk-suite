import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MultiSelectDropdown({
  label,
  options,
  value,
  onChange,
  placeholder = "Select options",
}: {
  label: string;
  options: { id: string; label: string; detail?: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}) {
  const selected = new Set(value);
  const summary =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? (options.find((option) => option.id === value[0])?.label ?? "1 selected")
        : `${value.length} selected`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between font-normal">
          <span className={value.length === 0 ? "text-muted-foreground" : ""}>{summary}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-72 w-72 overflow-y-auto" align="start">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        {options.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">No options have been added yet.</p>
        ) : (
          options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.id}
              checked={selected.has(option.id)}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(checked) =>
                onChange(
                  checked
                    ? Array.from(new Set([...value, option.id]))
                    : value.filter((id) => id !== option.id),
                )
              }
            >
              <span className="min-w-0">
                <span className="block truncate">{option.label}</span>
                {option.detail ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {option.detail}
                  </span>
                ) : null}
              </span>
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
