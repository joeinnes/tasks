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
  }),
};

type AppSchema = s.Schema<typeof schema>;
export const app: s.App<AppSchema> = s.defineApp(schema);
