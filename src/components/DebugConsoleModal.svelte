<script>
  import { store } from '../lib/store.svelte.js';
  import { Terminal, X, Trash2 } from 'lucide-svelte';

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
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if store.isDebugModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="modal-overlay" 
    onclick={() => store.isDebugModalOpen = false} 
  >
    <div class="modal-card" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <div class="title">
          <Terminal size={18} class="icon" />
          <span>TACTICAL SYSTEM LOGS & DEBUG CONSOLE</span>
        </div>
        <div class="actions">
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
    inset: 0;
    z-index: 99990;
    background: rgba(0, 0, 0, 0.85);
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
    border-radius: var(--radius-xl);
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
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
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .clear-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 5px 12px; font-size: 11px; font-weight: 800;
    color: var(--text-muted); background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
    cursor: pointer; transition: all 0.15s ease;
  }
  .clear-btn:hover { color: #f87171; background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.4); }

  .close-btn {
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: var(--text-muted); background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1); cursor: pointer; transition: all 0.15s ease;
  }
  .close-btn:hover { color: var(--text-main); background: rgba(255,255,255,0.12); }

  .log-body {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    font-size: 12px;
    font-weight: 600;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

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
