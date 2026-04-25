import { schema as s } from "jazz-tools";

export default s.defineMigration({
  createTables: {
    "calendar_members": true,
    "calendars": true,
  },
  migrate: {
    "todos": {
      "calendarId": s.add.string({ default: null }),
      "creatorId": s.add.string({ default: null }),
      "position": s.add.int({ default: null }),
    },
  },
  fromHash: "eef4228f76e2",
  toHash: "84ef68fbf851",
  from: {
  "todos": s.table({
    "title": s.string(),
    "done": s.boolean(),
    "date": s.string(),
  })
},
  to: {
  "calendar_members": s.table({
    "calendarId": s.string(),
    "userId": s.string(),
  }),
  "calendars": s.table({
    "name": s.string(),
    "colour": s.string(),
    "creatorId": s.string(),
    "isPersonal": s.boolean(),
  }),
  "todos": s.table({
    "title": s.string(),
    "done": s.boolean(),
    "date": s.string(),
    "calendarId": s.string().optional(),
    "creatorId": s.string().optional(),
    "position": s.int().optional(),
  })
},
});
