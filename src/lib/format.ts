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
