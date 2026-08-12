<script>
  import { store } from '../../lib/store.svelte.js';
  import { ChronosMath, getFormattedDate } from '../../lib/ChronosMath.js';
  import { 
    FolderKanban, 
    FileText, 
    Rocket, 
    Tag as TagIcon,
    Calendar,
    Edit2,
    Check,
    X
  } from 'lucide-svelte';

  // State for deploy modal
  let selectedTaskIdForDeploy = $state(null);
  let deployDeadlineInput = $state('');
  let isDeployModalOpen = $state(false);

  // State for inline edit
  let editingTaskId = $state(null);
  let editTitle = $state('');
  let editPriority = $state('Medium');

  function openDeployModal(task) {
    selectedTaskIdForDeploy = task.id;
    deployDeadlineInput = ChronosMath.addDays(getFormattedDate(), 7);
    isDeployModalOpen = true;
  }

  async function handleDeploySubmit() {
    if (!deployDeadlineInput.trim()) {
      store.showToast('Please specify a valid deadline.', 'warning');
      return;
    }
    const success = await store.assignDeadlineAndExecute(selectedTaskIdForDeploy, deployDeadlineInput.trim());
    if (success) {
      isDeployModalOpen = false;
      selectedTaskIdForDeploy = null;
    }
  }

  function openMarkdown(task) {
    store.openStrategiesFile(task);
  }

  function startEditing(task) {
    editingTaskId = task.id;
    editTitle = task.title;
    editPriority = task.priority;
  }

  async function saveEditing(task) {
    if (!editTitle.trim()) {
      store.showToast('Title cannot be empty.', 'warning');
      return;
    }
    try {
      const res = await window.electronAPI.updateTask({
        id: task.id,
        title: editTitle.trim(),
        priority: editPriority,
        stage: task.stage,
        tags: task.tags ? task.tags.map(t => t.tag_name) : []
      });
      if (res.success) {
        store.showToast('Task updated successfully.', 'info');
        await store.loadAllData();
        editingTaskId = null;
      } else {
        store.showToast('Update failed: ' + res.error, 'danger');
      }
    } catch (e) {
      store.logError(e.message, 'High');
    }
  }

  function handleOverlayKeyDown(e) {
    if (e.key === 'Escape') {
      isDeployModalOpen = false;
    }
  }
</script>

