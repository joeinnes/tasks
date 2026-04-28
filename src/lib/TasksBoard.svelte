<script lang="ts">
  import { getDb, getSession, QuerySubscription } from "jazz-tools/svelte";
  import { app } from "$lib/schema";
  import { isVisible, personalCal } from "$lib/calendars.svelte";
  import { eventsForDay, type Event } from "$lib/events";
  import EventModal from "$lib/EventModal.svelte";

  type Calendar = { id: string; name: string; colour: string; creatorId: string; isPersonal: boolean };
  type Member   = { id: string; calendarId: string; userId: string };
  type Todo     = { id: string; title: string; done: boolean; date: string; calendarId?: string; creatorId?: string; position?: number };

  const db      = getDb();
  const session = getSession();
  const todos   = new QuerySubscription<Todo>(app.todos);
  const events  = new QuerySubscription<Event>(app.events);
  const allCals = new QuerySubscription<Calendar>(app.calendars);
  const allMembers = new QuerySubscription<Member>(app.calendar_members);

  let todayStr = $state(new Date().toISOString().split("T")[0]);
  let currentStartDate = $state(new Date());
  let pickingDate = $state(false);
  let containerWidth = $state(1200);
  let wrapEl = $state<HTMLElement | null>(null);

  const columnCount = $derived(containerWidth < 480 ? 1 : containerWidth < 880 ? 3 : 5);

  $effect(() => {
    if (!wrapEl) return;
    const ro = new ResizeObserver(([entry]) => { containerWidth = entry.contentRect.width; });
    ro.observe(wrapEl);
    return () => ro.disconnect();
  });

  $effect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function schedule() {
      const next = new Date();
      next.setUTCHours(24, 0, 0, 100);
      timer = setTimeout(() => {
        todayStr = new Date().toISOString().split("T")[0];
        schedule();
      }, next.getTime() - Date.now());
    }
    schedule();
    return () => clearTimeout(timer);
  });

  function toggleDone(todo: Todo) {
    const update: { done: boolean; date?: string } = { done: !todo.done };
    if (!todo.done && todo.date && todo.date < todayStr) {
      update.date = todayStr;
    }
    db.update(app.todos, todo.id, update);
  }

  function prevDay() {
    const d = new Date(currentStartDate);
    d.setDate(d.getDate() - 1);
    currentStartDate = d;
  }

  function nextDay() {
    const d = new Date(currentStartDate);
    d.setDate(d.getDate() + 1);
    currentStartDate = d;
  }

  const columns = $derived(
    Array.from({ length: columnCount }, (_, i) => {
      const d = new Date(currentStartDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      return {
        date: dateStr,
        label: d.toLocaleDateString("en-GB", { weekday: "long" }).toUpperCase(),
        sublabel: d.toLocaleDateString("en-GB", { month: "short", day: "numeric" }).toUpperCase(),
        isToday: dateStr === todayStr,
      };
    })
  );

  const calendarMap = $derived.by(() => {
    const map = new Map<string, Calendar>();
    for (const c of allCals.current ?? []) map.set(c.id, c);
    return map;
  });

  const myCalendarIds = $derived.by(() => {
    if (!session?.user_id) return new Set<string>();
    const uid = session.user_id;
    return new Set((allMembers.current ?? []).filter(m => m.userId === uid).map(m => m.calendarId));
  });

  const visibleCalendarIds = $derived.by(() => {
    const result = new Set<string>();
    for (const id of myCalendarIds) {
      if (isVisible(id)) result.add(id);
    }
    return result;
  });

  const myCalendars = $derived.by(() => {
    const result: Calendar[] = [];
    for (const id of myCalendarIds) {
      const cal = calendarMap.get(id);
      if (cal) result.push(cal);
    }
    return result;
  });

  const showCalDots = $derived(myCalendars.length > 1);

  let editingSlot = $state<{ date: string | null; index: number } | null>(null);
  let newTaskTitle = $state("");
  let editingTodoId = $state<string | null>(null);
  let editingTitle  = $state("");
  let dragOverZone = $state<string | undefined>(undefined);
  let dragOverRow  = $state<{ date: string | null; index: number } | null>(null);
  let calPicker    = $state<{ todoId: string; x: number; y: number } | null>(null);
  let eventModal   = $state<{ date: string; eventId?: string } | null>(null);

  const editingEvent = $derived.by(() => {
    if (!eventModal?.eventId) return null;
    return (events.current ?? []).find(e => e.id === eventModal!.eventId) ?? null;
  });

  function openCreateEvent(date: string) {
    eventModal = { date };
  }

  function openEditEvent(event: Event) {
    eventModal = { date: event.date, eventId: event.id };
  }

  function closeEventModal() {
    eventModal = null;
  }

  function saveEvent(values: { title: string; date: string; time: string; calendarId: string }) {
    if (!session?.user_id) return;
    if (eventModal?.eventId) {
      db.update(app.events, eventModal.eventId, {
        title: values.title,
        date: values.date,
        time: values.time || undefined,
        calendarId: values.calendarId,
      });
    } else {
      db.insert(app.events, {
        title: values.title,
        date: values.date,
        time: values.time || undefined,
        calendarId: values.calendarId,
        creatorId: session.user_id,
      });
    }
    eventModal = null;
  }

  function deleteEvent(id: string) {
    db.delete(app.events, id);
    eventModal = null;
  }

  function startAdding(date: string | null, index: number) {
    editingSlot = { date, index };
    newTaskTitle = "";
  }

  function submitNewTask(e: SubmitEvent | FocusEvent, date: string | null) {
    e.preventDefault();
    if (!editingSlot) return;
    const title = newTaskTitle.trim();
    editingSlot = null;
    if (!title || !session?.user_id) return;
    const calendarId = personalCal.id ?? myCalendars[0]?.id;
    if (!calendarId) return;
    db.insert(app.todos, {
      title,
      done: false,
      date: date ?? "",
      calendarId,
      creatorId: session.user_id,
      position: Math.floor(Date.now() / 1000),
    });
  }

  function startEditing(todo: Todo) {
    editingTodoId = todo.id;
    editingTitle  = todo.title;
  }

  function submitEdit() {
    if (!editingTodoId) return;
    const title = editingTitle.trim();
    if (title) db.update(app.todos, editingTodoId, { title });
    editingTodoId = null;
  }

  function openCalPicker(e: MouseEvent, todo: Todo) {
    if (todo.creatorId !== session?.user_id) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    calPicker = { todoId: todo.id, x: rect.left, y: rect.bottom + 4 };
  }

  function assignCalendar(todoId: string, calendarId: string) {
    db.update(app.todos, todoId, { calendarId });
    calPicker = null;
  }

  function handleDragStart(e: DragEvent, id: string) {
    e.dataTransfer?.setData("text/plain", id);
    e.dataTransfer!.effectAllowed = "move";
  }

  function handleColumnDragOver(e: DragEvent, zone: string) {
    e.preventDefault();
    dragOverZone = zone;
    dragOverRow = null;
  }

  function handleColumnDrop(e: DragEvent, date: string | null) {
    e.preventDefault();
    dragOverZone = undefined;
    dragOverRow = null;
    const id = e.dataTransfer?.getData("text/plain");
    if (!id) return;
    const existing = getSlotsForDate(date).filter((t): t is Todo => t !== null);
    const lastPos = existing.length > 0 ? (existing[existing.length - 1].position ?? 0) + 1000 : Math.floor(Date.now() / 1000);
    db.update(app.todos, id, { date: date ?? "", position: lastPos });
  }

  function handleRowDragOver(e: DragEvent, date: string | null, index: number) {
    e.preventDefault();
    e.stopPropagation();
    dragOverRow = { date, index };
    dragOverZone = date ?? "someday";
  }

  function handleRowDrop(e: DragEvent, date: string | null, slots: Array<Todo | null>, index: number) {
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer?.getData("text/plain");
    dragOverRow = null;
    dragOverZone = undefined;
    if (!id) return;

    const real = slots.filter((s): s is Todo => s !== null);
    const others = real.filter(t => t.id !== id);
    const target = real[index];
    const insertBefore = target ? others.findIndex(t => t.id === target.id) : others.length;

    const prev = others[insertBefore - 1];
    const next = others[insertBefore];

    let newPos: number;
    if (!prev && !next) {
      newPos = Date.now();
    } else if (!prev) {
      newPos = Math.round((next.position ?? 1_000_000_000_000) - 1000);
    } else if (!next) {
      newPos = Math.round((prev.position ?? 0) + 1000);
    } else {
      const a = prev.position ?? 0;
      const b = next.position ?? Date.now();
      newPos = a === b ? a + 1 : Math.round((a + b) / 2);
    }

    db.update(app.todos, id, { date: date ?? "", position: newPos });
  }

  function handleDragLeave(e: DragEvent) {
    if (!(e.currentTarget as Element)?.contains(e.relatedTarget as Node)) {
      dragOverZone = undefined;
      dragOverRow = null;
    }
  }

  const MIN_SLOTS = 10;

  function getSlotsForDate(date: string | null): Array<Todo | null> {
    const items = (todos.current ?? [])
      .filter(t => {
        const calMatch = t.calendarId ? visibleCalendarIds.has(t.calendarId) : false;
        if (!calMatch) return false;
        if (date === null) return !t.date;
        if (!t.date) return false;
        if (date === todayStr) return t.date === todayStr || (t.date < todayStr && !t.done);
        if (date < todayStr) return t.date === date && t.done;
        return t.date === date;
      })
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        const aPersonal = a.calendarId === personalCal.id ? 0 : 1;
        const bPersonal = b.calendarId === personalCal.id ? 0 : 1;
        if (aPersonal !== bPersonal) return aPersonal - bPersonal;
        return (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER);
      });
    const count = Math.max(MIN_SLOTS, items.length + 1);
    return [...items, ...new Array<null>(count - items.length).fill(null)];
  }

  function getEventsForDate(date: string): Event[] {
    return eventsForDay(events.current ?? [], date, visibleCalendarIds);
  }
