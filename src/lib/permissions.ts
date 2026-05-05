import { schema as s } from "jazz-tools";
import { app } from "./schema";

export default s.definePermissions(app, ({ policy, session, anyOf, isCreator }) => {
  // Calendars: creator manages; any member can read.
  policy.calendars.allowRead.where((row) =>
    anyOf([
      isCreator,
      policy.calendar_members.exists.where({
        calendarId: row.id,
        userId: session.user_id,
      }),
    ])
  );
  policy.calendars.allowInsert.where(isCreator);
  policy.calendars.allowUpdate.where(isCreator);
  policy.calendars.allowDelete.where(isCreator);

  // Members: open read so exists() lookups in other policies can resolve.
  // Insert is open (joining via invite link); each user owns their own row.
  policy.calendar_members.allowRead.always();
  policy.calendar_members.allowInsert.where({ userId: session.user_id });
  policy.calendar_members.allowUpdate.never();
  policy.calendar_members.allowDelete.where({ userId: session.user_id });

  // Todos / events / series: creators retain access to their own rows;
  // members of the row's calendar OR the calendar's creator can act on it.
  // The parent-creator branch is a self-healing fallback when calendar_members
  // rows are missing or not yet synced.
  policy.todos.allowRead.where((row) =>
    anyOf([
      isCreator,
      policy.calendar_members.exists.where({ calendarId: row.calendarId, userId: session.user_id }),
      policy.calendars.exists.where({ id: row.calendarId, $createdBy: session.user_id }),
    ])
  );
  policy.todos.allowInsert.where((row) =>
    anyOf([
      policy.calendar_members.exists.where({ calendarId: row.calendarId, userId: session.user_id }),
      policy.calendars.exists.where({ id: row.calendarId, $createdBy: session.user_id }),
    ])
  );
  policy.todos.allowUpdate.where((row) =>
    anyOf([
      isCreator,
      policy.calendar_members.exists.where({ calendarId: row.calendarId, userId: session.user_id }),
      policy.calendars.exists.where({ id: row.calendarId, $createdBy: session.user_id }),
    ])
  );
  policy.todos.allowDelete.where((row) =>
    anyOf([
      isCreator,
      policy.calendar_members.exists.where({ calendarId: row.calendarId, userId: session.user_id }),
      policy.calendars.exists.where({ id: row.calendarId, $createdBy: session.user_id }),
    ])
  );

  policy.events.allowRead.where((row) =>
    anyOf([
      isCreator,
      policy.calendar_members.exists.where({ calendarId: row.calendarId, userId: session.user_id }),
      policy.calendars.exists.where({ id: row.calendarId, $createdBy: session.user_id }),
    ])
  );
  policy.events.allowInsert.where((row) =>
    anyOf([
      policy.calendar_members.exists.where({ calendarId: row.calendarId, userId: session.user_id }),
      policy.calendars.exists.where({ id: row.calendarId, $createdBy: session.user_id }),
    ])
  );
  policy.events.allowUpdate.where((row) =>
    anyOf([
      isCreator,
      policy.calendar_members.exists.where({ calendarId: row.calendarId, userId: session.user_id }),
      policy.calendars.exists.where({ id: row.calendarId, $createdBy: session.user_id }),
    ])
  );
  policy.events.allowDelete.where((row) =>
    anyOf([
      isCreator,
      policy.calendar_members.exists.where({ calendarId: row.calendarId, userId: session.user_id }),
      policy.calendars.exists.where({ id: row.calendarId, $createdBy: session.user_id }),
    ])
  );

  policy.task_series.allowRead.where((row) =>
    anyOf([
      isCreator,
      policy.calendar_members.exists.where({ calendarId: row.calendarId, userId: session.user_id }),
      policy.calendars.exists.where({ id: row.calendarId, $createdBy: session.user_id }),
    ])
  );
  policy.task_series.allowInsert.where((row) =>
    anyOf([
      policy.calendar_members.exists.where({ calendarId: row.calendarId, userId: session.user_id }),
      policy.calendars.exists.where({ id: row.calendarId, $createdBy: session.user_id }),
    ])
  );
  policy.task_series.allowUpdate.where((row) =>
    anyOf([
      isCreator,
      policy.calendar_members.exists.where({ calendarId: row.calendarId, userId: session.user_id }),
      policy.calendars.exists.where({ id: row.calendarId, $createdBy: session.user_id }),
    ])
  );
  policy.task_series.allowDelete.where((row) =>
    anyOf([
      isCreator,
      policy.calendar_members.exists.where({ calendarId: row.calendarId, userId: session.user_id }),
      policy.calendars.exists.where({ id: row.calendarId, $createdBy: session.user_id }),
    ])
  );

  policy.event_series.allowRead.where((row) =>
    anyOf([
      isCreator,
      policy.calendar_members.exists.where({ calendarId: row.calendarId, userId: session.user_id }),
      policy.calendars.exists.where({ id: row.calendarId, $createdBy: session.user_id }),
    ])
  );
  policy.event_series.allowInsert.where((row) =>
    anyOf([
      policy.calendar_members.exists.where({ calendarId: row.calendarId, userId: session.user_id }),
      policy.calendars.exists.where({ id: row.calendarId, $createdBy: session.user_id }),
    ])
  );
  policy.event_series.allowUpdate.where((row) =>
    anyOf([
      isCreator,
      policy.calendar_members.exists.where({ calendarId: row.calendarId, userId: session.user_id }),
      policy.calendars.exists.where({ id: row.calendarId, $createdBy: session.user_id }),
    ])
  );
  policy.event_series.allowDelete.where((row) =>
    anyOf([
      isCreator,
      policy.calendar_members.exists.where({ calendarId: row.calendarId, userId: session.user_id }),
      policy.calendars.exists.where({ id: row.calendarId, $createdBy: session.user_id }),
    ])
  );
});