<div class="view-container">
  <div class="view-header">
    <div class="header-title">
      <FolderKanban size={22} class="icon-arsenal" />
      <h2>ARSENAL PLANNING PHASE ({store.arsenalTasks.length})</h2>
    </div>
    <p class="header-desc">
      Raw intel & strategizing phase. Assign a target deadline to deploy a campaign onto the Execution battlefield.
    </p>
  </div>

  {#if store.arsenalTasks.length === 0}
    <div class="empty-state">
      <FolderKanban size={48} />
      <h3>NO CAMPAIGNS IN ARSENAL</h3>
      <p>Click the floating (+) button or press Ctrl+N to log a new campaign.</p>
    </div>
  {:else}
    <div class="task-grid">
      {#each store.arsenalTasks as task}
        <div class="task-card">
          <div class="card-top">
            <span class="badge-tactical badge-{task.priority.toLowerCase()}">{task.priority}</span>
            <span class="stage-tag">{task.stage}</span>
          </div>

          {#if editingTaskId === task.id}
            <div class="edit-box">
              <input type="text" bind:value={editTitle} />
              <select bind:value={editPriority}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
              <div class="edit-actions">
                <button type="button" class="btn-tactical btn-primary" onclick={() => saveEditing(task)}><Check size={14} /> SAVE</button>
                <button type="button" class="btn-tactical" onclick={() => editingTaskId = null}><X size={14} /> CANCEL</button>
              </div>
            </div>
          {:else}
            <h3 class="task-title">{task.title}</h3>
          {/if}

          <div class="card-meta">
            <span class="meta-item"><Calendar size={13} /> Created: {task.origin_date}</span>
          </div>

          {#if task.tags && task.tags.length > 0}
            <div class="tag-row">
              {#each task.tags as tag}
                <span class="tag"><TagIcon size={11} /> {tag.tag_name}</span>
              {/each}
            </div>
          {/if}

          <div class="card-actions">
            <button type="button" class="btn-tactical" onclick={() => openMarkdown(task)} title="Open Strategies Markdown file">
              <FileText size={14} />
              <span>STRATEGIES</span>
            </button>

            <button type="button" class="btn-tactical" onclick={() => startEditing(task)} title="Edit details">
              <Edit2 size={14} />
              <span>EDIT</span>
            </button>

            <button type="button" class="btn-tactical btn-primary" onclick={() => openDeployModal(task)} title="Deploy to Execution">
              <Rocket size={14} />
              <span>DEPLOY</span>
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Deploy Modal -->
{#if isDeployModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="modal-overlay" 
    onclick={() => isDeployModalOpen = false}
    onkeydown={handleOverlayKeyDown}
  >
    <div class="modal-card" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <div class="title">
          <Rocket size={18} />
          <span>BATTLEFIELD DEPLOYMENT & ASSIGN DEADLINE</span>
        </div>
        <button type="button" class="close-btn" onclick={() => isDeployModalOpen = false} aria-label="Close deploy modal"><X size={16} /></button>
      </div>

      <div class="modal-body">
        <p class="warning-text">
          Assigning a deadline will permanently lock basic details (Title, Priority, Tags) and transition this campaign to <strong>EXECUTION</strong>.
        </p>

        <div class="field-group">
          <label for="deploy-deadline">TARGET DEADLINE (DD-MM-YYYY) *</label>
          <input 
            id="deploy-deadline"
            type="text" 
            placeholder="DD-MM-YYYY (e.g. 15-08-2026)" 
            bind:value={deployDeadlineInput} 
          />
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-tactical" onclick={() => isDeployModalOpen = false}>CANCEL</button>
        <button type="button" class="btn-tactical btn-primary" onclick={handleDeploySubmit}>CONFIRM DEPLOYMENT</button>
      </div>
    </div>
  </div>
{/if}

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

  :global(.icon-arsenal) { color: var(--accent-arsenal); }

  .header-desc {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    margin-top: 6px;
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

  .task-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 20px;
  }

  .task-card {
    background: var(--bg-panel);
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-lg);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    transition: all 0.15s ease;
  }

  .task-card:hover {
    border-color: var(--border-bright);
    transform: translateY(-2px);
  }

  .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .stage-tag {
    font-size: 11px;
    font-weight: 800;
    color: var(--accent-arsenal);
    letter-spacing: 0.05em;
  }

  .task-title {
    font-size: 15px;
    font-weight: 800;
    line-height: 1.4;
    color: var(--text-main);
  }

  .card-meta {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tag-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    background: var(--bg-card);
    padding: 3px 8px;
    border-radius: 99px;
    border: 1px solid var(--border-dim);
  }

  .card-actions {
    display: flex;
    gap: 8px;
    margin-top: auto;
    padding-top: 14px;
    border-top: 1px solid var(--border-dim);
  }

  .card-actions button {
    flex: 1;
    padding: 8px 10px;
    font-size: 11px;
  }

  .edit-box {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .edit-actions {
    display: flex;
    gap: 8px;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 9000;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .modal-card {
    width: 100%;
    max-width: 520px;
    background: #0f141d;
    border: 1px solid var(--border-bright);
    border-radius: var(--radius-xl);
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: #141a26;
    border-bottom: 1px solid var(--border-dim);
  }

  .modal-header .title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 900;
    color: var(--accent-execution);
  }

  .close-btn { color: var(--text-muted); }

  .modal-body {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .warning-text {
    font-size: 12px;
    font-weight: 700;
    color: #fbbf24;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: var(--radius-md);
    padding: 14px;
    line-height: 1.5;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .field-group label {
    font-size: 11px;
    font-weight: 800;
    color: var(--text-muted);
  }

  .field-group input {
    padding: 11px;
    font-size: 13px;
    background: #090c10;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 20px;
    border-top: 1px solid var(--border-dim);
  }
</style>
