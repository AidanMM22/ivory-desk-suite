import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page";
import { useCrmData } from "@/lib/crm-data";
import type { Location } from "@/lib/types";

export const Route = createFileRoute("/locations")({
  head: () => ({ meta: [{ title: "Locations — M&M Spa CRM" }] }),
  component: LocationsPage,
});

function LocationsPage() {
  const { persistRecord } = useCrmData();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const close = () => {
    setOpen(false);
    setName("");
    setAddress("");
    setPhone("");
  };

  const save = async () => {
    if (!name.trim() || !address.trim()) return;
    const location: Location = {
      id: crypto.randomUUID(),
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      rooms: [],
    };
    setSaving(true);
    try {
      await persistRecord("locations", location, location.id);
      toast.success("Location added");
      close();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not add the location.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeader
        title="Locations"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add location
          </Button>
        }
      />

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (saving) return;
          if (nextOpen) setOpen(true);
          else close();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add location</DialogTitle>
            <DialogDescription>Create a location for this CRM workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Location name" htmlFor="location-name">
              <Input
                id="location-name"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field label="Address" htmlFor="location-address">
              <Input
                id="location-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
              />
            </Field>
            <Field label="Phone (optional)" htmlFor="location-phone">
              <Input
                id="location-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" disabled={saving} onClick={close}>
              Cancel
            </Button>
            <Button
              disabled={saving || !name.trim() || !address.trim()}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Save location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
