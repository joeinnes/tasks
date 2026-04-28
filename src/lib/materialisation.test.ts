import { describe, it, expect } from "vitest";
import {
  type EventSeriesData,
  type TaskSeriesData,
  type TaskRowData,
  virtualEventsForDay,
  virtualTasksForDay,
  eventOccursOn,
} from "./materialisation";
import type { Rule } from "./recurrence";

const baseRule = (overrides: Partial<Rule>): Rule => ({
  startDate: "2026-01-01",
  freq: "DAILY",
  interval: 1,
  endCondition: "never",
  ...overrides,
});

const eventSeries = (id: string, rule: Rule, overrides: Partial<EventSeriesData> = {}): EventSeriesData => ({
  id,
  title: `Series ${id}`,
  calendarId: "cal-1",
  creatorId: "user-1",
  rule,
  ...overrides,
});

const taskSeries = (id: string, rule: Rule, overrides: Partial<TaskSeriesData> = {}): TaskSeriesData => ({
  id,
  title: `Task ${id}`,
  calendarId: "cal-1",
  creatorId: "user-1",
  rule,
  mode: "schedule",
  ...overrides,
});

describe("eventOccursOn", () => {
  it("daily rule fires every day", () => {
    expect(eventOccursOn(baseRule({ freq: "DAILY" }), "2026-01-15")).toBe(true);
  });

  it("weekly rule on Mon/Wed/Fri only fires on those days", () => {
    const rule = baseRule({
      startDate: "2026-01-05",
      freq: "WEEKLY",
      interval: 1,
      byDay: ["MO", "WE", "FR"],
    });
    expect(eventOccursOn(rule, "2026-01-05")).toBe(true);
    expect(eventOccursOn(rule, "2026-01-06")).toBe(false);
    expect(eventOccursOn(rule, "2026-01-07")).toBe(true);
  });

  it("does not fire before startDate", () => {
    const rule = baseRule({ startDate: "2026-06-01" });
    expect(eventOccursOn(rule, "2026-05-30")).toBe(false);
  });
});

describe("virtualEventsForDay", () => {
  it("returns one virtual occurrence per series fired on the day", () => {
    const a = eventSeries("a", baseRule({ freq: "DAILY" }));
    const b = eventSeries("b", baseRule({ freq: "WEEKLY", startDate: "2026-01-07", byDay: ["WE"] }));
    const result = virtualEventsForDay("2026-01-07", [a, b], []);
    expect(result.map(r => r.seriesId).sort()).toEqual(["a", "b"]);
  });

  it("suppresses a virtual occurrence when a real override exists for that date+series", () => {
    const a = eventSeries("a", baseRule({ freq: "DAILY" }));
    const realOverride = { id: "r1", date: "2026-01-15", seriesId: "a" };
    const result = virtualEventsForDay("2026-01-15", [a], [realOverride]);
    expect(result).toEqual([]);
  });

  it("real rows for unrelated series do not suppress", () => {
    const a = eventSeries("a", baseRule({ freq: "DAILY" }));
    const otherReal = { id: "r1", date: "2026-01-15", seriesId: "b" };
    const result = virtualEventsForDay("2026-01-15", [a], [otherReal]);
    expect(result).toHaveLength(1);
  });
});

describe("virtualTasksForDay", () => {
  const todayRule = baseRule({ startDate: "2026-01-01", freq: "DAILY", interval: 3 });
  // Outstanding for never-completed: nextOccurrenceOnOrAfter(today)

  it("returns the outstanding for never-completed series on the right day", () => {
    const s = taskSeries("a", todayRule);
    const result = virtualTasksForDay("2026-01-04", "2026-01-04", [s], []);
    expect(result).toHaveLength(1);
    expect(result[0].seriesId).toBe("a");
  });

  it("returns nothing on days that aren't the outstanding day", () => {
    const s = taskSeries("a", todayRule);
    const result = virtualTasksForDay("2026-01-05", "2026-01-04", [s], []);
    expect(result).toEqual([]);
  });

  it("suppresses the virtual when a real pending row exists for the series", () => {
    const s = taskSeries("a", todayRule);
    const pending: TaskRowData = { id: "r1", date: "2026-01-04", done: false, seriesId: "a" };
    const result = virtualTasksForDay("2026-01-04", "2026-01-04", [s], [pending]);
    expect(result).toEqual([]);
  });

  it("does not suppress when pending row is for a different series", () => {
    const s = taskSeries("a", todayRule);
    const otherPending: TaskRowData = { id: "r1", date: "2026-01-04", done: false, seriesId: "b" };
    const result = virtualTasksForDay("2026-01-04", "2026-01-04", [s], [otherPending]);
    expect(result).toHaveLength(1);
  });

  it("computes outstanding from completion history (since-completion mode)", () => {
    const s = taskSeries("a", todayRule, { mode: "since-completion" });
    const completed: TaskRowData = {
      id: "r1",
      date: "2026-01-10",
      done: true,
      seriesId: "a",
    };
    // last completion = 2026-01-10, interval = 3 days → outstanding = 2026-01-13
    const result = virtualTasksForDay("2026-01-13", "2026-01-12", [s], [completed]);
    expect(result).toHaveLength(1);
  });

  it("schedule mode ignores completions for placement (but completions still count as 'no pending')", () => {
    const s = taskSeries("a", todayRule, { mode: "schedule" });
    const completed: TaskRowData = {
      id: "r1",
      date: "2026-01-04",
      done: true,
      seriesId: "a",
    };
    // After completing 2026-01-04, schedule mode → next is the next scheduled day after today on the rule
    // today=2026-01-05, rule=daily/3 from start=2026-01-01: next ≥ today is 2026-01-07
    const result = virtualTasksForDay("2026-01-07", "2026-01-05", [s], [completed]);
    expect(result).toHaveLength(1);
  });
});
