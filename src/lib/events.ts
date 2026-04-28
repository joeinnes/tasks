export type Event = {
  id: string;
  title: string;
  date: string;
  time?: string | null;
  calendarId: string;
  creatorId: string;
};

export function eventsForDay(
  events: readonly Event[],
  date: string,
  visibleCalendarIds: ReadonlySet<string>
): Event[] {
  return events
    .filter(e => e.date === date && visibleCalendarIds.has(e.calendarId))
    .sort((a, b) => {
      const aTime = a.time ?? "";
      const bTime = b.time ?? "";
      if (!aTime !== !bTime) return aTime ? 1 : -1;
      if (aTime !== bTime) return aTime < bTime ? -1 : 1;
      return a.title.localeCompare(b.title);
    });
}
