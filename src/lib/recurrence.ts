export type Weekday = "SU" | "MO" | "TU" | "WE" | "TH" | "FR" | "SA";

export type Freq = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export type EndCondition = "never" | "on-date" | "after-n";

export type Rule = {
  startDate: string;
  freq: Freq;
  interval: number;
  byDay?: Weekday[];
  byMonthDay?: number;
  bySetPos?: number;
  endCondition: EndCondition;
  endDate?: string;
  count?: number;
};

export type Mode = "schedule" | "since-completion";

const WEEKDAY_NAMES: Weekday[] = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const MS_PER_DAY = 86_400_000;
const SAFETY_LIMIT_DAYS = 365 * 100;

export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function addDays(s: string, n: number): string {
  return formatDate(new Date(parseDate(s).getTime() + n * MS_PER_DAY));
}

export function addMonths(s: string, n: number): string {
  const d = parseDate(s);
  const targetMonth = d.getUTCMonth() + n;
  const candidate = new Date(Date.UTC(d.getUTCFullYear(), targetMonth, d.getUTCDate()));
  if (candidate.getUTCDate() !== d.getUTCDate()) {
    return formatDate(new Date(Date.UTC(d.getUTCFullYear(), targetMonth + 1, 0)));
  }
  return formatDate(candidate);
}

export function addYears(s: string, n: number): string {
  const d = parseDate(s);
  const candidate = new Date(Date.UTC(d.getUTCFullYear() + n, d.getUTCMonth(), d.getUTCDate()));
  if (candidate.getUTCDate() !== d.getUTCDate()) {
    return formatDate(new Date(Date.UTC(d.getUTCFullYear() + n, d.getUTCMonth() + 1, 0)));
  }
  return formatDate(candidate);
}

function diffDaysInt(a: string, b: string): number {
  return Math.round((parseDate(a).getTime() - parseDate(b).getTime()) / MS_PER_DAY);
}

function weekdayIndex(s: string): number {
  return parseDate(s).getUTCDay();
}

function matches(rule: Rule, candidate: string): boolean {
  if (candidate < rule.startDate) return false;
  const start = parseDate(rule.startDate);
  const cand = parseDate(candidate);

  if (rule.freq === "DAILY") {
    return diffDaysInt(candidate, rule.startDate) % rule.interval === 0;
  }

  if (rule.freq === "WEEKLY") {
    const startWeekday = start.getUTCDay();
    const candWeekday = cand.getUTCDay();
    const startWeekStart = start.getTime() - startWeekday * MS_PER_DAY;
    const candWeekStart = cand.getTime() - candWeekday * MS_PER_DAY;
    const weeksBetween = Math.round((candWeekStart - startWeekStart) / (7 * MS_PER_DAY));
    if (weeksBetween < 0 || weeksBetween % rule.interval !== 0) return false;
    const byDay = rule.byDay ?? [WEEKDAY_NAMES[startWeekday]];
    return byDay.includes(WEEKDAY_NAMES[candWeekday]);
  }

  if (rule.freq === "MONTHLY") {
    const monthsBetween =
      (cand.getUTCFullYear() - start.getUTCFullYear()) * 12 +
      (cand.getUTCMonth() - start.getUTCMonth());
    if (monthsBetween < 0 || monthsBetween % rule.interval !== 0) return false;

    if (rule.bySetPos != null && rule.byDay != null) {
      const candWeekday = WEEKDAY_NAMES[cand.getUTCDay()];
      if (!rule.byDay.includes(candWeekday)) return false;
      const day = cand.getUTCDate();
      if (rule.bySetPos > 0) {
        return Math.ceil(day / 7) === rule.bySetPos;
      }
      const daysInMonth = new Date(
        Date.UTC(cand.getUTCFullYear(), cand.getUTCMonth() + 1, 0),
      ).getUTCDate();
      return day > daysInMonth - 7;
    }

    const targetDay = rule.byMonthDay ?? start.getUTCDate();
    return cand.getUTCDate() === targetDay;
  }

  if (rule.freq === "YEARLY") {
    const yearsBetween = cand.getUTCFullYear() - start.getUTCFullYear();
    if (yearsBetween < 0 || yearsBetween % rule.interval !== 0) return false;
    return (
      cand.getUTCMonth() === start.getUTCMonth() &&
      cand.getUTCDate() === start.getUTCDate()
    );
  }

  return false;
}

function* iterateOccurrences(rule: Rule): Generator<{ date: string; index: number }> {
  let count = 0;
  let cursor = rule.startDate;
  for (let i = 0; i < SAFETY_LIMIT_DAYS; i++) {
    if (rule.endCondition === "on-date" && rule.endDate && cursor > rule.endDate) return;
    if (matches(rule, cursor)) {
      count++;
      if (rule.endCondition === "after-n" && rule.count && count > rule.count) return;
      yield { date: cursor, index: count };
    }
    cursor = addDays(cursor, 1);
  }
}

export function nextOccurrenceOnOrAfter(rule: Rule, target: string): string | null {
  for (const occ of iterateOccurrences(rule)) {
    if (occ.date >= target) return occ.date;
  }
  return null;
}

export function occurrencesIn(rule: Rule, from: string, to: string): string[] {
  const result: string[] = [];
  for (const occ of iterateOccurrences(rule)) {
    if (occ.date > to) break;
    if (occ.date >= from) result.push(occ.date);
  }
  return result;
}

function addInterval(date: string, freq: Freq, interval: number): string {
  if (freq === "DAILY") return addDays(date, interval);
  if (freq === "WEEKLY") return addDays(date, 7 * interval);
  if (freq === "MONTHLY") return addMonths(date, interval);
  return addYears(date, interval);
}

export function outstandingFor(
  rule: Rule,
  mode: Mode,
  completionDates: readonly string[],
  today: string,
): string | null {
  if (mode === "since-completion" && completionDates.length > 0) {
    const last = completionDates.reduce((a, b) => (a > b ? a : b));
    let candidate = addInterval(last, rule.freq, rule.interval);
    let safety = 0;
    while (candidate < today && safety++ < SAFETY_LIMIT_DAYS) {
      candidate = addInterval(candidate, rule.freq, rule.interval);
    }
    if (rule.endCondition === "on-date" && rule.endDate && candidate > rule.endDate) return null;
    return candidate;
  }
  return nextOccurrenceOnOrAfter(rule, today);
}
