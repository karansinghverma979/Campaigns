<script>
  import { store } from '../../lib/store.svelte.js';
  import { ChronosMath, getFormattedDate } from '../../lib/ChronosMath.js';
  import { 
    Flame, 
    FileText, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Plus, 
    CheckSquare, 
    Square, 
    Trash2, 
    Tag as TagIcon,
    AlertCircle,
    X
  } from 'lucide-svelte';

  // Subtasks drawer/modal state
  let selectedTaskForSubtasks = $state(null);
  let subtasksList = $state([]);
  let newSubtaskTitle = $state('');
  let isSubtasksModalOpen = $state(false);

  // Archive End Note Modal state
  let selectedTaskForArchive = $state(null);
  let archiveType = $state('Victory'); // 'Victory' or 'Aborted'
  let endNoteText = $state('');
  let isArchiveModalOpen = $state(false);

  // Rule violation modal
  let isViolationModalOpen = $state(false);

  function openMarkdown(task) {
    store.openStrategiesFile(task);
  }

  function triggerRuleViolation() {
    isViolationModalOpen = true;
  }

  function handleViolationKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      triggerRuleViolation();
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

  function openArchiveModal(task, type) {
    selectedTaskForArchive = task;
    archiveType = type;
    endNoteText = '';
    isArchiveModalOpen = true;
  }

  async function handleArchiveSubmit() {
    if (!endNoteText.trim()) {
      store.showToast('Tactical End Note is strictly required.', 'warning');
      return;
    }

    const success = await store.archiveTask(
      selectedTaskForArchive.id,
      archiveType,
      endNoteText
    );

    if (success) {
      isArchiveModalOpen = false;
      selectedTaskForArchive = null;
    }
  }

  function handleModalOverlayKeyDown(e, closeFn) {
    if (e.key === 'Escape') {
      closeFn();
    }
  }
</script>

