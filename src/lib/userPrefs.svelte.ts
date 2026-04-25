import { browser } from "$app/environment";

const NAME_KEY  = "tasks-display-name";
const NOTIF_KEY = "tasks-notif-time";

// Single exported object — mutate properties, never reassign
export const userPrefs = $state({
  name:      browser ? (localStorage.getItem(NAME_KEY)  ?? "") : "",
  notifTime: browser ? (localStorage.getItem(NOTIF_KEY) ?? "") : "",
});

export function setDisplayName(name: string) {
  userPrefs.name = name;
  if (!browser) return;
  if (name.trim()) localStorage.setItem(NAME_KEY, name.trim());
  else localStorage.removeItem(NAME_KEY);
}

export function setNotifTime(time: string) {
  userPrefs.notifTime = time;
  if (!browser) return;
  if (time) localStorage.setItem(NOTIF_KEY, time);
  else localStorage.removeItem(NOTIF_KEY);
}
