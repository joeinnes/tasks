import { schema as s } from "jazz-tools";

export default s.defineMigration({
  createTables: {
    "event_series": true,
    "events": true,
    "task_series": true,
  },
  migrate: {
    "todos": {
      "seriesId": s.add.string({ default: null }),
    },
  },
  fromHash: "84ef68fbf851",
  toHash: "51e748ad00b5",
  from: {
  "todos": s.table({
    "title": s.string(),
    "done": s.boolean(),
    "date": s.string(),
    "calendarId": s.string().optional(),
    "creatorId": s.string().optional(),
    "position": s.int().optional(),
  })
},
  to: {
  "event_series": s.table({
    "title": s.string(),
    "calendarId": s.string(),
    "creatorId": s.string(),
    "time": s.string().optional(),
    "startDate": s.string(),
    "freq": s.string(),
    "interval": s.int(),
    "byDay": s.string().optional(),
    "byMonthDay": s.int().optional(),
    "bySetPos": s.int().optional(),
    "endCondition": s.string(),
    "endDate": s.string().optional(),
    "count": s.int().optional(),
  }),
  "events": s.table({
    "title": s.string(),
    "date": s.string(),
    "time": s.string().optional(),
    "calendarId": s.string(),
    "creatorId": s.string(),
    "seriesId": s.string().optional(),
    "tombstone": s.boolean().optional(),
  }),
  "task_series": s.table({
    "title": s.string(),
    "calendarId": s.string(),
    "creatorId": s.string(),
    "startDate": s.string(),
    "freq": s.string(),
    "interval": s.int(),
    "byDay": s.string().optional(),
    "byMonthDay": s.int().optional(),
    "bySetPos": s.int().optional(),
    "endCondition": s.string(),
    "endDate": s.string().optional(),
    "count": s.int().optional(),
    "mode": s.string(),
  }),
  "todos": s.table({
    "title": s.string(),
    "done": s.boolean(),
    "date": s.string(),
    "calendarId": s.string().optional(),
    "creatorId": s.string().optional(),
    "position": s.int().optional(),
    "seriesId": s.string().optional(),
  })
},
});