<div class="view-container">
  <div class="view-header">
    <div class="header-title">
      <Flame size={22} class="icon-execution" />
      <h2>EXECUTION BATTLEFIELD ACTIVE ({store.executionTasks.length})</h2>
    </div>
    <p class="header-desc">
      Active operational theater. Task parameters (Title, Priority, Tags) are permanently locked.
    </p>
  </div>

  {#if store.executionTasks.length === 0}
    <div class="empty-state">
      <Flame size={48} />
      <h3>NO ACTIVE CAMPAIGNS IN EXECUTION</h3>
      <p>Deploy a campaign from Arsenal by assigning a deadline.</p>
    </div>
  {:else}
    <div class="task-grid">
      {#each store.executionTasks as task}
        {@const daysLeft = ChronosMath.daysRemaining(task.deadline)}
        <div class="task-card">
          <div class="card-top">
            <span class="badge-tactical badge-{task.priority.toLowerCase()}">{task.priority}</span>
            <div class="days-pill" class:urgent={daysLeft <= 2}>
              <Clock size={12} />
              <span>{daysLeft < 0 ? 'OVERDUE' : `${daysLeft} DAYS LEFT`}</span>
            </div>
          </div>

          <button 
            type="button" 
            class="title-btn" 
            onclick={triggerRuleViolation} 
            onkeydown={handleViolationKeyDown}
            title="Click to view lock rule parameters"
          >
            <h3 class="task-title">{task.title}</h3>
          </button>

          <div class="card-meta">
            <span class="meta-item"><Clock size={13} /> Initiated: {task.initiated_at || task.origin_date}</span>
            <span class="meta-item highlight"><Clock size={13} /> Target Deadline: {task.deadline}</span>
          </div>

          {#if task.tags && task.tags.length > 0}
            <button 
              type="button" 
              class="tag-btn-wrapper" 
              onclick={triggerRuleViolation}
              onkeydown={handleViolationKeyDown}
            >
              <div class="tag-row">
                {#each task.tags as tag}
                  <span class="tag"><TagIcon size={11} /> {tag.tag_name}</span>
                {/each}
              </div>
            </button>
          {/if}

          <div class="card-actions">
            <button type="button" class="btn-tactical" onclick={() => openMarkdown(task)} title="Open Strategies Markdown file">
              <FileText size={14} />
              <span>STRATEGIES</span>
            </button>

            <button type="button" class="btn-tactical" onclick={() => openSubtasks(task)} title="Manage micro-step subtasks">
              <CheckSquare size={14} />
              <span>SUBTASKS</span>
            </button>

            <button type="button" class="btn-tactical btn-success" onclick={() => openArchiveModal(task, 'Victory')} title="Mark Mission Complete">
              <CheckCircle2 size={14} />
              <span>VICTORY</span>
            </button>

            <button type="button" class="btn-tactical btn-danger" onclick={() => openArchiveModal(task, 'Aborted')} title="Abort Mission">
              <XCircle size={14} />
              <span>ABORT</span>
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Rule Violation Modal -->
{#if isViolationModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="modal-overlay" 
    onclick={() => isViolationModalOpen = false}
    onkeydown={(e) => handleModalOverlayKeyDown(e, () => isViolationModalOpen = false)}
  >
    <div class="modal-card violation-card" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header alert-header">
        <div class="title">
          <AlertCircle size={18} />
          <span>TACTICAL RULE VIOLATION & ACTION BLOCKED</span>
        </div>
        <button type="button" class="close-btn" onclick={() => isViolationModalOpen = false} aria-label="Close modal"><X size={16} /></button>
      </div>

      <div class="modal-body">
        <p class="alert-message">
          <strong>ENGAGEMENT PROTOCOL LOCKDOWN:</strong> Basic details (Title, Priority, Tags) are strictly immutable during <strong>EXECUTION</strong> phase.
        </p>
        <p class="alert-sub">To maintain mission discipline, parameters cannot be modified once troops are deployed.</p>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-tactical btn-primary" onclick={() => isViolationModalOpen = false}>ACKNOWLEDGE</button>
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
    onkeydown={(e) => handleModalOverlayKeyDown(e, () => isSubtasksModalOpen = false)}
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
            placeholder="Add new operational micro-step..." 
            bind:value={newSubtaskTitle} 
            onkeydown={(e) => e.key === 'Enter' && addSubtask()}
          />
          <button type="button" class="btn-tactical btn-primary" onclick={addSubtask}><Plus size={14} /> ADD</button>
        </div>

        <div class="subtask-list">
          {#if subtasksList.length === 0}
            <p class="empty-subtasks">No subtasks defined. Break down the mission into executable steps.</p>
          {:else}
            {#each subtasksList as sub}
              <div class="subtask-item {sub.status.toLowerCase()}">
                <button type="button" class="status-toggle" onclick={() => cycleSubtaskStatus(sub)} aria-label="Toggle subtask status">
                  {#if sub.status === 'Completed'}
                    <CheckSquare size={18} class="icon-completed" />
                  {:else if sub.status === 'Doing'}
                    <Square size={18} class="icon-doing" />
                  {:else}
                    <Square size={18} class="icon-initiated" />
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

<!-- Archive End Note Modal -->
{#if isArchiveModalOpen && selectedTaskForArchive}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="modal-overlay" 
    onclick={() => isArchiveModalOpen = false}
    onkeydown={(e) => handleModalOverlayKeyDown(e, () => isArchiveModalOpen = false)}
  >
    <div class="modal-card" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <div class="title">
          {#if archiveType === 'Victory'}
            <CheckCircle2 size={18} class="icon-completed" />
            <span>MISSION DEBRIEF & VICTORY ARCHIVE</span>
          {:else}
            <XCircle size={18} class="icon-aborted" />
            <span>TACTICAL ABORT & ARCHIVE REVIEW</span>
          {/if}
        </div>
        <button type="button" class="close-btn" onclick={() => isArchiveModalOpen = false} aria-label="Close modal"><X size={16} /></button>
      </div>

      <div class="modal-body">
        <p class="debrief-instructions">
          A mandatory <strong>Tactical End Note</strong> is required for self-reflection and post-operation review before transitioning to Archive.
        </p>

        <div class="field-group">
          <label for="debrief-text">TACTICAL END NOTE & AFTER ACTION REVIEW *</label>
          <textarea 
            id="debrief-text"
            rows="4" 
            placeholder="Record lessons learned, operational outcome, key achievements, or reason for abortion..." 
            bind:value={endNoteText}
            required
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-tactical" onclick={() => isArchiveModalOpen = false}>CANCEL</button>
        {#if archiveType === 'Victory'}
          <button type="button" class="btn-tactical btn-success" onclick={handleArchiveSubmit}>CONFIRM VICTORY & ARCHIVE</button>
        {:else}
          <button type="button" class="btn-tactical btn-danger" onclick={handleArchiveSubmit}>CONFIRM ABORT & ARCHIVE</button>
        {/if}
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

  :global(.icon-execution) { color: var(--accent-execution); }

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
    border-left: 4px solid var(--accent-execution);
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

  .days-pill {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 800;
    color: #60a5fa;
    background: rgba(59, 130, 246, 0.15);
    padding: 3px 10px;
    border-radius: 99px;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  .days-pill.urgent {
    color: #f87171;
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.4);
  }

  .title-btn {
    text-align: left;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
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
    color: var(--text-muted);
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .meta-item.highlight {
    color: #93c5fd;
    font-weight: 800;
  }

  .tag-btn-wrapper {
    background: none;
    border: none;
    padding: 0;
    text-align: left;
    cursor: pointer;
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

  .violation-card {
    border-color: #ef4444;
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

  .alert-header .title {
    color: #f87171;
  }

  .close-btn { color: var(--text-muted); }

  .modal-body {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .alert-message {
    font-size: 13px;
    font-weight: 700;
    color: #f87171;
    line-height: 1.5;
  }

  .alert-sub {
    font-size: 12px;
    color: var(--text-muted);
  }

  .add-subtask-row {
    display: flex;
    gap: 10px;
  }

  .add-subtask-row input {
    flex: 1;
    padding: 10px 14px;
    font-size: 13px;
    background: #090c10;
  }

  .subtask-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 260px;
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

  .subtask-text {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-main);
  }

  .subtask-item.completed .subtask-text {
    text-decoration: line-through;
    color: var(--text-muted);
  }

  .subtask-status-badge {
    font-size: 10px;
    font-weight: 700;
    color: var(--text-dim);
  }

  :global(.icon-completed) { color: var(--accent-archive); }
  :global(.icon-doing) { color: var(--accent-chronos); }
  :global(.icon-initiated) { color: var(--text-muted); }
  :global(.icon-aborted) { color: var(--text-muted); }

  .delete-btn { color: var(--text-muted); }
  .delete-btn:hover { color: #f87171; }

  .debrief-instructions {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-main);
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

  textarea {
    padding: 12px;
    font-size: 13px;
    font-weight: 600;
    background: #090c10;
    border-radius: var(--radius-md);
    resize: vertical;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 20px;
    border-top: 1px solid var(--border-dim);
  }
</style>
