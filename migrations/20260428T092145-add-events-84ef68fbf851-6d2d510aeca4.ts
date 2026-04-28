import { schema as s } from "jazz-tools";

export default s.defineMigration({
  createTables: {
    "events": true,
  },
  fromHash: "84ef68fbf851",
  toHash: "6d2d510aeca4",
  from: {},
  to: {
  "events": s.table({
    "title": s.string(),
    "date": s.string(),
    "time": s.string().optional(),
    "calendarId": s.string(),
    "creatorId": s.string(),
  })
},
});
