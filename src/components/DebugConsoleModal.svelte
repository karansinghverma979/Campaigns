<script>
  import { store } from '../lib/store.svelte.js';
  import { Terminal, X, Trash2, Copy } from 'lucide-svelte';

  function handleKeyDown(e) {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      store.isDebugModalOpen = !store.isDebugModalOpen;
    } else if (e.key === 'Escape' && store.isDebugModalOpen) {
      e.preventDefault();
      store.isDebugModalOpen = false;
    }
  }

  function clearLogs() {
    store.errorLogs = [];
  }

  function copyLogs() {
    if (store.errorLogs.length === 0) return;
    const text = store.errorLogs.map(item =>
      `[${item.time}] [${item.severity}] ${item.error}`
    ).join('\n');
    navigator.clipboard.writeText(text)
      .then(() => store.showToast('Debug logs copied to clipboard.', 'info'))
      .catch(() => store.showToast('Failed to copy logs.', 'danger'));
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if store.isDebugModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay">
    <div class="modal-card" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <div class="title">
          <Terminal size={18} class="icon" />
          <span>TACTICAL SYSTEM LOGS & DEBUG CONSOLE</span>
        </div>
        <div class="actions">
          <button type="button" class="copy-btn" onclick={copyLogs} title="Copy All Logs" aria-label="Copy All Logs"><Copy size={14} /> <span>COPY</span></button>
          <button type="button" class="clear-btn" onclick={clearLogs} title="Clear Logs" aria-label="Clear Logs"><Trash2 size={14} /> <span>CLEAR</span></button>
          <button type="button" class="close-btn" onclick={() => store.isDebugModalOpen = false} aria-label="Close Debug Console"><X size={16} /></button>
        </div>
      </div>

      <div class="log-body">
        {#if store.errorLogs.length === 0}
          <div class="empty-log">NO SYSTEM EXCEPTIONS OR AUDIT LOGS RECORDED</div>
        {:else}
          {#each store.errorLogs as item}
            <div class="log-row {item.severity.toLowerCase()}">
              <span class="time">[{item.time}]</span>
              <span class="sev">[{item.severity}]</span>
              <span class="msg">{item.error}</span>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 64px;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 8000;
    background: rgba(4, 7, 14, 0.88);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .modal-card {
    width: 100%;
    max-width: 800px;
    height: 500px;
    background: #090c12;
    border: 1px solid var(--border-bright);
    border-radius: 26px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    background: #111622;
    border-bottom: 1px solid var(--border-dim);
  }

  .title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 800;
    color: var(--accent-chronos);
    letter-spacing: 0.05em;
    word-spacing: 0.06em;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .copy-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 16px; font-size: 11px; font-weight: 800;
    color: #93c5fd; background: rgba(96, 165, 250, 0.08);
    border: 1px solid rgba(96, 165, 250, 0.25); border-radius: 9999px;
    cursor: pointer; transition: all 0.15s ease;
  }
  .copy-btn:hover { background: rgba(96, 165, 250, 0.20); border-color: rgba(96, 165, 250, 0.55); }

  .clear-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 16px; font-size: 11px; font-weight: 800;
    color: var(--text-muted); background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1); border-radius: 9999px;
    cursor: pointer; transition: all 0.15s ease;
  }
  .clear-btn:hover { color: #f87171; background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.4); }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
    display: flex;
    border-radius: 50%;
    transition: all 0.15s ease;
  }
  .close-btn:hover {
    color: var(--text-main);
    background: rgba(255,255,255,0.15);
    transform: scale(1.1);
  }

  .log-body {
    flex: 1;
    min-height: 0;
    padding: 16px;
    overflow-y: auto;
    font-size: 12px;
    font-weight: 600;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .log-body::-webkit-scrollbar { width: 6px; }
  .log-body::-webkit-scrollbar-thumb { background: rgba(251, 191, 36, 0.35); border-radius: 99px; }
  .log-body::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }

  .empty-log {
    color: var(--text-muted);
    text-align: center;
    margin-top: 40px;
    font-weight: 700;
  }

  .log-row {
    display: flex;
    gap: 8px;
    line-height: 1.4;
  }

  .time { color: var(--text-dim); flex-shrink: 0; }
  .sev { font-weight: 800; flex-shrink: 0; }
  
  .log-row.low .sev { color: #60a5fa; }
  .log-row.medium .sev { color: #fbbf24; }
  .log-row.high .sev { color: #f87171; }
  .log-row.fatal .sev { color: #ef4444; font-weight: 900; }

  .msg { color: var(--text-main); word-break: break-all; }
</style>
