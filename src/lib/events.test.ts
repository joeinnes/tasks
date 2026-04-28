import { describe, it, expect } from "vitest";
import { eventsForDay, type Event } from "./events";

const personalCalId = "cal-personal";
const workCalId = "cal-work";
const visible = new Set<string>([personalCalId, workCalId]);

function ev(partial: Partial<Event> & { id: string; date: string; title: string }): Event {
  return {
    id: partial.id,
    title: partial.title,
    date: partial.date,
    time: partial.time,
    calendarId: partial.calendarId ?? personalCalId,
    creatorId: partial.creatorId ?? "user-1",
  };
}

describe("eventsForDay", () => {
  it("returns nothing for an empty list", () => {
    expect(eventsForDay([], "2026-05-01", visible)).toEqual([]);
  });

  it("returns only events on the queried date", () => {
    const events = [
      ev({ id: "1", date: "2026-05-01", title: "On day" }),
      ev({ id: "2", date: "2026-05-02", title: "Other day" }),
    ];
    const result = eventsForDay(events, "2026-05-01", visible);
    expect(result.map(e => e.id)).toEqual(["1"]);
  });

  it("filters out events whose calendar is invisible", () => {
    const onlyPersonal = new Set([personalCalId]);
    const events = [
      ev({ id: "1", date: "2026-05-01", title: "Personal", calendarId: personalCalId }),
      ev({ id: "2", date: "2026-05-01", title: "Work", calendarId: workCalId }),
    ];
    const result = eventsForDay(events, "2026-05-01", onlyPersonal);
    expect(result.map(e => e.id)).toEqual(["1"]);
  });

  it("sorts untimed events first, then timed in time order", () => {
    const events = [
      ev({ id: "lunch", date: "2026-05-01", title: "Lunch", time: "12:30" }),
      ev({ id: "birthday", date: "2026-05-01", title: "Birthday" }),
      ev({ id: "standup", date: "2026-05-01", title: "Standup", time: "09:00" }),
    ];
    const result = eventsForDay(events, "2026-05-01", visible);
    expect(result.map(e => e.id)).toEqual(["birthday", "standup", "lunch"]);
  });

  it("breaks ties on time using title", () => {
    const events = [
      ev({ id: "b", date: "2026-05-01", title: "B-event", time: "09:00" }),
      ev({ id: "a", date: "2026-05-01", title: "A-event", time: "09:00" }),
    ];
    const result = eventsForDay(events, "2026-05-01", visible);
    expect(result.map(e => e.id)).toEqual(["a", "b"]);
  });

  it("breaks ties on untimed events using title", () => {
    const events = [
      ev({ id: "b", date: "2026-05-01", title: "Birthday" }),
      ev({ id: "a", date: "2026-05-01", title: "Anniversary" }),
    ];
    const result = eventsForDay(events, "2026-05-01", visible);
    expect(result.map(e => e.id)).toEqual(["a", "b"]);
  });

  it("does not mutate the input list", () => {
    const events = [
      ev({ id: "lunch", date: "2026-05-01", title: "Lunch", time: "12:30" }),
      ev({ id: "standup", date: "2026-05-01", title: "Standup", time: "09:00" }),
    ];
    const before = events.map(e => e.id);
    eventsForDay(events, "2026-05-01", visible);
    expect(events.map(e => e.id)).toEqual(before);
  });
});
