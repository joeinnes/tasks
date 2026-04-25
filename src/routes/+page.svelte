<script lang="ts">
  import TasksBoard from "$lib/TasksBoard.svelte";
  import AuthBackup from "$lib/AuthBackup.svelte";
  import CalendarManager from "$lib/CalendarManager.svelte";
  import { getDb, getSession } from "jazz-tools/svelte";
  import { app } from "$lib/schema";

  const db      = getDb();
  const session = getSession();

  // ── Invite link handling ──
  $effect(() => {
    if (!session?.user_id || typeof window === "undefined") return;
    const joinCalId = new URLSearchParams(window.location.search).get("join");
    if (joinCalId) {
      db.insert(app.calendar_members, { calendarId: joinCalId, userId: session.user_id });
      window.history.replaceState({}, "", window.location.pathname);
    }
  });

</script>

<main class="dashboard">
  <header>
    <h1>Tasks</h1>
    <div class="header-right">
      <CalendarManager />
      <AuthBackup />
    </div>
  </header>
  <TasksBoard />
</main>

<style>
  .dashboard {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #fff;
    color: #111;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 1.5rem;
    height: 48px;
    border-bottom: 1px solid #000;
    flex-shrink: 0;
  }

  h1 {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: #000;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
</style>
