<script lang="ts">
  import { getDb, getSession, QuerySubscription } from "jazz-tools/svelte";
  import { app } from "$lib/schema";
  import { toggleCalendar, isVisible, personalCal as sharedPersonalCal } from "$lib/calendars.svelte";

  type Calendar = { id: string; name: string; colour: string; creatorId: string; isPersonal: boolean };
  type Member   = { id: string; calendarId: string; userId: string };

  const db      = getDb();
  const session = getSession();

  const allCals       = new QuerySubscription<Calendar>(app.calendars);
  const allMembers    = new QuerySubscription<Member>(app.calendar_members);

  // Calendars I created or am a member of
  const myCalendars = $derived.by(() => {
    if (!session?.user_id || !allCals.current) return [] as Calendar[];
    const uid = session.user_id;
    const memberIds = new Set(
      (allMembers.current ?? []).filter(m => m.userId === uid).map(m => m.calendarId)
    );
    return allCals.current.filter(c => c.creatorId === uid || memberIds.has(c.id));
  });

  const personalCal = $derived(myCalendars.find(c => c.isPersonal && c.creatorId === session?.user_id));

  // Sync personal calendar ID + accent colour to shared state + CSS
  $effect(() => {
    if (personalCal) {
      sharedPersonalCal.id = personalCal.id;
      document.documentElement.style.setProperty("--accent", personalCal.colour);
    }
  });

  // Auto-create personal calendar on first use — runs at most once per session,
  // so deleting your last personal calendar won't trigger an immediate re-create.
  let autoCreateChecked = $state(false);
  $effect(() => {
    if (autoCreateChecked) return;
    if (!session?.user_id || allCals.loading) return;
    autoCreateChecked = true;
    const uid = session.user_id;
    const hasPersonal = (allCals.current ?? []).some(c => c.isPersonal && c.creatorId === uid);
    if (!hasPersonal) {
      const saved = typeof localStorage !== "undefined" ? localStorage.getItem("tasks-accent") : null;
      const cal = db.insert(app.calendars, {
        name: "Personal",
        colour: saved ?? "#000000",
        creatorId: uid,
        isPersonal: true,
      });
      db.insert(app.calendar_members, { calendarId: cal.value.id, userId: uid });
    }
  });

  // ── Creating a new calendar ──
  let creating = $state(false);
  let newName  = $state("");

  function startCreate() { creating = true; newName = ""; }

  function submitCreate(e: SubmitEvent | FocusEvent) {
    if (e instanceof SubmitEvent) e.preventDefault();
    if (!creating) return;
    const name = newName.trim();
    creating = false;
    if (!name || !session?.user_id) return;
    const uid = session.user_id;
    const cal = db.insert(app.calendars, {
      name,
      colour: "#888888",
      creatorId: uid,
      isPersonal: false,
    });
    db.insert(app.calendar_members, { calendarId: cal.value.id, userId: uid });
  }

  // ── Colour change ──
  function setColour(cal: Calendar, colour: string) {
    db.update(app.calendars, cal.id, { colour });
    if (cal.isPersonal) {
      document.documentElement.style.setProperty("--accent", colour);
    }
  }

  // ── Invite link ──
  async function copyInvite(cal: Calendar) {
    const link = `${window.location.origin}?join=${cal.id}`;
    await navigator.clipboard.writeText(link);
    copied = cal.id;
    setTimeout(() => { copied = null; }, 2000);
  }
  let copied = $state<string | null>(null);

  // ── Leave calendar ──
  function leaveCalendar(cal: Calendar) {
    const uid = session?.user_id;
    if (!uid) return;
    if (cal.creatorId === uid) {
      // Creator deletes the calendar entirely — destructive, confirm first.
      const message = cal.isPersonal
        ? `Delete "${cal.name}"? This personal calendar and its tasks will be permanently destroyed.`
        : `Delete "${cal.name}" for everyone? This cannot be undone.`;
      if (!window.confirm(message)) return;
      db.delete(app.calendars, cal.id);
    } else {
      // Member removes their membership row — recoverable via invite link, no confirm.
      const row = (allMembers.current ?? []).find(m => m.calendarId === cal.id && m.userId === uid);
      if (row) db.delete(app.calendar_members, row.id);
    }
  }
</script>

