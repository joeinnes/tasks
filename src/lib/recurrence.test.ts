import { describe, it, expect } from "vitest";
import {
  type Rule,
  nextOccurrenceOnOrAfter,
  occurrencesIn,
  outstandingFor,
  addDays,
  addMonths,
  addYears,
} from "./recurrence";

const baseRule = (overrides: Partial<Rule>): Rule => ({
  startDate: "2026-01-01",
  freq: "DAILY",
  interval: 1,
  endCondition: "never",
  ...overrides,
});

describe("date helpers", () => {
  it("addDays handles month boundaries", () => {
    expect(addDays("2026-01-30", 5)).toBe("2026-02-04");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29"); // leap year
  });

  it("addMonths clamps when target month has fewer days", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29"); // leap year
    expect(addMonths("2026-01-15", 2)).toBe("2026-03-15");
  });

  it("addYears clamps Feb 29 to Feb 28 in non-leap years", () => {
    expect(addYears("2024-02-29", 1)).toBe("2025-02-28");
    expect(addYears("2024-02-29", 4)).toBe("2028-02-29");
  });
});

describe("nextOccurrenceOnOrAfter — DAILY", () => {
  it("interval=1 returns the target itself if on or after start", () => {
    const rule = baseRule({ startDate: "2026-01-01", freq: "DAILY", interval: 1 });
    expect(nextOccurrenceOnOrAfter(rule, "2026-01-15")).toBe("2026-01-15");
  });

  it("interval=3 finds the next aligned day", () => {
    const rule = baseRule({ startDate: "2026-01-01", freq: "DAILY", interval: 3 });
    expect(nextOccurrenceOnOrAfter(rule, "2026-01-02")).toBe("2026-01-04");
    expect(nextOccurrenceOnOrAfter(rule, "2026-01-04")).toBe("2026-01-04");
    expect(nextOccurrenceOnOrAfter(rule, "2026-01-05")).toBe("2026-01-07");
  });

  it("returns startDate if target is before start", () => {
    const rule = baseRule({ startDate: "2026-06-01", freq: "DAILY", interval: 1 });
    expect(nextOccurrenceOnOrAfter(rule, "2026-01-01")).toBe("2026-06-01");
  });
});

describe("nextOccurrenceOnOrAfter — WEEKLY", () => {
  it("byDay Mon/Wed/Fri starting Tuesday picks the next listed weekday", () => {
    // 2026-01-06 is a Tuesday
    const rule = baseRule({
      startDate: "2026-01-06",
      freq: "WEEKLY",
      interval: 1,
      byDay: ["MO", "WE", "FR"],
    });
    expect(nextOccurrenceOnOrAfter(rule, "2026-01-06")).toBe("2026-01-07"); // Wed
    expect(nextOccurrenceOnOrAfter(rule, "2026-01-08")).toBe("2026-01-09"); // Fri
    expect(nextOccurrenceOnOrAfter(rule, "2026-01-10")).toBe("2026-01-12"); // Mon
  });

  it("interval=2 with byDay skips alternate weeks", () => {
    // 2026-01-05 is a Monday
    const rule = baseRule({
      startDate: "2026-01-05",
      freq: "WEEKLY",
      interval: 2,
      byDay: ["MO"],
    });
    expect(nextOccurrenceOnOrAfter(rule, "2026-01-05")).toBe("2026-01-05");
    expect(nextOccurrenceOnOrAfter(rule, "2026-01-06")).toBe("2026-01-19");
  });

  it("defaults byDay to startDate's weekday when omitted", () => {
    // 2026-01-06 is a Tuesday
    const rule = baseRule({ startDate: "2026-01-06", freq: "WEEKLY", interval: 1 });
    expect(nextOccurrenceOnOrAfter(rule, "2026-01-07")).toBe("2026-01-13"); // next Tue
  });
});

describe("nextOccurrenceOnOrAfter — MONTHLY", () => {
  it("byMonthDay=15 with no startDate match jumps to next valid month", () => {
    const rule = baseRule({
      startDate: "2026-01-01",
      freq: "MONTHLY",
      interval: 1,
      byMonthDay: 15,
    });
    expect(nextOccurrenceOnOrAfter(rule, "2026-01-01")).toBe("2026-01-15");
    expect(nextOccurrenceOnOrAfter(rule, "2026-01-16")).toBe("2026-02-15");
  });

  it("monthly on the 31st skips months that don't have 31 days", () => {
    const rule = baseRule({
      startDate: "2026-01-31",
      freq: "MONTHLY",
      interval: 1,
      byMonthDay: 31,
    });
    expect(nextOccurrenceOnOrAfter(rule, "2026-02-01")).toBe("2026-03-31");
  });

  it("third Tuesday of every month (bySetPos=3, byDay=TU)", () => {
    const rule = baseRule({
      startDate: "2026-01-01",
      freq: "MONTHLY",
      interval: 1,
      byDay: ["TU"],
      bySetPos: 3,
    });
    expect(nextOccurrenceOnOrAfter(rule, "2026-01-01")).toBe("2026-01-20");
    expect(nextOccurrenceOnOrAfter(rule, "2026-02-01")).toBe("2026-02-17");
  });

  it("last Friday of every month (bySetPos=-1, byDay=FR)", () => {
    const rule = baseRule({
      startDate: "2026-01-01",
      freq: "MONTHLY",
      interval: 1,
      byDay: ["FR"],
      bySetPos: -1,
    });
    expect(nextOccurrenceOnOrAfter(rule, "2026-01-01")).toBe("2026-01-30");
    expect(nextOccurrenceOnOrAfter(rule, "2026-02-01")).toBe("2026-02-27");
  });
});

