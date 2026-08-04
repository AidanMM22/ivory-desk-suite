import type { Service, ServiceDurationOption } from "./types";

export interface DurationPriceDraft {
  duration: string;
  price: string;
}

export const emptyDurationPriceDraft = (): DurationPriceDraft => ({
  duration: "60",
  price: "",
});

export const serviceDurationOptions = (service: Service): ServiceDurationOption[] => {
  const configured = (service.durationOptions ?? []).filter(
    (option) =>
      Number.isInteger(option.duration) &&
      option.duration > 0 &&
      Number.isFinite(option.price) &&
      option.price >= 0,
  );

  const options =
    configured.length > 0
      ? configured
      : service.durations.map((duration) => ({ duration, price: service.price }));

  return Array.from(
    new Map(options.map((option) => [option.duration, option] as const)).values(),
  ).sort((a, b) => a.duration - b.duration);
};

export const servicePriceForDuration = (service: Service, duration: number) =>
  serviceDurationOptions(service).find((option) => option.duration === duration)?.price ??
  service.price;

export const durationPriceDraftsForService = (service: Service): DurationPriceDraft[] =>
  serviceDurationOptions(service).map((option) => ({
    duration: String(option.duration),
    price: String(option.price),
  }));

export const durationPriceDraftsAreValid = (drafts: DurationPriceDraft[]) => {
  const durations = drafts.map((draft) => Number(draft.duration));
  return (
    drafts.length > 0 &&
    drafts.every(
      (draft) =>
        Number.isInteger(Number(draft.duration)) &&
        Number(draft.duration) > 0 &&
        draft.price !== "" &&
        Number.isFinite(Number(draft.price)) &&
        Number(draft.price) >= 0,
    ) &&
    new Set(durations).size === durations.length
  );
};

export const durationOptionsFromDrafts = (drafts: DurationPriceDraft[]): ServiceDurationOption[] =>
  drafts
    .map((draft) => ({
      duration: Number(draft.duration),
      price: Number(draft.price),
    }))
    .sort((a, b) => a.duration - b.duration);
