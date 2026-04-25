import { schema as s } from "jazz-tools";
import { app } from "./schema";

export default s.definePermissions(app, ({ policy, session, anyOf, isCreator }) => {
  // Calendars: creator manages; any member can read
  policy.calendars.allowRead.where((row) =>
    anyOf([
      isCreator,
      policy.calendar_members.exists.where({
        calendarId: row.id,
        userId: session.user_id,
      }),
    ])
  );
  policy.calendars.allowInsert.always();
  policy.calendars.allowUpdate.where(isCreator);
  policy.calendars.allowDelete.where(isCreator);

  // Members: open insert (joining via link), each user owns their own row
  policy.calendar_members.allowRead.where({ userId: session.user_id });
  policy.calendar_members.allowInsert.always();
  policy.calendar_members.allowUpdate.never();
  policy.calendar_members.allowDelete.where({ userId: session.user_id });

  // Todos: only accessible to members of the todo's calendar
  policy.todos.allowRead.where((row) =>
    policy.calendar_members.exists.where({
      calendarId: row.calendarId,
      userId: session.user_id,
    })
  );
  policy.todos.allowInsert.where((row) =>
    policy.calendar_members.exists.where({
      calendarId: row.calendarId,
      userId: session.user_id,
    })
  );
  policy.todos.allowUpdate.where((row) =>
    policy.calendar_members.exists.where({
      calendarId: row.calendarId,
      userId: session.user_id,
    })
  );
  policy.todos.allowDelete.where((row) =>
    policy.calendar_members.exists.where({
      calendarId: row.calendarId,
      userId: session.user_id,
    })
  );
});
