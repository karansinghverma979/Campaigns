<script>
  import { store } from '../../lib/store.svelte.js';
  import { ChronosMath, getFormattedDate } from '../../lib/ChronosMath.js';
  import { 
    AlertTriangle, 
    FileText, 
    RotateCcw, 
    XCircle, 
    CheckSquare, 
    Clock, 
    Plus, 
    Square, 
    Trash2, 
    X
  } from 'lucide-svelte';

  // Reschedule modal state
  let selectedTaskForReschedule = $state(null);
  let newDeadlineInput = $state('');
  let isRescheduleModalOpen = $state(false);

  // Subtasks modal state
  let selectedTaskForSubtasks = $state(null);
  let subtasksList = $state([]);
  let newSubtaskTitle = $state('');
  let isSubtasksModalOpen = $state(false);

  // Abort modal state
  let selectedTaskForAbort = $state(null);
  let abortEndNote = $state('');
  let isAbortModalOpen = $state(false);

  function openMarkdown(task) {
    store.openStrategiesFile(task);
  }

  function openRescheduleModal(task) {
    if (task.reschedule_count >= 2) {
      store.showToast('Tactical Limit Reached: Campaign cannot be rescheduled more than twice.', 'warning');
      return;
    }
    selectedTaskForReschedule = task;
    newDeadlineInput = ChronosMath.addDays(getFormattedDate(), 5);
    isRescheduleModalOpen = true;
  }

  async function handleRescheduleSubmit() {
    if (!newDeadlineInput.trim()) {
      store.showToast('Please specify a new deadline.', 'warning');
      return;
    }

    const success = await store.rescheduleTask(
      selectedTaskForReschedule.id,
      newDeadlineInput.trim()
    );

    if (success) {
      isRescheduleModalOpen = false;
      selectedTaskForReschedule = null;
    }
  }

  function openAbortModal(task) {
    selectedTaskForAbort = task;
    abortEndNote = '';
    isAbortModalOpen = true;
  }

  async function handleAbortSubmit() {
    if (!abortEndNote.trim()) {
      store.showToast('Tactical End Note required for abort debrief.', 'warning');
      return;
    }

    const success = await store.archiveTask(
      selectedTaskForAbort.id,
      'Aborted',
      abortEndNote
    );

    if (success) {
      isAbortModalOpen = false;
      selectedTaskForAbort = null;
    }
  }

  async function openSubtasks(task) {
    selectedTaskForSubtasks = task;
    isSubtasksModalOpen = true;
    await loadSubtasks(task.id);
  }

  async function loadSubtasks(taskId) {
    if (!window.electronAPI) return;
    try {
      const res = await window.electronAPI.getSubtasks(taskId);
      if (res.success) {
        subtasksList = res.subtasks || [];
      }
    } catch (e) {
      store.logError(e.message, 'High');
    }
  }

  async function addSubtask() {
    if (!newSubtaskTitle.trim() || !selectedTaskForSubtasks) return;
    try {
      const res = await window.electronAPI.createSubtask({
        taskId: selectedTaskForSubtasks.id,
        title: newSubtaskTitle.trim(),
        creation_time: getFormattedDate(),
        status: 'Initiated'
      });
      if (res.success) {
        newSubtaskTitle = '';
        await loadSubtasks(selectedTaskForSubtasks.id);
      }
    } catch (e) {
      store.logError(e.message, 'High');
    }
  }

  async function cycleSubtaskStatus(subtask) {
    const nextStatus = subtask.status === 'Initiated' ? 'Doing' : subtask.status === 'Doing' ? 'Completed' : 'Initiated';
    try {
      const res = await window.electronAPI.updateSubtaskStatus({
        subtaskId: subtask.id,
        status: nextStatus
      });
      if (res.success) {
        await loadSubtasks(selectedTaskForSubtasks.id);
      }
    } catch (e) {
      store.logError(e.message, 'High');
    }
  }

  async function deleteSubtask(subtaskId) {
    try {
      const res = await window.electronAPI.deleteSubtask(subtaskId);
      if (res.success) {
        await loadSubtasks(selectedTaskForSubtasks.id);
      }
    } catch (e) {
      store.logError(e.message, 'High');
    }
  }

  function handleOverlayKeyDown(e, closeFn) {
    if (e.key === 'Escape') {
      closeFn();
    }
  }
</script>

