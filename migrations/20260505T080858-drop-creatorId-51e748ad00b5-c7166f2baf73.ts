import { schema as s } from "jazz-tools";

export default s.defineMigration({
  migrate: {
    "calendars": {
      "creatorId": s.drop.string({ backwardsDefault: "" }),
    },

    "events": {
      "creatorId": s.drop.string({ backwardsDefault: "" }),
    },

    "event_series": {
      "creatorId": s.drop.string({ backwardsDefault: "" }),
    },

    "todos": {
      "creatorId": s.drop.string({ backwardsDefault: null }),
    },

    "task_series": {
      "creatorId": s.drop.string({ backwardsDefault: "" }),
    },
  },
  fromHash: "51e748ad00b5",
  toHash: "c7166f2baf73",
  from: {
  "calendars": s.table({
    "name": s.string(),
    "colour": s.string(),
    "creatorId": s.string(),
    "isPersonal": s.boolean(),
  }),
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
  to: {
  "calendars": s.table({
    "name": s.string(),
    "colour": s.string(),
    "isPersonal": s.boolean(),
  }),
  "event_series": s.table({
    "title": s.string(),
    "calendarId": s.string(),
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
    "seriesId": s.string().optional(),
    "tombstone": s.boolean().optional(),
  }),
  "task_series": s.table({
    "title": s.string(),
    "calendarId": s.string(),
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
    "position": s.int().optional(),
    "seriesId": s.string().optional(),
  })
},
});
