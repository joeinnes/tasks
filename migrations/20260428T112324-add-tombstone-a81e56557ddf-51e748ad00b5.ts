import { schema as s } from "jazz-tools";

export default s.defineMigration({
  migrate: {
    "events": {
      "tombstone": s.add.boolean({ default: null }),
    },
  },
  fromHash: "a81e56557ddf",
  toHash: "51e748ad00b5",
  from: {
  "events": s.table({
    "title": s.string(),
    "date": s.string(),
    "time": s.string().optional(),
    "calendarId": s.string(),
    "creatorId": s.string(),
    "seriesId": s.string().optional(),
  })
},
  to: {
  "events": s.table({
    "title": s.string(),
    "date": s.string(),
    "time": s.string().optional(),
    "calendarId": s.string(),
    "creatorId": s.string(),
    "seriesId": s.string().optional(),
    "tombstone": s.boolean().optional(),
  })
},
});
