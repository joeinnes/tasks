import { browser } from "$app/environment";

const HIDDEN_KEY = "tasks-hidden-calendars";

function loadHidden(): string[] {
  if (!browser) return [];
  try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]"); }
  catch { return []; }
}

export let hiddenCalendars = $state<string[]>(loadHidden());

export function toggleCalendar(id: string) {
  const idx = hiddenCalendars.indexOf(id);
  if (idx >= 0) hiddenCalendars.splice(idx, 1);
  else hiddenCalendars.push(id);
  if (browser) localStorage.setItem(HIDDEN_KEY, JSON.stringify(hiddenCalendars));
}

export function isVisible(id: string) {
  return !hiddenCalendars.includes(id);
}

// Mutate .id; never reassign this binding
export const personalCal = $state<{ id: string | null }>({ id: null });
