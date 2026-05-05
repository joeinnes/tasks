import { schema as s } from "jazz-tools";
import { app } from "./schema";

export default s.definePermissions(app, ({ policy, session, anyOf, isCreator }) => {
  // Calendars: creator manages; any member can read.
  // isCreator is a protocol-level fallback for rows created before the
  // creatorId column was added — column-based checks fail with
  // "missing row content" on those rows.
  policy.calendars.allowRead.where((row) =>
    anyOf([
      isCreator,
      { creatorId: session.user_id },
      policy.calendar_members.exists.where({
        calendarId: row.id,
        userId: session.user_id,
      }),
    ])
  );
  policy.calendars.allowInsert.where({ creatorId: session.user_id });
  policy.calendars.allowUpdate.where(anyOf([isCreator, { creatorId: session.user_id }]));
  policy.calendars.allowDelete.where(anyOf([isCreator, { creatorId: session.user_id }]));

  // Members: open read so exists() lookups can resolve in other policies.
  // Insert is open (joining via invite link); each user owns their own row.
  policy.calendar_members.allowRead.always();
  policy.calendar_members.allowInsert.where({ userId: session.user_id });
  policy.calendar_members.allowUpdate.never();
  policy.calendar_members.allowDelete.where({ userId: session.user_id });

  // Todos: creator-managed, with members of the calendar as a fallback path
  policy.todos.allowRead.where((row) =>
    anyOf([
      isCreator,
      { creatorId: session.user_id },
      policy.calendar_members.exists.where({
        calendarId: row.calendarId,
        userId: session.user_id,
      }),
    ])
  );
  policy.todos.allowInsert.where((row) =>
    policy.calendar_members.exists.where({
      calendarId: row.calendarId,
      userId: session.user_id,
    })
  );
  policy.todos.allowUpdate.where((row) =>
    anyOf([
      isCreator,
      { creatorId: session.user_id },
      policy.calendar_members.exists.where({
        calendarId: row.calendarId,
        userId: session.user_id,
      }),
    ])
  );
  policy.todos.allowDelete.where((row) =>
    anyOf([
      isCreator,
      { creatorId: session.user_id },
      policy.calendar_members.exists.where({
        calendarId: row.calendarId,
        userId: session.user_id,
      }),
    ])
  );

  // Events: same shape as todos
  policy.events.allowRead.where((row) =>
    anyOf([
      isCreator,
      { creatorId: session.user_id },
      policy.calendar_members.exists.where({
        calendarId: row.calendarId,
        userId: session.user_id,
      }),
    ])
  );
  policy.events.allowInsert.where((row) =>
    policy.calendar_members.exists.where({
      calendarId: row.calendarId,
      userId: session.user_id,
    })
  );
  policy.events.allowUpdate.where((row) =>
    anyOf([
      isCreator,
      { creatorId: session.user_id },
      policy.calendar_members.exists.where({
        calendarId: row.calendarId,
        userId: session.user_id,
      }),
    ])
  );
  policy.events.allowDelete.where((row) =>
    anyOf([
      isCreator,
      { creatorId: session.user_id },
      policy.calendar_members.exists.where({
        calendarId: row.calendarId,
        userId: session.user_id,
      }),
    ])
  );

  // Task series
  policy.task_series.allowRead.where((row) =>
    anyOf([
      isCreator,
      { creatorId: session.user_id },
      policy.calendar_members.exists.where({
        calendarId: row.calendarId,
        userId: session.user_id,
      }),
    ])
  );
  policy.task_series.allowInsert.where((row) =>
    policy.calendar_members.exists.where({
      calendarId: row.calendarId,
      userId: session.user_id,
    })
  );
  policy.task_series.allowUpdate.where((row) =>
    anyOf([
      isCreator,
      { creatorId: session.user_id },
      policy.calendar_members.exists.where({
        calendarId: row.calendarId,
        userId: session.user_id,
      }),
    ])
  );
  policy.task_series.allowDelete.where((row) =>
    anyOf([
      isCreator,
      { creatorId: session.user_id },
      policy.calendar_members.exists.where({
        calendarId: row.calendarId,
        userId: session.user_id,
      }),
    ])
  );

  // Event series
  policy.event_series.allowRead.where((row) =>
    anyOf([
      isCreator,
      { creatorId: session.user_id },
      policy.calendar_members.exists.where({
        calendarId: row.calendarId,
        userId: session.user_id,
      }),
    ])
  );
  policy.event_series.allowInsert.where((row) =>
    policy.calendar_members.exists.where({
      calendarId: row.calendarId,
      userId: session.user_id,
    })
  );
  policy.event_series.allowUpdate.where((row) =>
    anyOf([
      isCreator,
      { creatorId: session.user_id },
      policy.calendar_members.exists.where({
        calendarId: row.calendarId,
        userId: session.user_id,
      }),
    ])
  );
  policy.event_series.allowDelete.where((row) =>
    anyOf([
      isCreator,
      { creatorId: session.user_id },
      policy.calendar_members.exists.where({
        calendarId: row.calendarId,
        userId: session.user_id,
      }),
    ])
  );
});
