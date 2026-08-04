import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { durationPriceDraftsAreValid, type DurationPriceDraft } from "@/lib/service-pricing";

export function ServiceDurationPrices({
  value,
  onChange,
}: {
  value: DurationPriceDraft[];
  onChange: (value: DurationPriceDraft[]) => void;
}) {
  const update = (index: number, patch: Partial<DurationPriceDraft>) =>
    onChange(value.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));

  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="flex items-center justify-between">
        <div>
          <Label>Durations and prices</Label>
          <p className="text-xs text-muted-foreground">
            Add every bookable treatment length and its price.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...value, { duration: "", price: "" }])}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add duration
        </Button>
      </div>
      <div className="space-y-2">
        {value.map((row, index) => (
          <div
            key={index}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2rem] items-end gap-2 rounded-lg border border-border bg-muted/20 p-3"
          >
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor={`service-duration-${index}`}>
                Duration
              </Label>
              <div className="relative">
                <Input
                  id={`service-duration-${index}`}
                  className="pr-12"
                  type="number"
                  min="1"
                  step="5"
                  placeholder="60"
                  value={row.duration}
                  onChange={(event) => update(index, { duration: event.target.value })}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                  min
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor={`service-duration-price-${index}`}>
                Price
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id={`service-duration-price-${index}`}
                  className="pl-7"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="95"
                  value={row.price}
                  onChange={(event) => update(index, { price: event.target.value })}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              disabled={value.length === 1}
              aria-label={`Remove duration ${index + 1}`}
              onClick={() => onChange(value.filter((_, rowIndex) => rowIndex !== index))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      {!durationPriceDraftsAreValid(value) ? (
        <p className="text-xs text-destructive">
          Each duration needs a unique positive length and a price of $0 or more.
        </p>
      ) : null}
    </div>
  );
}
