export const GAME_SERVERS = ["Lawolf", "Mia", "Glaphan", "Rhisis", "FWC 2025"] as const;

export function calendarDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Recent Saturdays, newest first. Guild siege is a Saturday event. */
export function recentSaturdays(count = 4, from = new Date()): string[] {
  const cursor = new Date(from);
  cursor.setHours(12, 0, 0, 0);
  const daysSinceSaturday = (cursor.getDay() + 1) % 7;
  cursor.setDate(cursor.getDate() - daysSinceSaturday);
  const dates: string[] = [];
  for (let index = 0; index < count; index++) {
    dates.push(calendarDate(cursor));
    cursor.setDate(cursor.getDate() - 7);
  }
  return dates;
}