<details class="cal-manager">
  <summary>
    <span class="swatch" style="background: {personalCal?.colour ?? 'var(--accent, #000)'}"></span>
    <svg class="chevron" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </summary>

  <div class="panel">
    <p class="panel-label">Calendars</p>

    {#each myCalendars as cal (cal.id)}
      <div class="cal-row">
        <label class="colour-wrap" title="Change colour">
          <span class="swatch" style="background: {cal.colour}"></span>
          <input type="color" value={cal.colour} oninput={(e) => setColour(cal, (e.target as HTMLInputElement).value)} />
        </label>

        <span class="cal-name">{cal.name}</span>

        <div class="cal-actions">
          <button
            class="icon-btn"
            class:dim={!isVisible(cal.id)}
            onclick={() => toggleCalendar(cal.id)}
            title={isVisible(cal.id) ? "Hide" : "Show"}
            aria-label={isVisible(cal.id) ? "Hide calendar" : "Show calendar"}
          >
            {#if isVisible(cal.id)}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="2.5" fill="currentColor"/><path d="M1 6C2.5 3 4 2 6 2s3.5 1 5 4c-1.5 3-3 4-5 4S2.5 9 1 6z" stroke="currentColor" stroke-width="1" fill="none"/></svg>
            {:else}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 6C2.5 3 4 2 6 2s3.5 1 5 4c-1.5 3-3 4-5 4S2.5 9 1 6z" stroke="currentColor" stroke-width="1" fill="none" opacity="0.4"/><path d="M2 2l8 8" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>
            {/if}
          </button>

          {#if cal.creatorId === session?.user_id}
            <button class="icon-btn" onclick={() => copyInvite(cal)} title="Copy invite link" aria-label="Copy invite link">
              {#if copied === cal.id}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              {:else}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M5 2H3a1 1 0 00-1 1v7a1 1 0 001 1h6a1 1 0 001-1V9M7 1h4v4M11 1L5.5 6.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>
              {/if}
            </button>
          {/if}

          <button class="icon-btn leave" onclick={() => leaveCalendar(cal)} title={cal.creatorId === session?.user_id ? "Delete calendar" : "Leave calendar"} aria-label={cal.creatorId === session?.user_id ? "Delete calendar" : "Leave calendar"}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
    {/each}

    <div class="divider"></div>

    {#if creating}
      <form class="new-cal-form" onsubmit={submitCreate}>
        <input
          type="text"
          bind:value={newName}
          autofocus
          onblur={submitCreate}
          onkeydown={(e) => e.key === "Escape" && (creating = false)}
          placeholder="Calendar name…"
        />
      </form>
    {:else}
      <button class="new-cal-btn" onclick={startCreate}>+ New calendar</button>
    {/if}
  </div>
</details>

<style>
  .cal-manager {
    position: relative;
  }

  summary {
    list-style: none;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    cursor: pointer;
    padding: 0.25rem 0.375rem;
    border: 1px solid transparent;
    transition: border-color 0.1s;
    user-select: none;
  }

  summary::-webkit-details-marker { display: none; }
  summary::marker { display: none; }

  summary:hover { border-color: #d0d0d0; }
  .cal-manager[open] summary { border-color: #000; }

  .chevron {
    color: #bbb;
    transition: transform 0.15s;
    flex-shrink: 0;
  }

  .cal-manager[open] .chevron { transform: rotate(180deg); }

  /* ── Panel ── */

  .panel {
    position: absolute;
    right: 0;
    top: calc(100% + 0.5rem);
    z-index: 300;
    width: 260px;
    background: #fff;
    border: 1px solid #d0d0d0;
    border-top: 2px solid #000;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    padding: 0.75rem 0;
  }

  .panel-label {
    margin: 0 0 0.5rem;
    padding: 0 1rem;
    font-size: 0.5625rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #000;
  }

  /* ── Calendar row ── */

  .cal-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 1rem;
    min-height: 2rem;
  }

  .cal-row:hover { background: #f8f8f8; }

  .cal-name {
    flex: 1;
    font-size: 0.8125rem;
    font-weight: 400;
    color: #111;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cal-actions {
    display: flex;
    align-items: center;
    gap: 0.125rem;
    flex-shrink: 0;
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    background: none;
    border: none;
    color: #bbb;
    transition: color 0.1s;
    padding: 0;
  }

  .icon-btn:hover { color: #111; }
  .icon-btn.dim { color: #ddd; }
  .icon-btn.leave:hover { color: #e44; }

  /* ── Colour swatch ── */

  .swatch {
    display: block;
    width: 10px;
    height: 10px;
    flex-shrink: 0;
    outline: 1px solid rgba(0,0,0,0.15);
    outline-offset: 1px;
  }

  .colour-wrap {
    cursor: pointer;
    display: flex;
    align-items: center;
  }

  .colour-wrap input[type="color"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
    pointer-events: none;
  }

  /* ── Divider + new calendar ── */

  .divider {
    height: 1px;
    background: #ebebeb;
    margin: 0.5rem 0;
  }

  .new-cal-btn {
    display: block;
    width: 100%;
    background: none;
    border: none;
    padding: 0.375rem 1rem;
    text-align: left;
    font-family: inherit;
    font-size: 0.75rem;
    font-weight: 500;
    color: #888;
    transition: color 0.1s;
  }

  .new-cal-btn:hover { color: #000; }

  .new-cal-form {
    padding: 0 1rem;
  }

  .new-cal-form input {
    width: 100%;
    border: none;
    border-bottom: 1px solid #000;
    padding: 0.25rem 0;
    font-family: inherit;
    font-size: 0.8125rem;
    color: #111;
    background: none;
    outline: none;
  }
</style>
