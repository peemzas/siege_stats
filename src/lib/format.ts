export function formatSiegeDate(value: string): string {
  const iso = value.slice(0, 10);
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatInt(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

/** "17 Oct" from a YYYY-MM-DD calendar day. */
export function formatSiegeDay(value: string): string {
  const iso = value.slice(0, 10);
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function formatUploaded(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
