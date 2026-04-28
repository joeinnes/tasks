<script lang="ts">
  import type { Rule, Freq, Weekday, EndCondition } from "$lib/recurrence";

  type Props = {
    value: Rule;
    onchange: (v: Rule) => void;
  };

  let { value, onchange }: Props = $props();

  const WEEKDAYS: { code: Weekday; label: string }[] = [
    { code: "MO", label: "M" },
    { code: "TU", label: "T" },
    { code: "WE", label: "W" },
    { code: "TH", label: "T" },
    { code: "FR", label: "F" },
    { code: "SA", label: "S" },
    { code: "SU", label: "S" },
  ];

  const FREQS: { code: Freq; label: string }[] = [
    { code: "DAILY", label: "Day" },
    { code: "WEEKLY", label: "Week" },
    { code: "MONTHLY", label: "Month" },
    { code: "YEARLY", label: "Year" },
  ];

  function update(patch: Partial<Rule>) {
    onchange({ ...value, ...patch });
  }

  function toggleByDay(day: Weekday) {
    const current = value.byDay ?? [];
    const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
    update({ byDay: next.length > 0 ? next : undefined });
  }

  function setMonthlyMode(mode: "by-month-day" | "by-set-pos") {
    if (mode === "by-month-day") {
      update({ byDay: undefined, bySetPos: undefined, byMonthDay: value.byMonthDay ?? 1 });
    } else {
      update({ byMonthDay: undefined, bySetPos: value.bySetPos ?? 1, byDay: value.byDay ?? ["MO"] });
    }
  }

  const monthlyMode = $derived(value.bySetPos != null ? "by-set-pos" : "by-month-day");
</script>

<div class="recurrence-form">
  <div class="row">
    <span class="label-inline">Every</span>
    <input
      type="number"
      min="1"
      class="interval"
      value={value.interval}
      oninput={(e) => update({ interval: Math.max(1, Number((e.target as HTMLInputElement).value) || 1) })}
    />
    <select
      value={value.freq}
      onchange={(e) => update({ freq: (e.target as HTMLSelectElement).value as Freq })}
    >
      {#each FREQS as f (f.code)}
        <option value={f.code}>{f.label}{value.interval > 1 ? "s" : ""}</option>
      {/each}
    </select>
  </div>

  {#if value.freq === "WEEKLY"}
    <div class="row weekday-row">
      <span class="label-inline">On</span>
      <div class="weekday-toggles">
        {#each WEEKDAYS as wd (wd.code)}
          <button
            type="button"
            class="weekday-btn"
            class:active={(value.byDay ?? []).includes(wd.code)}
            onclick={() => toggleByDay(wd.code)}
          >{wd.label}</button>
        {/each}
      </div>
    </div>
  {/if}

  {#if value.freq === "MONTHLY"}
    <div class="row">
      <label class="radio-pill">
        <input
          type="radio"
          name="monthly-mode"
          checked={monthlyMode === "by-month-day"}
          onchange={() => setMonthlyMode("by-month-day")}
        />
        <span>On day</span>
        {#if monthlyMode === "by-month-day"}
          <input
            type="number"
            min="1"
            max="31"
            class="month-day"
            value={value.byMonthDay ?? 1}
            oninput={(e) => update({ byMonthDay: Math.max(1, Math.min(31, Number((e.target as HTMLInputElement).value) || 1)) })}
          />
        {/if}
      </label>
    </div>
    <div class="row">
      <label class="radio-pill">
        <input
          type="radio"
          name="monthly-mode"
          checked={monthlyMode === "by-set-pos"}
          onchange={() => setMonthlyMode("by-set-pos")}
        />
        <span>On the</span>
        {#if monthlyMode === "by-set-pos"}
          <select
            value={value.bySetPos ?? 1}
            onchange={(e) => update({ bySetPos: Number((e.target as HTMLSelectElement).value) })}
          >
            <option value={1}>1st</option>
            <option value={2}>2nd</option>
            <option value={3}>3rd</option>
            <option value={4}>4th</option>
            <option value={-1}>Last</option>
          </select>
          <select
            value={(value.byDay ?? ["MO"])[0]}
            onchange={(e) => update({ byDay: [(e.target as HTMLSelectElement).value as Weekday] })}
          >
            {#each WEEKDAYS as wd (wd.code)}
              <option value={wd.code}>{wd.code === "MO" ? "Mon" : wd.code === "TU" ? "Tue" : wd.code === "WE" ? "Wed" : wd.code === "TH" ? "Thu" : wd.code === "FR" ? "Fri" : wd.code === "SA" ? "Sat" : "Sun"}</option>
            {/each}
          </select>
        {/if}
      </label>
    </div>
  {/if}

  <div class="row end-row">
    <span class="label-inline">Ends</span>
    <select
      value={value.endCondition}
      onchange={(e) => update({ endCondition: (e.target as HTMLSelectElement).value as EndCondition })}
    >
      <option value="never">Never</option>
      <option value="on-date">On date</option>
      <option value="after-n">After</option>
    </select>
    {#if value.endCondition === "on-date"}
      <input
        type="date"
        value={value.endDate ?? ""}
        oninput={(e) => update({ endDate: (e.target as HTMLInputElement).value })}
      />
    {:else if value.endCondition === "after-n"}
      <input
        type="number"
        min="1"
        class="interval"
        value={value.count ?? 1}
        oninput={(e) => update({ count: Math.max(1, Number((e.target as HTMLInputElement).value) || 1) })}
      />
      <span class="label-inline">occurrences</span>
    {/if}
  </div>
</div>

<style>
  .recurrence-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 0.25rem;
    border-top: 1px solid #e8e8e8;
    margin-top: 0.25rem;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .label-inline {
    font-size: 0.5625rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #555;
  }

  input[type="number"],
  input[type="date"],
  select {
    border: none;
    border-bottom: 1px solid #d0d0d0;
    background: none;
    padding: 0.2rem 0.25rem;
    font-family: inherit;
    font-size: 0.8125rem;
    color: #111;
    outline: none;
  }

  .interval {
    width: 3rem;
  }

  .month-day {
    width: 2.5rem;
  }

  input[type="number"]:focus,
  input[type="date"]:focus,
  select:focus {
    border-bottom-color: var(--accent, #000);
  }

  .weekday-toggles {
    display: flex;
    gap: 0.25rem;
  }

  .weekday-btn {
    width: 22px;
    height: 22px;
    border: 1px solid #d0d0d0;
    background: #fff;
    color: #555;
    font-family: inherit;
    font-size: 0.6875rem;
    cursor: pointer;
    padding: 0;
  }

  .weekday-btn.active {
    background: #000;
    color: #fff;
    border-color: #000;
  }

  .radio-pill {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .radio-pill input[type="radio"] {
    margin: 0;
  }

  .radio-pill span {
    font-size: 0.75rem;
    color: #444;
  }
</style>
