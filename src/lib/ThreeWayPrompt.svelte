<script lang="ts">
  type Props = {
    open: boolean;
    title: string;
    message: string;
    actionLabel?: string;
    onpick: (choice: "this-only" | "this-and-future" | "all") => void;
    onclose: () => void;
  };

  let {
    open,
    title,
    message,
    actionLabel = "Apply",
    onpick,
    onclose,
  }: Props = $props();

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
    <div class="prompt" role="dialog" aria-modal="true" aria-labelledby="three-way-title">
      <h2 id="three-way-title">{title}</h2>
      <p>{message}</p>
      <div class="choices">
        <button type="button" onclick={() => onpick("this-only")}>{actionLabel} this only</button>
        <button type="button" onclick={() => onpick("this-and-future")}>{actionLabel} this and future</button>
        <button type="button" onclick={() => onpick("all")}>{actionLabel} all</button>
      </div>
      <div class="cancel-row">
        <button type="button" class="cancel" onclick={onclose}>Cancel</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 1100;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .prompt {
    background: #fff;
    border: 1px solid #d0d0d0;
    border-top: 2px solid #000;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    width: 320px;
    max-width: calc(100vw - 2rem);
    padding: 1.25rem;
  }

  h2 {
    margin: 0 0 0.5rem;
    font-size: 0.5625rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #000;
  }

  p {
    margin: 0 0 1rem;
    font-size: 0.8125rem;
    color: #444;
    line-height: 1.4;
  }

  .choices {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .choices button,
  .cancel {
    width: 100%;
    background: none;
    border: 1px solid #d0d0d0;
    padding: 0.6rem 0.75rem;
    font-family: inherit;
    font-size: 0.6875rem;
    font-weight: 500;
    color: #222;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.1s, background 0.1s;
  }

  .choices button:hover {
    border-color: #000;
    background: #f5f5f5;
  }

  .cancel-row {
    margin-top: 0.5rem;
    display: flex;
    justify-content: flex-end;
  }

  .cancel {
    width: auto;
    text-align: center;
    font-size: 0.5625rem;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #888;
  }

  .cancel:hover {
    border-color: #000;
    color: #000;
    background: none;
  }
</style>
