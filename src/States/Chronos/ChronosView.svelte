<script>
  import { store } from '../../lib/store.svelte.js';
  import { getFormattedDate } from '../../lib/ChronosMath.js';
  import { 
    Clock, 
    Plus, 
    CheckSquare, 
    Square, 
    Trash2, 
    Calendar,
    Target
  } from 'lucide-svelte';

  const todayStr = getFormattedDate();
  let defaultListName = `${todayStr} Daily Objectives`;
  
  let newObjectiveTitle = $state('');
  let currentListName = $state(defaultListName);

  async function handleAddObjective(e) {
    e.preventDefault();
    if (!newObjectiveTitle.trim()) return;

    if (!window.electronAPI) return;

    try {
      const res = await window.electronAPI.createChronosItem({
        title: newObjectiveTitle.trim(),
        creation_time: getFormattedDate(),
        status: 'Initiated',
        task_id: null,
        list_name: currentListName
      });

      if (res.success) {
        newObjectiveTitle = '';
        await store.loadAllData();
      } else {
        store.showToast('Failed to create objective: ' + res.error, 'danger');
      }
    } catch (err) {
      store.logError(err.message, 'High');
    }
  }

  async function cycleStatus(item) {
    const nextStatus = item.status === 'Initiated' ? 'Doing' : item.status === 'Doing' ? 'Completed' : 'Initiated';
    try {
      const res = await window.electronAPI.updateChronosStatus({
        itemId: item.id,
        status: nextStatus
      });
      if (res.success) {
        await store.loadAllData();
      }
    } catch (err) {
      store.logError(err.message, 'High');
    }
  }

  async function deleteItem(itemId) {
    try {
      const res = await window.electronAPI.deleteChronosItem(itemId);
      if (res.success) {
        await store.loadAllData();
      }
    } catch (err) {
      store.logError(err.message, 'High');
    }
  }
</script>

<div class="view-container">
  <div class="view-header">
    <div class="header-title">
      <Clock size={22} class="icon-chronos" />
      <h2>CHRONOS DAILY OBJECTIVES LOG ({store.chronosItems.length})</h2>
    </div>
    <p class="header-desc">
      Micro-tactical daily objective tracker. Cycle statuses (Initiated &rarr; Doing &rarr; Completed) to maintain daily momentum.
    </p>
  </div>

  <div class="chronos-wrapper">
    <!-- Input Header -->
    <form class="add-bar" onsubmit={handleAddObjective}>
      <div class="input-group">
        <Target size={18} class="input-icon" />
        <input 
          type="text" 
          placeholder="Type daily objective and press Enter..." 
          bind:value={newObjectiveTitle} 
          required 
        />
      </div>

      <div class="list-name-group">
        <label for="list-select">LIST CATEGORY</label>
        <input id="list-select" type="text" bind:value={currentListName} />
      </div>

      <button type="submit" class="btn-tactical btn-primary">
        <Plus size={16} />
        <span>LOG OBJECTIVE</span>
      </button>
    </form>

    <!-- Checklist Body -->
    {#if store.chronosItems.length === 0}
      <div class="empty-state">
        <Clock size={48} />
        <h3>NO DAILY OBJECTIVES LOGGED</h3>
        <p>Enter an objective above to populate your daily battlefield checklist.</p>
      </div>
    {:else}
      <div class="chronos-list">
        {#each store.chronosItems as item}
          <div class="chronos-item {item.status.toLowerCase()}">
            <button type="button" class="status-btn" onclick={() => cycleStatus(item)} title="Click to cycle status" aria-label="Cycle objective status">
              {#if item.status === 'Completed'}
                <CheckSquare size={20} class="icon-completed" />
              {:else if item.status === 'Doing'}
                <Square size={20} class="icon-doing" />
              {:else}
                <Square size={20} class="icon-initiated" />
              {/if}
            </button>

            <div class="item-body">
              <span class="item-title">{item.title}</span>
              <div class="item-meta">
                <span class="status-tag {item.status.toLowerCase()}">[{item.status}]</span>
                <span class="meta-txt"><Calendar size={12} /> {item.creation_time}</span>
                <span class="meta-txt">• {item.list_name}</span>
              </div>
            </div>

            <button type="button" class="delete-btn" onclick={() => deleteItem(item.id)} title="Delete item" aria-label="Delete objective">
              <Trash2 size={16} />
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .view-container {
    padding: 24px;
    height: calc(100vh - 64px);
    overflow-y: auto;
  }

  .view-header {
    margin-bottom: 24px;
    border-bottom: 1px solid var(--border-dim);
    padding-bottom: 16px;
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .header-title h2 {
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 0.05em;
    color: var(--text-main);
  }

  :global(.icon-chronos) { color: var(--accent-chronos); }

  .header-desc {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    margin-top: 6px;
  }

  .chronos-wrapper {
    max-width: 840px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .add-bar {
    display: flex;
    gap: 12px;
    background: var(--bg-panel);
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-lg);
    padding: 18px;
    align-items: flex-end;
  }

  .input-group {
    flex: 2;
    display: flex;
    flex-direction: column;
    gap: 6px;
    position: relative;
  }

  :global(.input-icon) {
    position: absolute;
    left: 12px;
    top: 12px;
    color: var(--accent-chronos);
  }

  .input-group input {
    padding: 11px 12px 11px 40px;
    font-size: 13px;
    font-weight: 600;
    background: #090c10;
  }

  .list-name-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .list-name-group label {
    font-size: 10px;
    font-weight: 800;
    color: var(--text-muted);
  }

  .list-name-group input {
    padding: 11px;
    font-size: 12px;
    font-weight: 600;
    background: #090c10;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 80px 0;
    color: var(--text-dim);
    text-align: center;
  }

  .empty-state h3 {
    font-size: 15px;
    font-weight: 800;
    color: var(--text-muted);
  }

  .chronos-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .chronos-item {
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--bg-panel);
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-lg);
    padding: 14px 18px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    transition: all 0.15s ease;
  }

  .chronos-item:hover {
    border-color: var(--border-bright);
    transform: translateY(-1px);
  }

  .status-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .item-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .item-title {
    font-size: 14px;
    font-weight: 800;
    color: var(--text-main);
  }

  .chronos-item.completed .item-title {
    text-decoration: line-through;
    color: var(--text-muted);
  }

  .item-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
  }

  .status-tag {
    font-weight: 800;
    letter-spacing: 0.05em;
  }

  .status-tag.initiated { color: var(--text-muted); }
  .status-tag.doing { color: var(--accent-chronos); }
  .status-tag.completed { color: var(--accent-archive); }

  :global(.icon-completed) { color: var(--accent-archive); }
  :global(.icon-doing) { color: var(--accent-chronos); }
  :global(.icon-initiated) { color: var(--text-muted); }

  .delete-btn { color: var(--text-muted); }
  .delete-btn:hover { color: #f87171; }
</style>
