<script lang="ts">
  type Calendar = { id: string; name: string; colour: string };
  type TaskValues = { title: string; date: string; calendarId: string };

  type Props = {
    open: boolean;
    calendars: Calendar[];
    defaultCalendarId: string | null;
    initialDate: string;
    initialTitle?: string;
    initialCalendarId?: string;
    mode?: "create" | "edit";
    onsave: (values: TaskValues) => void;
    ondelete?: () => void;
    onclose: () => void;
  };

  let {
    open,
    calendars,
    defaultCalendarId,
    initialDate,
    initialTitle = "",
    initialCalendarId,
    mode = "create",
    onsave,
    ondelete,
    onclose,
  }: Props = $props();

  let title = $state("");
  let date = $state("");
  let calendarId = $state("");

  $effect(() => {
    if (open) {
      title = initialTitle;
      date = initialDate;
      calendarId = initialCalendarId ?? defaultCalendarId ?? calendars[0]?.id ?? "";
    }
  });

  function submit(e: SubmitEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || !date || !calendarId) return;
    onsave({ title: trimmed, date, calendarId });
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") onclose();
  }
</script>

{#if open}
  <div
    class="backdrop"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    role="presentation"
  >
    <div class="modal" role="dialog" aria-modal="true" aria-label="Task">
      <form onsubmit={submit}>
        <label class="field">
          <span class="label">Title</span>
          <input
            type="text"
            bind:value={title}
            placeholder="Task title…"
            autofocus
            required
          />
        </label>

        <label class="field">
          <span class="label">Date</span>
          <input type="date" bind:value={date} required />
        </label>

        <label class="field">
          <span class="label">Calendar</span>
          <select bind:value={calendarId} required>
            {#each calendars as cal (cal.id)}
              <option value={cal.id}>{cal.name}</option>
            {/each}
          </select>
        </label>

        <div class="actions">
          {#if mode === "edit" && ondelete}
            <button type="button" class="delete" onclick={ondelete}>Delete</button>
          {/if}
          <div class="spacer"></div>
          <button type="button" class="cancel" onclick={onclose}>Cancel</button>
          <button type="submit" class="save">{mode === "edit" ? "Save" : "Create"}</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal {
    background: #fff;
    border: 1px solid #d0d0d0;
    border-top: 2px solid #000;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    width: 320px;
    max-width: calc(100vw - 2rem);
    padding: 1.25rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .label {
    font-size: 0.5625rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #000;
  }

  input[type="text"],
  input[type="date"],
  select {
    border: none;
    border-bottom: 1px solid #000;
    background: none;
    padding: 0.25rem 0;
    font-family: inherit;
    font-size: 0.8125rem;
    color: #111;
    outline: none;
    border-radius: 0;
  }

  input[type="text"]:focus,
  input[type="date"]:focus,
  select:focus {
    border-bottom-color: var(--accent, #000);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .spacer {
    flex: 1;
  }

  button {
    background: none;
    border: 1px solid #d0d0d0;
    padding: 0.4rem 0.875rem;
    font-family: inherit;
    font-size: 0.5625rem;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #444;
    cursor: pointer;
    transition: border-color 0.1s, color 0.1s;
  }

  button:hover {
    border-color: #000;
    color: #000;
  }

  button.save {
    background: #000;
    border-color: #000;
    color: #fff;
  }

  button.save:hover {
    background: var(--accent, #111);
    border-color: var(--accent, #111);
  }

  button.delete {
    border-color: #e44;
    color: #e44;
  }

  button.delete:hover {
    background: #e44;
    color: #fff;
  }
</style>