describe("nextOccurrenceOnOrAfter — YEARLY", () => {
  it("interval=1 picks same date next year", () => {
    const rule = baseRule({ startDate: "2026-04-28", freq: "YEARLY", interval: 1 });
    expect(nextOccurrenceOnOrAfter(rule, "2026-04-28")).toBe("2026-04-28");
    expect(nextOccurrenceOnOrAfter(rule, "2026-04-29")).toBe("2027-04-28");
  });

  it("yearly Feb 29 only fires in leap years", () => {
    const rule = baseRule({ startDate: "2024-02-29", freq: "YEARLY", interval: 1 });
    expect(nextOccurrenceOnOrAfter(rule, "2025-01-01")).toBe("2028-02-29");
  });
});

describe("end conditions", () => {
  it("on-date stops the series after endDate", () => {
    const rule = baseRule({
      startDate: "2026-01-01",
      freq: "DAILY",
      interval: 1,
      endCondition: "on-date",
      endDate: "2026-01-05",
    });
    expect(nextOccurrenceOnOrAfter(rule, "2026-01-04")).toBe("2026-01-04");
    expect(nextOccurrenceOnOrAfter(rule, "2026-01-06")).toBe(null);
  });

  it("after-n stops after the Nth occurrence", () => {
    const rule = baseRule({
      startDate: "2026-01-01",
      freq: "DAILY",
      interval: 2,
      endCondition: "after-n",
      count: 3,
    });
    expect(occurrencesIn(rule, "2026-01-01", "2026-12-31")).toEqual([
      "2026-01-01",
      "2026-01-03",
      "2026-01-05",
    ]);
  });
});

describe("occurrencesIn", () => {
  it("returns all dates in range that match the rule", () => {
    const rule = baseRule({
      startDate: "2026-01-05",
      freq: "WEEKLY",
      interval: 1,
      byDay: ["MO", "WE", "FR"],
    });
    expect(occurrencesIn(rule, "2026-01-05", "2026-01-16")).toEqual([
      "2026-01-05",
      "2026-01-07",
      "2026-01-09",
      "2026-01-12",
      "2026-01-14",
      "2026-01-16",
    ]);
  });
});

describe("outstandingFor", () => {
  it("schedule mode never-completed returns nextOccurrenceOnOrAfter today", () => {
    const rule = baseRule({ startDate: "2026-01-01", freq: "DAILY", interval: 3 });
    expect(outstandingFor(rule, "schedule", [], "2026-01-04")).toBe("2026-01-04");
    expect(outstandingFor(rule, "schedule", [], "2026-01-05")).toBe("2026-01-07");
  });

  it("since-completion mode never-completed behaves like schedule", () => {
    const rule = baseRule({ startDate: "2026-01-01", freq: "DAILY", interval: 3 });
    expect(outstandingFor(rule, "since-completion", [], "2026-01-04")).toBe("2026-01-04");
  });

  it("since-completion mode returns last + interval if that's >= today", () => {
    const rule = baseRule({ startDate: "2026-01-01", freq: "DAILY", interval: 3 });
    expect(outstandingFor(rule, "since-completion", ["2026-01-10"], "2026-01-11")).toBe(
      "2026-01-13",
    );
  });

  it("since-completion mode advances past missed occurrences without duplicating", () => {
    const rule = baseRule({ startDate: "2026-01-01", freq: "DAILY", interval: 3 });
    expect(
      outstandingFor(rule, "since-completion", ["2026-01-01"], "2026-01-15"),
    ).toBe("2026-01-16");
  });

  it("since-completion mode uses weekly interval correctly", () => {
    const rule = baseRule({ startDate: "2026-01-05", freq: "WEEKLY", interval: 1 });
    expect(
      outstandingFor(rule, "since-completion", ["2026-01-05"], "2026-01-06"),
    ).toBe("2026-01-12");
  });

  it("schedule mode after a completion still anchors on start", () => {
    const rule = baseRule({ startDate: "2026-01-01", freq: "DAILY", interval: 3 });
    // Completed on 2026-01-04 (which isn't even a scheduled day); next scheduled day after today=01-05 is 01-07
    expect(outstandingFor(rule, "schedule", ["2026-01-04"], "2026-01-05")).toBe(
      "2026-01-07",
    );
  });

  it("returns null when end condition has been reached", () => {
    const rule = baseRule({
      startDate: "2026-01-01",
      freq: "DAILY",
      interval: 1,
      endCondition: "on-date",
      endDate: "2026-01-03",
    });
    expect(outstandingFor(rule, "schedule", [], "2026-01-05")).toBe(null);
  });
});