<div class="view-container">
  <div class="view-header">
    <div class="header-title">
      <AlertTriangle size={22} class="icon-breach" />
      <h2>BREACH OVERDUE STATE ({store.breachTasks.length})</h2>
    </div>
    <p class="header-desc">
      Deadlines exceeded. Victory status is rendered impossible. You must either Reschedule (max 2 permits) or Abort to Archive.
    </p>
  </div>

  {#if store.breachTasks.length === 0}
    <div class="empty-state">
      <AlertTriangle size={48} />
      <h3>NO BREACHED CAMPAIGNS</h3>
      <p>All operational campaigns are within deadline boundaries.</p>
    </div>
  {:else}
    <div class="task-grid">
      {#each store.breachTasks as task}
        <div class="task-card">
          <div class="card-top">
            <span class="badge-tactical badge-critical">BREACHED</span>
            <span class="reschedule-counter">RESCHEDULES: {task.reschedule_count} / 2</span>
          </div>

          <h3 class="task-title">{task.title}</h3>

          <div class="card-meta">
            <span class="meta-item expired"><Clock size={13} /> Missed Deadline: {task.deadline}</span>
            {#if task.reschedule_1}
              <span class="meta-item"><Clock size={13} /> Reschedule 1: {task.reschedule_1}</span>
            {/if}
            {#if task.reschedule_2}
              <span class="meta-item"><Clock size={13} /> Reschedule 2: {task.reschedule_2}</span>
            {/if}
          </div>

          <div class="card-actions">
            <button type="button" class="btn-tactical" onclick={() => openMarkdown(task)} title="Open Strategies Markdown file">
              <FileText size={14} />
              <span>STRATEGIES</span>
            </button>

            <button type="button" class="btn-tactical" onclick={() => openSubtasks(task)} title="Manage micro-steps">
              <CheckSquare size={14} />
              <span>SUBTASKS</span>
            </button>

            <button 
              type="button" 
              class="btn-tactical btn-primary" 
              onclick={() => openRescheduleModal(task)} 
              title={task.reschedule_count >= 2 ? 'Max 2 reschedules reached' : 'Extend deadline'}
            >
              <RotateCcw size={14} />
              <span>RESCHEDULE</span>
            </button>

            <button type="button" class="btn-tactical btn-danger" onclick={() => openAbortModal(task)} title="Abort breached campaign">
              <XCircle size={14} />
              <span>ABORT</span>
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Reschedule Modal -->
{#if isRescheduleModalOpen && selectedTaskForReschedule}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="modal-overlay" 
    onclick={() => isRescheduleModalOpen = false}
    onkeydown={(e) => handleOverlayKeyDown(e, () => isRescheduleModalOpen = false)}
  >
    <div class="modal-card" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <div class="title">
          <RotateCcw size={18} />
          <span>RESCHEDULE PERMIT & PERMIT #{selectedTaskForReschedule.reschedule_count + 1} OF 2</span>
        </div>
        <button type="button" class="close-btn" onclick={() => isRescheduleModalOpen = false} aria-label="Close modal"><X size={16} /></button>
      </div>

      <div class="modal-body">
        <p class="warning-text">
          Rescheduling will restore state to <strong>EXECUTION</strong> and assign a new target deadline. Maximum 2 permits per campaign.
        </p>

        <div class="field-group">
          <label for="new-deadline">NEW TARGET DEADLINE (DD-MM-YYYY) *</label>
          <input 
            id="new-deadline"
            type="text" 
            placeholder="DD-MM-YYYY" 
            bind:value={newDeadlineInput} 
          />
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-tactical" onclick={() => isRescheduleModalOpen = false}>CANCEL</button>
        <button type="button" class="btn-tactical btn-primary" onclick={handleRescheduleSubmit}>ISSUE RESCHEDULE PERMIT</button>
      </div>
    </div>
  </div>
{/if}

<!-- Abort Modal -->
{#if isAbortModalOpen && selectedTaskForAbort}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="modal-overlay" 
    onclick={() => isAbortModalOpen = false}
    onkeydown={(e) => handleOverlayKeyDown(e, () => isAbortModalOpen = false)}
  >
    <div class="modal-card" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header alert-header">
        <div class="title">
          <XCircle size={18} />
          <span>ABORT BREACHED CAMPAIGN & DEBRIEF</span>
        </div>
        <button type="button" class="close-btn" onclick={() => isAbortModalOpen = false} aria-label="Close modal"><X size={16} /></button>
      </div>

      <div class="modal-body">
        <div class="field-group">
          <label for="abort-debrief">TACTICAL END NOTE & FAILURE ANALYSIS *</label>
          <textarea 
            id="abort-debrief"
            rows="4" 
            placeholder="Analyze root cause of breach and document lessons for future campaigns..." 
            bind:value={abortEndNote}
            required
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-tactical" onclick={() => isAbortModalOpen = false}>CANCEL</button>
        <button type="button" class="btn-tactical btn-danger" onclick={handleAbortSubmit}>CONFIRM ABORT & ARCHIVE</button>
      </div>
    </div>
  </div>
{/if}

<!-- Subtasks Modal -->
{#if isSubtasksModalOpen && selectedTaskForSubtasks}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="modal-overlay" 
    onclick={() => isSubtasksModalOpen = false}
    onkeydown={(e) => handleOverlayKeyDown(e, () => isSubtasksModalOpen = false)}
  >
    <div class="modal-card" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <div class="title">
          <CheckSquare size={18} />
          <span>MICRO-STEPS & {selectedTaskForSubtasks.title}</span>
        </div>
        <button type="button" class="close-btn" onclick={() => isSubtasksModalOpen = false} aria-label="Close modal"><X size={16} /></button>
      </div>

      <div class="modal-body">
        <div class="add-subtask-row">
          <input 
            type="text" 
            placeholder="Add new micro-step..." 
            bind:value={newSubtaskTitle} 
            onkeydown={(e) => e.key === 'Enter' && addSubtask()}
          />
          <button type="button" class="btn-tactical btn-primary" onclick={addSubtask}><Plus size={14} /> ADD</button>
        </div>

        <div class="subtask-list">
          {#if subtasksList.length === 0}
            <p class="empty-subtasks">No subtasks found.</p>
          {:else}
            {#each subtasksList as sub}
              <div class="subtask-item {sub.status.toLowerCase()}">
                <button type="button" class="status-toggle" onclick={() => cycleSubtaskStatus(sub)} aria-label="Toggle subtask status">
                  {#if sub.status === 'Completed'}
                    <CheckSquare size={18} class="icon-completed" />
                  {:else}
                    <Square size={18} />
                  {/if}
                </button>

                <div class="subtask-info">
                  <span class="subtask-text">{sub.title}</span>
                  <span class="subtask-status-badge">{sub.status} • {sub.creation_time}</span>
                </div>

                <button type="button" class="delete-btn" onclick={() => deleteSubtask(sub.id)} aria-label="Delete subtask"><Trash2 size={15} /></button>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-tactical" onclick={() => isSubtasksModalOpen = false}>CLOSE</button>
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

  :global(.icon-breach) { color: var(--accent-breach); }

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
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
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
    border-left: 4px solid var(--accent-breach);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .reschedule-counter {
    font-size: 11px;
    font-weight: 800;
    color: var(--text-muted);
  }

  .task-title {
    font-size: 16px;
    font-weight: 900;
    line-height: 1.4;
    color: var(--text-main);
  }

  .card-meta {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 12px;
    font-weight: 600;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-muted);
  }

  .meta-item.expired {
    color: #f87171;
    font-weight: 800;
  }

  .card-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: auto;
    padding-top: 14px;
    border-top: 1px solid var(--border-dim);
  }

  .card-actions button {
    padding: 8px;
    font-size: 11px;
  }

  .card-actions button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Modals */
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
    max-width: 540px;
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

  .alert-header {
    background: #200a0a;
    border-bottom-color: #ef4444;
  }

  .modal-header .title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 900;
    color: var(--accent-execution);
  }

  .alert-header .title { color: #f87171; }
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

  input, textarea {
    padding: 11px;
    font-size: 13px;
    font-weight: 600;
    background: #090c10;
    border-radius: var(--radius-md);
  }

  .add-subtask-row {
    display: flex;
    gap: 10px;
  }

  .add-subtask-row input { flex: 1; }

  .subtask-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 240px;
    overflow-y: auto;
  }

  .empty-subtasks {
    font-size: 12px;
    color: var(--text-muted);
    text-align: center;
    padding: 16px 0;
  }

  .subtask-item {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-md);
    padding: 10px 14px;
  }

  .subtask-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .subtask-text { font-size: 13px; font-weight: 700; }
  .subtask-status-badge { font-size: 10px; font-weight: 700; color: var(--text-dim); }

  :global(.icon-completed) { color: var(--accent-archive); }
  .delete-btn { color: var(--text-muted); }
  .delete-btn:hover { color: #f87171; }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 20px;
    border-top: 1px solid var(--border-dim);
  }
</style>
