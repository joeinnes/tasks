import { schema as s } from "jazz-tools";

const schema = {
  calendars: s.table({
    name: s.string(),
    colour: s.string(),
    creatorId: s.string(),
    isPersonal: s.boolean(),
  }),
  calendar_members: s.table({
    calendarId: s.string(),
    userId: s.string(),
  }),
  todos: s.table({
    title: s.string(),
    done: s.boolean(),
    date: s.string(),
    calendarId: s.string().optional(),
    creatorId: s.string().optional(),
    position: s.int().optional(),
    seriesId: s.string().optional(),
  }),
  events: s.table({
    title: s.string(),
    date: s.string(),
    time: s.string().optional(),
    calendarId: s.string(),
    creatorId: s.string(),
    seriesId: s.string().optional(),
    tombstone: s.boolean().optional(),
  }),
  task_series: s.table({
    title: s.string(),
    calendarId: s.string(),
    creatorId: s.string(),
    startDate: s.string(),
    freq: s.string(),
    interval: s.int(),
    byDay: s.string().optional(),
    byMonthDay: s.int().optional(),
    bySetPos: s.int().optional(),
    endCondition: s.string(),
    endDate: s.string().optional(),
    count: s.int().optional(),
    mode: s.string(),
  }),
  event_series: s.table({
    title: s.string(),
    calendarId: s.string(),
    creatorId: s.string(),
    time: s.string().optional(),
    startDate: s.string(),
    freq: s.string(),
    interval: s.int(),
    byDay: s.string().optional(),
    byMonthDay: s.int().optional(),
    bySetPos: s.int().optional(),
    endCondition: s.string(),
    endDate: s.string().optional(),
    count: s.int().optional(),
  }),
};

type AppSchema = s.Schema<typeof schema>;
export const app: s.App<AppSchema> = s.defineApp(schema);
