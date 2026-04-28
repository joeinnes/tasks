export type Event = {
  id: string;
  title: string;
  date: string;
  time?: string | null;
  calendarId: string;
  creatorId: string;
  seriesId?: string | null;
  tombstone?: boolean | null;
};

export type EventLike = {
  id: string;
  title: string;
  date: string;
  time?: string | null;
  calendarId: string;
};

export function sortEventLikes<T extends EventLike>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const aTime = a.time ?? "";
    const bTime = b.time ?? "";
    if (!aTime !== !bTime) return aTime ? 1 : -1;
    if (aTime !== bTime) return aTime < bTime ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

export function eventsForDay<T extends EventLike>(
  events: readonly T[],
  date: string,
  visibleCalendarIds: ReadonlySet<string>
): T[] {
  return sortEventLikes(
    events.filter(e => e.date === date && visibleCalendarIds.has(e.calendarId))
  );
}
