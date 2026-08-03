import { clients } from "./data";

export const availableClientTags = () =>
  Array.from(new Set(["Lead", ...clients.flatMap((client) => client.tags)])).sort((a, b) =>
    a.localeCompare(b),
  );
