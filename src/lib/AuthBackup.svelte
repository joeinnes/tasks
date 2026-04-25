<script lang="ts">
  import { BrowserAuthSecretStore, getSession } from "jazz-tools/svelte";
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";
  import { PUBLIC_VAPID_KEY } from "$env/static/public";
  import { userPrefs, setDisplayName, setNotifTime } from "$lib/userPrefs.svelte";

  const session = getSession();

  const PASSKEY_APP_HOSTNAME: string | undefined = undefined;
  const PASSKEY_APP_NAME = "Tasks";

  type Status =
    | { kind: "idle" }
    | { kind: "error"; message: string }
    | { kind: "success"; message: string };

  let {
    redirectAfterRestore,
    mode = "full",
  }: {
    redirectAfterRestore?: string;
    mode?: "full" | "restore-only";
  } = $props();

  let phrase       = $state<string | null>(null);
  let restoreInput = $state("");
  let status       = $state<Status>({ kind: "idle" });
  let busy         = $state(false);

  // ── Name ──
  let nameInput = $state(userPrefs.name);

  function submitName(e: SubmitEvent | FocusEvent) {
    if (e instanceof SubmitEvent) e.preventDefault();
    setDisplayName(nameInput);
  }

  // ── Notifications ──
  let notifPermission = $state<NotificationPermission | "unsupported">(
    browser && "Notification" in window ? Notification.permission : "unsupported"
  );
  let notifBusy = $state(false);

  function toUTC(localTime: string): string {
    const [h, m] = localTime.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  }

  function urlB64ToUint8Array(b64: string): Uint8Array {
    const pad = "=".repeat((4 - (b64.length % 4)) % 4);
    const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  async function subscribePush(localTime: string): Promise<void> {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(PUBLIC_VAPID_KEY),
    });
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: session?.user_id,
        subscription: sub.toJSON(),
        notifTimeUTC: toUTC(localTime),
      }),
    });
  }

  async function unsubscribePush(): Promise<void> {
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: session?.user_id }),
    });
  }

  async function toggleNotifications() {
    if (userPrefs.notifTime) {
      notifBusy = true;
      setNotifTime("");
      await unsubscribePush().catch(console.error);
      notifBusy = false;
      return;
    }
    if (!browser || !("Notification" in window) || !("serviceWorker" in navigator)) return;
    const perm = await Notification.requestPermission();
    notifPermission = perm;
    if (perm !== "granted") return;
    notifBusy = true;
    try {
      const defaultTime = "08:00";
      await subscribePush(defaultTime);
      setNotifTime(defaultTime);
    } catch (err) {
      status = { kind: "error", message: describeError(err) };
    } finally {
      notifBusy = false;
    }
  }

  async function updateNotifTime(time: string) {
    setNotifTime(time);
    notifBusy = true;
    try {
      await subscribePush(time);
    } catch (err) {
      status = { kind: "error", message: describeError(err) };
    } finally {
      notifBusy = false;
    }
  }

  // ── Auth helpers ──
  async function navigate() {
    if (redirectAfterRestore) {
      await goto(redirectAfterRestore);
      location.reload();
    } else {
      location.reload();
    }
  }

  function describeError(err: unknown): string {
    if (err && typeof err === "object" && "code" in err && "message" in err) {
      return `${String((err as { code: unknown }).code)}: ${String((err as { message: unknown }).message)}`;
    }
    if (err instanceof Error) return err.message;
    return "Unknown error";
  }

  async function handleReveal() {
    status = { kind: "idle" };
    busy = true;
    try {
      const secret = await BrowserAuthSecretStore.loadSecret();
      if (!secret) { status = { kind: "error", message: "No local secret to reveal yet." }; return; }
      const { RecoveryPhrase } = await import("jazz-tools/passphrase");
      phrase = RecoveryPhrase.fromSecret(secret);
    } catch (err) {
      status = { kind: "error", message: describeError(err) };
    } finally { busy = false; }
  }

  async function handleCopy() {
    if (!phrase) return;
    try {
      await navigator.clipboard.writeText(phrase);
      status = { kind: "success", message: "Phrase copied." };
    } catch {
      status = { kind: "error", message: "Copy failed — select the text and copy manually." };
    }
  }

  async function handleRestorePhrase(e: SubmitEvent) {
    e.preventDefault();
    status = { kind: "idle" };
    busy = true;
    try {
      const { RecoveryPhrase } = await import("jazz-tools/passphrase");
      const secret = RecoveryPhrase.toSecret(restoreInput.trim());
      await BrowserAuthSecretStore.saveSecret(secret);
      await navigate();
    } catch (err) {
      status = { kind: "error", message: describeError(err) };
      busy = false;
    }
  }

  async function handlePasskeyBackup() {
    status = { kind: "idle" };
    busy = true;
    try {
      const secret = await BrowserAuthSecretStore.loadSecret();
      if (!secret) { status = { kind: "error", message: "No local secret to back up yet." }; return; }
      const { BrowserPasskeyBackup } = await import("jazz-tools/passkey-backup");
      const pb = new BrowserPasskeyBackup({ appName: PASSKEY_APP_NAME, appHostname: PASSKEY_APP_HOSTNAME });
      await pb.backup(secret, "My account");
      status = { kind: "success", message: "Passkey backup created." };
    } catch (err) {
      status = { kind: "error", message: describeError(err) };
    } finally { busy = false; }
  }

  async function handlePasskeyRestore() {
    status = { kind: "idle" };
    busy = true;
    try {
      const { BrowserPasskeyBackup } = await import("jazz-tools/passkey-backup");
      const pb = new BrowserPasskeyBackup({ appName: PASSKEY_APP_NAME, appHostname: PASSKEY_APP_HOSTNAME });
      const secret = await pb.restore();
      await BrowserAuthSecretStore.saveSecret(secret);
      await navigate();
    } catch (err) {
      status = { kind: "error", message: describeError(err) };
      busy = false;
    }
  }
