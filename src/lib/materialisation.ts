import {
  type Rule,
  type Mode,
  nextOccurrenceOnOrAfter,
  outstandingFor,
} from "./recurrence";

export type TaskSeriesData = {
  id: string;
  title: string;
  calendarId: string;
  creatorId: string;
  rule: Rule;
  mode: Mode;
};

export type EventSeriesData = {
  id: string;
  title: string;
  time?: string | null;
  calendarId: string;
  creatorId: string;
  rule: Rule;
};

export type TaskRowData = {
  id: string;
  date: string;
  done: boolean;
  seriesId?: string | null;
};

export type EventRowData = {
  id: string;
  date: string;
  seriesId?: string | null;
};

export type VirtualTask = {
  isVirtual: true;
  id: string;
  seriesId: string;
  title: string;
  date: string;
  calendarId: string;
  creatorId: string;
};

export type VirtualEvent = {
  isVirtual: true;
  id: string;
  seriesId: string;
  title: string;
  date: string;
  time?: string | null;
  calendarId: string;
  creatorId: string;
};

export function eventOccursOn(rule: Rule, date: string): boolean {
  return nextOccurrenceOnOrAfter(rule, date) === date;
}

export function virtualEventsForDay(
  date: string,
  series: readonly EventSeriesData[],
  realEvents: readonly EventRowData[],
): VirtualEvent[] {
  const result: VirtualEvent[] = [];
  for (const s of series) {
    if (!eventOccursOn(s.rule, date)) continue;
    const overridden = realEvents.some(r => r.seriesId === s.id && r.date === date);
    if (overridden) continue;
    result.push({
      isVirtual: true,
      id: `virtual:${s.id}:${date}`,
      seriesId: s.id,
      title: s.title,
      date,
      time: s.time ?? null,
      calendarId: s.calendarId,
      creatorId: s.creatorId,
    });
  }
  return result;
}

export function virtualTasksForDay(
  date: string,
  today: string,
  series: readonly TaskSeriesData[],
  realRows: readonly TaskRowData[],
): VirtualTask[] {
  const result: VirtualTask[] = [];
  for (const s of series) {
    const seriesRows = realRows.filter(r => r.seriesId === s.id);
    const hasPending = seriesRows.some(r => !r.done);
    if (hasPending) continue;
    const completions = seriesRows.filter(r => r.done).map(r => r.date);
    const outstandingDate = outstandingFor(s.rule, s.mode, completions, today);
    if (outstandingDate !== date) continue;
    result.push({
      isVirtual: true,
      id: `virtual:${s.id}:${date}`,
      seriesId: s.id,
      title: s.title,
      date,
      calendarId: s.calendarId,
      creatorId: s.creatorId,
    });
  }
  return result;
}