</script>

{#if calPicker}
  <div class="cal-picker-overlay" onclick={() => (calPicker = null)} aria-hidden="true"></div>
  <div class="cal-picker" style="left: {calPicker.x}px; top: {calPicker.y}px">
    {#each myCalendars as cal (cal.id)}
      <button class="cal-pick-opt" onclick={() => assignCalendar(calPicker!.todoId, cal.id)}>
        <span class="cal-pick-swatch" style="background: {cal.colour}"></span>
        {cal.name}
      </button>
    {/each}
  </div>
{/if}

{#snippet taskList(date: string | null, slots: Array<Todo | null>)}
  <ul class="task-list">
    {#each slots as todo, i}
      {#if todo}
        {#if editingTodoId === todo.id}
          <li class="row editing">
            <form onsubmit={(e) => { e.preventDefault(); submitEdit(); }}>
              <input
                type="text"
                bind:value={editingTitle}
                autofocus
                onblur={submitEdit}
                onkeydown={(e) => e.key === "Escape" && (editingTodoId = null)}
              />
            </form>
          </li>
        {:else}
        <li
          class="row"
          class:done={todo.done}
          class:drag-target={dragOverRow?.date === date && dragOverRow?.index === i}
          draggable="true"
          ondragstart={(e) => handleDragStart(e, todo.id)}
          ondragover={(e) => handleRowDragOver(e, date, i)}
          ondrop={(e) => handleRowDrop(e, date, slots, i)}
        >
          <label class="task-label">
            <input
              type="checkbox"
              class="cb"
              checked={todo.done}
              onchange={() => toggleDone(todo)}
            />
            <span class="task-title" ondblclick={() => startEditing(todo)}>{todo.title}</span>
          </label>
          <button class="del" aria-label="Delete task" onclick={() => db.delete(app.todos, todo.id)}>
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
              <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
          {#if showCalDots}
            <button
              class="cal-bar"
              class:clickable={todo.creatorId === session?.user_id}
              style="background: {calendarMap.get(todo.calendarId ?? '')?.colour ?? '#888'}"
              title={calendarMap.get(todo.calendarId ?? '')?.name}
              onclick={(e) => openCalPicker(e, todo)}
              tabindex="-1"
              aria-label="Change calendar"
            ></button>
          {/if}
        </li>
        {/if}
      {:else if editingSlot?.date === date && editingSlot?.index === i}
        <li class="row editing">
          <form onsubmit={(e) => submitNewTask(e, date)}>
            <input
              type="text"
              bind:value={newTaskTitle}
              autofocus
              onblur={(e) => submitNewTask(e, date)}
              onkeydown={(e) => e.key === "Escape" && (editingSlot = null)}
              placeholder="New task…"
            />
          </form>
        </li>
      {:else}
        <li class="row empty">
          <button
            type="button"
            class="add-slot"
            tabindex="-1"
            onclick={() => startAdding(date, i)}
            aria-label="Add task"
          ></button>
        </li>
      {/if}
    {/each}
  </ul>
{/snippet}

{#snippet eventsBlock(date: string)}
  {@const items = getEventsForDate(date)}
  {#if items.length > 0}
    <ul class="event-list">
      {#each items as event (event.id)}
        <li class="event-row">
          <button
            type="button"
            class="event-clickable"
            onclick={() => openEditEvent(event)}
          >
            <span class="event-title">
              {#if event.time}<span class="event-time">{event.time}</span>{" "}{/if}{event.title}
            </span>
          </button>
          <button
            type="button"
            class="del event-del"
            aria-label="Delete event"
            onclick={() => deleteEvent(event.id)}
          >
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
              <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
          {#if showCalDots}
            <span
              class="cal-bar"
              style="background: {calendarMap.get(event.calendarId)?.colour ?? '#888'}"
              title={calendarMap.get(event.calendarId)?.name}
              aria-label="Event calendar"
            ></span>
          {/if}
        </li>
      {/each}
    </ul>
    <div class="event-task-divider"></div>
  {/if}
{/snippet}

<div class="wrap" bind:this={wrapEl}>
  <nav class="nav" aria-label="Week navigation">
    <button class="arrow" onclick={prevDay} aria-label="Previous day">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M9 2.5L4.5 7 9 11.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <button class="today-btn" onclick={() => (currentStartDate = new Date())}>Today</button>
    {#if pickingDate}
      <input
        class="date-jump"
        type="date"
        value={currentStartDate.toISOString().split("T")[0]}
        onchange={(e) => {
          const v = (e.target as HTMLInputElement).value;
          if (v) currentStartDate = new Date(v + "T00:00:00");
          pickingDate = false;
        }}
        onblur={() => (pickingDate = false)}
        autofocus
      />
    {:else}
      <button class="date-range-btn" onclick={() => (pickingDate = true)} title="Jump to date">
        {columns[0].sublabel}{columnCount > 1 ? ` — ${columns[columnCount - 1].sublabel}` : ""}
      </button>
    {/if}
    <button class="arrow" onclick={nextDay} aria-label="Next day">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M5 2.5L9.5 7 5 11.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </nav>

  <div class="board" style="grid-template-columns: repeat({columnCount}, 1fr)">
    {#each columns as col (col.date)}
      <div
        class="col"
        class:today={col.isToday}
        class:drag-over={dragOverZone === col.date}
        role="region"
        aria-label={col.label}
        ondragover={(e) => handleColumnDragOver(e, col.date)}
        ondragleave={handleDragLeave}
        ondrop={(e) => handleColumnDrop(e, col.date)}
      >
        <div class="col-head">
          <div class="col-head-titles">
            <span class="col-day">{col.label}</span>
            <span class="col-date">{col.sublabel}</span>
          </div>
          <button
            type="button"
            class="add-event-btn"
            onclick={() => openCreateEvent(col.date)}
            aria-label="Add event"
            title="Add event"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        {@render eventsBlock(col.date)}
        {@render taskList(col.date, getSlotsForDate(col.date))}
      </div>
    {/each}
  </div>

  <section
    class="someday"
    class:drag-over={dragOverZone === "someday"}
    aria-label="Someday"
    ondragover={(e) => handleColumnDragOver(e, "someday")}
    ondragleave={handleDragLeave}
    ondrop={(e) => handleColumnDrop(e, null)}
  >
    <div class="someday-head">
      <span class="col-day">Someday</span>
    </div>
    <div class="someday-body" style="--someday-cols: {columnCount === 1 ? 1 : columnCount === 3 ? 2 : 3}">
      {@render taskList(null, getSlotsForDate(null))}
    </div>
  </section>
</div>

<EventModal
  open={eventModal !== null}
  calendars={myCalendars}
  defaultCalendarId={personalCal.id}
  initialDate={editingEvent?.date ?? eventModal?.date ?? todayStr}
  initialTitle={editingEvent?.title ?? ""}
  initialTime={editingEvent?.time ?? null}
  initialCalendarId={editingEvent?.calendarId}
  mode={eventModal?.eventId ? "edit" : "create"}
  onsave={saveEvent}
  ondelete={editingEvent ? () => deleteEvent(editingEvent!.id) : undefined}
  onclose={closeEventModal}
/>

<style>
  .wrap {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background: #fff;
  }

  /* ── Navigation ── */

  .nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    height: 40px;
    border-bottom: 1px solid #e0e0e0;
    flex-shrink: 0;
  }

  .arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: none;
    border: none;
    color: #c0c0c0;
    transition: color 0.1s;
  }

  .arrow:hover { color: #000; }

  .today-btn {
    background: none;
    border: 1px solid #d0d0d0;
    padding: 0.2rem 0.75rem;
    font-family: inherit;
    font-size: 0.5625rem;
    font-weight: 600;
    letter-spacing: 0.16em;
    color: #888;
    text-transform: uppercase;
    transition: border-color 0.1s, color 0.1s;
  }

  .today-btn:hover {
    border-color: #000;
    color: #000;
  }

  .date-range-btn {
    background: none;
    border: none;
    font-family: inherit;
    font-size: 0.5625rem;
    font-weight: 400;
    letter-spacing: 0.08em;
    color: #aaa;
    text-transform: uppercase;
    cursor: pointer;
    padding: 0.2rem 0.5rem;
    transition: color 0.1s;
    min-width: 10rem;
    text-align: center;
  }

  .date-range-btn:hover { color: #000; }

  .date-jump {
    font-family: inherit;
    font-size: 0.6875rem;
    color: #111;
    border: none;
    border-bottom: 1px solid #000;
    background: none;
    padding: 0.1rem 0.25rem;
    outline: none;
    min-width: 10rem;
    text-align: center;
  }

  /* ── Board ── */

  .board {
    display: grid;
    flex: 1;
    overflow: hidden;
  }

  .col {
    display: flex;
    flex-direction: column;
    border-right: 1px solid #e8e8e8;
    border-top: 3px solid transparent;
    overflow-y: auto;
    background: #fff;
  }

  .col:last-child { border-right: none; }
  .col.today { border-top-color: var(--accent, #000); }
  .col.drag-over { background: #f5f5f5; }

  /* ── Column header ── */

  .col-head {
    padding: 0.875rem 1rem 0.75rem;
    border-bottom: 1px solid #e8e8e8;
    flex-shrink: 0;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .col-head-titles {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .add-event-btn {
    background: none;
    border: none;
    padding: 0;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ccc;
    cursor: pointer;
    transition: color 0.1s, opacity 0.1s;
    opacity: 0;
    flex-shrink: 0;
  }

  .col:hover .add-event-btn { opacity: 1; }
  .add-event-btn:hover { color: #000; }
  .add-event-btn:focus { opacity: 1; outline: none; color: #000; }

  @media (max-width: 880px) {
    .add-event-btn { opacity: 1; }
  }

  .col-day {
    display: block;
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #000;
  }

  .col-date {
    display: block;
    margin-top: 0.2rem;
    font-size: 0.5625rem;
    font-weight: 400;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #aaa;
  }

  .col.today .col-date {
    color: var(--accent, #000);
    font-weight: 600;
  }

  /* ── Event list ── */

  .event-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .event-row {
    height: 2rem;
    display: flex;
    align-items: center;
    padding: 0 0.75rem;
    border-bottom: 1px solid #f0f0f0;
  }

  .event-row:hover { background: #f8f8f8; }

  .event-clickable {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    text-align: left;
    cursor: pointer;
    height: 100%;
  }

  .event-title {
    flex: 1;
    min-width: 0;
    font-size: 0.8125rem;
    font-weight: 400;
    color: #111;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .event-time {
    font-style: italic;
    color: #888;
    margin-right: 0.25rem;
  }

  .event-row .cal-bar {
    margin-left: auto;
    margin-right: -0.75rem;
    cursor: default;
  }

  .event-row:hover .event-del { opacity: 1; }

  @media (max-width: 480px) {
    .event-row {
      height: 2.75rem;
    }
  }

  .event-task-divider {
    height: 1px;
    background: #d0d0d0;
    margin: 0.25rem 0;
  }

  /* ── Task list ── */

  .task-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .row {
    height: 2rem;
    display: flex;
    align-items: center;
    padding: 0 0.75rem;
    border-bottom: 1px solid #f0f0f0;
    border-top: 2px solid transparent;
    transition: border-top-color 0.08s;
  }

  .row.drag-target {
    border-top-color: var(--accent, #000);
  }

  .row:not(.empty):not(.editing) {
    cursor: grab;
  }

  .row:not(.empty):not(.editing):hover { background: #f8f8f8; }
  .row:not(.empty):not(.editing):active { cursor: grabbing; }

  /* ── Calendar bar ── */

  .cal-bar {
    width: 8px;
    align-self: stretch;
    flex-shrink: 0;
    border: none;
    padding: 0;
    margin-left: auto;
    margin-right: -0.75rem;
    cursor: default;
    transition: width 0.12s;
  }

  .cal-bar.clickable { cursor: pointer; }
  .cal-bar.clickable:hover { width: 12px; }

  @media (max-width: 880px) {
    .cal-bar {
      width: 12px;
    }
    .cal-bar.clickable:hover { width: 16px; }
  }

  @media (max-width: 480px) {
    .row {
      height: 2.75rem;
    }

    .cb {
      width: 16px;
      height: 16px;
    }

    .cb:checked::after {
      left: 3px;
      top: 0px;
      width: 7px;
      height: 11px;
    }

    /* On mobile, bar becomes a circle — distinct from the square checkbox */
    .cal-bar {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      align-self: center;
      margin-left: 0.375rem;
      margin-right: 0;
      transition: opacity 0.1s;
    }

    .cal-bar.clickable:hover { opacity: 0.7; }
  }

  /* ── Task contents ── */

  .task-label {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex: 1;
    min-width: 0;
    cursor: pointer;
  }

  .cb {
    appearance: none;
    width: 12px;
    height: 12px;
    border: 1px solid #bbb;
    flex-shrink: 0;
    cursor: pointer;
    position: relative;
    transition: border-color 0.1s;
  }

  .cb:hover { border-color: #000; }

  .cb:checked {
    background: var(--accent, #000);
    border-color: var(--accent, #000);
  }

  .cb:checked::after {
    content: '';
    position: absolute;
    left: 2px;
    top: 0px;
    width: 5px;
    height: 8px;
    border: 1.5px solid #fff;
    border-top: none;
    border-left: none;
    transform: rotate(42deg);
  }

  .task-title {
    font-size: 0.8125rem;
    font-weight: 400;
    color: #111;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }

  .row.done .task-title {
    text-decoration: line-through;
    color: #bbb;
  }

  .row.done .cb {
    border-color: #ccc;
    background: #ccc;
  }

  .del {
    background: none;
    border: none;
    padding: 3px;
    color: #ccc;
    opacity: 0;
    transition: opacity 0.1s, color 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-left: 4px;
  }

  .row:hover .del { opacity: 1; }
  .del:hover { color: #000; }

  /* ── Editing ── */

  .row.editing form {
    flex: 1;
    display: flex;
    align-items: center;
  }

  .row.editing input {
    width: 100%;
    border: none;
    background: none;
    font-family: inherit;
    font-size: 0.8125rem;
    font-weight: 400;
    padding: 0;
    outline: none;
    color: #111;
  }

  .row.editing input::placeholder { color: #ccc; }

  /* ── Empty slot ── */

  .row.empty {
    padding: 0;
    border-bottom-color: #f5f5f5;
    border-top-color: transparent;
  }

  .add-slot {
    width: 100%;
    height: 100%;
    background: none;
    border: none;
    cursor: text;
    display: block;
  }

  .row.empty:hover { background: #f8f8f8; }

  /* ── Someday ── */

  .someday {
    height: 192px;
    flex-shrink: 0;
    background: #f4f4f4;
    border-top: 1px solid #000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .someday.drag-over { background: #ececec; }

  .someday-head {
    padding: 0.625rem 1rem 0.5rem;
    border-bottom: 1px solid #e0e0e0;
    flex-shrink: 0;
  }

  .someday .col-day { color: #888; }

  .someday-body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .someday-body .task-list {
    display: grid;
    grid-template-columns: repeat(var(--someday-cols, 3), 1fr);
  }

  .someday-body .row {
    border-right: 1px solid #e8e8e8;
    background: #f4f4f4;
  }

  .someday-body .row:hover:not(.empty) { background: #ececec; }
  .someday-body .row.empty:hover { background: #ececec; }
  .someday-body .row:nth-child(3n) { border-right: none; }

  @media (max-width: 880px) {
    .someday-body .row:nth-child(3n) { border-right: 1px solid #e8e8e8; }
    .someday-body .row:nth-child(2n) { border-right: none; }
  }

  @media (max-width: 480px) {
    .someday-body .row:nth-child(2n) { border-right: 1px solid #e8e8e8; }
    .someday-body .row { border-right: none; }
  }

  /* ── Calendar picker dropdown ── */

  .cal-picker-overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
  }

  .cal-picker {
    position: fixed;
    z-index: 1000;
    background: #fff;
    border: 1px solid #d0d0d0;
    border-top: 2px solid #000;
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    min-width: 140px;
    padding: 0.25rem 0;
  }

  .cal-pick-opt {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.375rem 0.75rem;
    background: none;
    border: none;
    text-align: left;
    font-family: inherit;
    font-size: 0.75rem;
    font-weight: 400;
    color: #111;
    cursor: pointer;
  }

  .cal-pick-opt:hover { background: #f5f5f5; }

  .cal-pick-swatch {
    width: 8px;
    height: 8px;
    flex-shrink: 0;
    outline: 1px solid rgba(0,0,0,0.15);
    outline-offset: 1px;
  }
</style>