</script>

<details class="auth-backup">
  <summary>
    {#if userPrefs.name}
      <span class="user-name">{userPrefs.name}</span>
    {:else}
      Sign in
    {/if}
    <svg class="chevron" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </summary>

  <div class="panel">

    <!-- ── Name ── -->
    <div class="section">
      <p class="section-label">Your name</p>
      <form class="name-form" onsubmit={submitName}>
        <input
          type="text"
          class="name-input"
          bind:value={nameInput}
          onblur={submitName}
          placeholder="Enter your name…"
          autocomplete="off"
        />
      </form>
    </div>

    {#if mode === "full"}
      <div class="section">
        <p class="section-label">Your phrase</p>
        <p class="hint">Copy your recovery phrase to sign in on another device.</p>
        <div class="actions">
          <button type="button" class="btn-ghost" onclick={handleReveal} disabled={busy}>Show phrase</button>
        </div>
        {#if phrase}
          <textarea class="phrase-display" readonly rows={3} value={phrase} aria-label="Recovery phrase"></textarea>
          <div class="actions">
            <button type="button" class="btn-ghost" onclick={handleCopy} disabled={busy}>Copy to clipboard</button>
          </div>
        {/if}
      </div>

      <div class="section">
        <p class="section-label">Passkey</p>
        <p class="hint">Save a passkey to sign in without your phrase.</p>
        <div class="actions">
          <button type="button" class="btn-ghost" onclick={handlePasskeyBackup} disabled={busy}>Save passkey</button>
        </div>
      </div>

      <div class="divider"></div>
    {/if}

    <div class="section">
      <p class="section-label">Sign in</p>
      <p class="hint">Restore your account from a phrase or passkey.</p>
      <div class="actions">
        <button type="button" class="btn-primary btn-full" onclick={handlePasskeyRestore} disabled={busy}>Sign in with passkey</button>
      </div>
      <form onsubmit={handleRestorePhrase} class="phrase-form">
        <textarea
          rows={3}
          bind:value={restoreInput}
          placeholder="Or paste your 24-word recovery phrase…"
          required
        ></textarea>
        <button type="submit" class="btn-primary" disabled={busy || !restoreInput.trim()}>Sign in with phrase</button>
      </form>
    </div>

    <div class="divider"></div>

    <!-- ── Notifications ── -->
    <div class="section">
      <p class="section-label">Notifications</p>
      {#if notifPermission === "unsupported"}
        <p class="hint">Notifications aren't supported in this browser.</p>
      {:else if notifPermission === "denied"}
        <p class="hint">Notifications are blocked — enable them in browser settings to use this feature.</p>
      {:else}
        <label class="notif-toggle">
          <input
            type="checkbox"
            class="notif-cb"
            checked={!!userPrefs.notifTime}
            disabled={notifBusy}
            onchange={toggleNotifications}
          />
          <span>Daily reminder</span>
        </label>
        {#if userPrefs.notifTime}
          <div class="notif-time-row">
            <span class="hint" style="margin: 0">Remind me at</span>
            <input
              type="time"
              class="time-input"
              value={userPrefs.notifTime}
              disabled={notifBusy}
              onchange={(e) => updateNotifTime((e.target as HTMLInputElement).value)}
            />
          </div>
        {/if}
      {/if}
    </div>

    {#if status.kind === "error"}
      <p class="status-msg error" role="alert">{status.message}</p>
    {:else if status.kind === "success"}
      <p class="status-msg success" role="status">{status.message}</p>
    {/if}
  </div>
</details>

<style>
  .auth-backup { position: relative; }

  /* ── Trigger ── */

  summary {
    list-style: none;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.5625rem;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #888;
    padding: 0.25rem 0.625rem;
    border: 1px solid #d0d0d0;
    user-select: none;
    transition: color 0.1s, border-color 0.1s;
  }

  summary::-webkit-details-marker { display: none; }
  summary::marker { display: none; }
  summary:hover { color: #000; border-color: #000; }
  .auth-backup[open] summary { color: #000; border-color: #000; }

  .user-name {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chevron { transition: transform 0.15s; flex-shrink: 0; margin-top: 1px; }
  .auth-backup[open] .chevron { transform: rotate(180deg); }

  /* ── Panel ── */

  .panel {
    position: absolute;
    right: 0;
    top: calc(100% + 0.5rem);
    z-index: 300;
    width: 296px;
    background: #fff;
    border: 1px solid #d0d0d0;
    border-top: 2px solid #000;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    display: flex;
    flex-direction: column;
  }

  /* ── Sections ── */

  .section {
    padding: 0.875rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .section + .section,
  .divider + .section { border-top: 1px solid #efefef; }

  .divider { height: 1px; background: #e8e8e8; }

  .section-label {
    margin: 0;
    font-size: 0.5625rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #000;
  }

  .hint {
    margin: 0;
    font-size: 0.6875rem;
    font-weight: 300;
    color: #999;
    line-height: 1.5;
  }

  /* ── Name input ── */

  .name-form { display: flex; }

  .name-input {
    flex: 1;
    border: none;
    border-bottom: 1px solid #e0e0e0;
    background: none;
    font-family: inherit;
    font-size: 0.8125rem;
    font-weight: 400;
    color: #111;
    padding: 0.125rem 0;
    outline: none;
    transition: border-color 0.1s;
  }

  .name-input:focus { border-bottom-color: #000; }
  .name-input::placeholder { color: #ccc; }

  /* ── Buttons ── */

  .actions { display: flex; gap: 0.5rem; }

  button {
    font-family: inherit;
    font-size: 0.5625rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
    padding: 0.375rem 0.75rem;
    transition: background 0.1s, color 0.1s, border-color 0.1s, opacity 0.1s;
  }

  button:disabled { opacity: 0.3; cursor: not-allowed; }

  .btn-ghost { background: none; border: 1px solid #d0d0d0; color: #555; }
  .btn-ghost:hover:not(:disabled) { border-color: #000; color: #000; }

  .btn-primary { background: #000; border: 1px solid #000; color: #fff; }
  .btn-primary:hover:not(:disabled) { background: #222; border-color: #222; }

  .btn-full { width: 100%; text-align: center; }

  /* ── Phrase form ── */

  .phrase-form { display: flex; flex-direction: column; gap: 0.5rem; }

  textarea {
    width: 100%;
    border: 1px solid #e0e0e0;
    padding: 0.5rem 0.625rem;
    font-family: inherit;
    font-size: 0.75rem;
    color: #111;
    resize: none;
    outline: none;
    line-height: 1.5;
    transition: border-color 0.1s;
    background: #fafafa;
  }

  textarea:focus { border-color: #000; background: #fff; }
  textarea::placeholder { color: #bbb; }

  .phrase-display {
    font-family: 'IBM Plex Mono', 'Courier New', monospace;
    font-size: 0.6875rem;
    background: #f4f4f4;
    color: #333;
    line-height: 1.6;
  }

  /* ── Notifications ── */

  .notif-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 400;
    color: #111;
    user-select: none;
  }

  .notif-cb {
    appearance: none;
    width: 12px;
    height: 12px;
    border: 1px solid #bbb;
    flex-shrink: 0;
    cursor: pointer;
    position: relative;
    transition: border-color 0.1s;
  }

  .notif-cb:hover { border-color: #000; }

  .notif-cb:checked {
    background: #000;
    border-color: #000;
  }

  .notif-cb:checked::after {
    content: '';
    position: absolute;
    left: 2px;
    top: 0;
    width: 5px;
    height: 8px;
    border: 1.5px solid #fff;
    border-top: none;
    border-left: none;
    transform: rotate(42deg);
  }

  .notif-time-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .time-input {
    border: none;
    border-bottom: 1px solid #e0e0e0;
    background: none;
    font-family: inherit;
    font-size: 0.8125rem;
    color: #111;
    padding: 0.125rem 0;
    outline: none;
    transition: border-color 0.1s;
  }

  .time-input:focus { border-bottom-color: #000; }

  /* ── Status ── */

  .status-msg {
    margin: 0;
    padding: 0.625rem 1rem;
    font-size: 0.6875rem;
    line-height: 1.45;
    border-top: 1px solid #efefef;
  }

  .error { color: #000; background: #f4f4f4; border-left: 2px solid #000; }
  .success { color: #555; background: #f4f4f4; border-left: 2px solid #aaa; }
</style>
