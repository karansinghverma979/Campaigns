<script>
  import { store } from '../../../lib/store.svelte.js';
  import { ChronosMath, getFormattedDate } from '../../../lib/ChronosMath.js';
  import { 
    Flame, FileText, CheckCircle2, XCircle, Clock, Plus, 
    CheckSquare, Square, Trash2, Tag as TagIcon, AlertCircle, 
    X, ChevronUp, Calendar, AlertTriangle, RefreshCw
  } from 'lucide-svelte';

  let { task, onClose } = $props();

  // Subtasks state & highlight
  let subtasks = $state([]);
  let newSubtaskTitle = $state('');
  let isAddingSubtask = $state(false);
  let highlightedSubtaskId = $state(null);
  let subtaskInputRef = $state(null);

  // Archive End Note Modal state
  let archiveType = $state('Victory'); // 'Victory' or 'Aborted'
  let endNoteText = $state('');
  let isArchiveModalOpen = $state(false);

  // Reschedule Modal state
  let isRescheduleModalOpen = $state(false);
  let newRescheduleDateIso = $state('');

  // Days remaining calculation with safe fallback
  const daysLeft = $derived(task && task.deadline ? ChronosMath.daysRemaining(task.deadline) : 0);
  const taskPriority = $derived((task && task.priority) ? task.priority : 'Medium');
  const taskPriorityLower = $derived(taskPriority.toLowerCase() === 'critical' ? 'high' : taskPriority.toLowerCase());

  // Compute today's ISO string (YYYY-MM-DD) for min attribute of date picker
  const todayIso = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();

  function formatDisplayDate(isoDate) {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  // Load subtasks for active task
  $effect(() => {
    if (task && task.id) {
      loadSubtasks();
    }
  });

  async function loadSubtasks() {
    if (!task || !task.id) return;
    try {
      const res = await window.electronAPI.getSubtasks(task.id);
      if (res.success) {
        subtasks = res.subtasks || [];
      }
    } catch (e) {
      console.error('Error loading subtasks:', e);
    }
  }

  function triggerSubtaskHighlight(subtaskId) {
    highlightedSubtaskId = subtaskId;
    setTimeout(() => {
      if (highlightedSubtaskId === subtaskId) {
        highlightedSubtaskId = null;
      }
    }, 2800);
  }

  function scrollSubtaskIfHighlighted(node, isHighlighted) {
    if (isHighlighted) {
      setTimeout(() => {
        node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
    }
    return {
      update(nextState) {
        if (nextState) {
          setTimeout(() => {
            node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 60);
        }
      }
    };
  }

  async function addSubtask(e) {
    if (e && e.preventDefault) e.preventDefault();
    const titleTrimmed = newSubtaskTitle.trim();
    if (!titleTrimmed || !task || !task.id) return;

    try {
      isAddingSubtask = true;
      const res = await window.electronAPI.createSubtask({
        taskId: task.id,
        title: titleTrimmed,
        creation_time: getFormattedDate(),
        status: 'Initiated'
      });
      if (res.success) {
        newSubtaskTitle = '';
        await loadSubtasks();
        if (res.subtask && res.subtask.id) {
          triggerSubtaskHighlight(res.subtask.id);
        } else if (subtasks.length > 0) {
          triggerSubtaskHighlight(subtasks[subtasks.length - 1].id);
        }
        store.showToast('Subtask added.', 'info');
        // Retain focus for instant sequential typing
        setTimeout(() => {
          if (subtaskInputRef) subtaskInputRef.focus();
        }, 50);
      } else {
        store.showToast('Failed to add subtask: ' + res.error, 'danger');
      }
    } catch (e) {
      store.showToast('Error: ' + e.message, 'danger');
    } finally {
      isAddingSubtask = false;
    }
  }

  async function toggleSubtaskStatus(subtask) {
    const nextStatus = subtask.status === 'Completed' ? 'Initiated' : 'Completed';
    try {
      const res = await window.electronAPI.updateSubtaskStatus({
        subtaskId: subtask.id,
        status: nextStatus
      });
      if (res.success) {
        triggerSubtaskHighlight(subtask.id);
        await loadSubtasks();
      }
    } catch (e) {
      store.showToast('Failed to update subtask: ' + e.message, 'danger');
    }
  }

  async function deleteSubtask(subtaskId) {
    try {
      const res = await window.electronAPI.deleteSubtask(subtaskId);
      if (res.success) {
        subtasks = subtasks.filter(s => s.id !== subtaskId);
        store.showToast('Subtask deleted.', 'info');
      }
    } catch (e) {
      store.showToast('Failed to delete subtask: ' + e.message, 'danger');
    }
  }

  function moveSubtaskUp(index) {
    if (index <= 0) return;
    const updated = [...subtasks];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    subtasks = updated;
    triggerSubtaskHighlight(subtasks[index - 1].id);
  }

  function openMarkdown() { 
    if (task) store.openStrategiesFile(task); 
  }

  function openArchiveModal(type) {
    archiveType = type;
    endNoteText = '';
    isArchiveModalOpen = true;
  }

  async function handleArchiveSubmit() {
    if (!endNoteText.trim()) {
      store.showToast('Tactical End Note is mandatory before Archiving.', 'warning');
      return;
    }

    if (!task) return;
    const success = await store.archiveTask(
      task.id,
      archiveType,
      endNoteText
    );

    if (success) {
      isArchiveModalOpen = false;
      onClose();
    }
  }

  function openRescheduleModal() {
    if (task && task.reschedule_count >= 2) {
      store.showToast('Tactical Block: Maximum 2 reschedule permits allowed per campaign.', 'warning');
      return;
    }
    newRescheduleDateIso = todayIso;
    isRescheduleModalOpen = true;
  }

  async function confirmReschedule() {
    if (!newRescheduleDateIso) {
      store.showToast('Select a valid new deadline date.', 'warning');
      return;
    }
    const parts = newRescheduleDateIso.split('-');
    if (parts.length !== 3) {
      store.showToast('Invalid date format.', 'warning');
      return;
    }
    const formattedDeadline = `${parts[2]}-${parts[1]}-${parts[0]}`;

    if (!task) return;
    const success = await store.rescheduleTask(task.id, formattedDeadline);
    if (success) {
      isRescheduleModalOpen = false;
      store.setHighlightedTaskId(task.id);
      onClose();
    }
  }

  let focusedSubtaskIndex = $state(-1);

  function handleKey(e) { 
    const key = e.key.toLowerCase();
    const active = document.activeElement;
    const isInputFocused = active && (
      active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable
    );

    if (e.key === 'Escape') {
      if (isArchiveModalOpen) {
        isArchiveModalOpen = false;
      } else if (isRescheduleModalOpen) {
        isRescheduleModalOpen = false;
      } else {
        onClose();
      }
      return;
    }

    if (!isInputFocused && !isArchiveModalOpen && !isRescheduleModalOpen && subtasks.length > 0) {
      if (key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        focusedSubtaskIndex = (focusedSubtaskIndex + 1) % subtasks.length;
        triggerSubtaskHighlight(subtasks[focusedSubtaskIndex].id);
        return;
      }
      if (key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        focusedSubtaskIndex = focusedSubtaskIndex <= 0 ? subtasks.length - 1 : focusedSubtaskIndex - 1;
        triggerSubtaskHighlight(subtasks[focusedSubtaskIndex].id);
        return;
      }
      if (e.key === ' ' || e.key === 'Spacebar') {
        if (focusedSubtaskIndex >= 0 && focusedSubtaskIndex < subtasks.length) {
          e.preventDefault();
          cycleSubtaskStatus(subtasks[focusedSubtaskIndex]);
          return;
        }
      }
    }
  }
</script>

<svelte:window onkeydown={handleKey} />

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="backdrop" onclick={onClose}></div>

<!-- Expanded Sidebar Panel (540px width) -->
<div class="panel right">
  
  <!-- Header -->
  <div class="panel-header">
    <div class="header-left">
      <span class="priority-dot {taskPriorityLower}"></span>
      <span class="stage-label">EXECUTION OPERATIONAL THEATER</span>
    </div>
    <button class="close-btn" onclick={onClose} aria-label="Close panel"><X size={16} strokeWidth={2.5} /></button>
  </div>

  <div class="panel-body">
    <!-- Campaign Title -->
    <h2 class="task-title">{task ? task.title : ''}</h2>

    <!-- Meta Info & Deadline Badge Row -->
    <div class="meta-row">
      <span class="badge-tactical badge-{taskPriorityLower}">{taskPriority === 'Critical' ? 'High' : taskPriority} PRIORITY</span>
      <div class="days-pill" class:urgent={daysLeft <= 2} class:overdue={daysLeft < 0}>
        <Clock size={13} />
        <span>{daysLeft < 0 ? 'OVERDUE' : `${daysLeft} DAYS LEFT`}</span>
      </div>
    </div>

    <!-- Date Badges Row -->
    <div class="date-badges-row">
      <span class="date-badge"><Calendar size={12} /> Logged: {task ? task.origin_date : ''}</span>
      <span class="date-badge deadline"><Clock size={12} /> Target Deadline: {task ? task.deadline : ''}</span>
      <span class="date-badge permit">Permits: [{task ? (task.reschedule_count || 0) : 0}/2]</span>
    </div>

    <!-- Tags Section -->
    {#if task && task.tags && task.tags.length > 0}
      <div class="tags-section">
        <span class="section-label">TAGS & CLASSIFICATIONS</span>
        <div class="tags-row">
          {#each task.tags as tag}
            <span class="tag"><TagIcon size={11} /> {tag.tag_name}</span>
          {/each}
        </div>
      </div>
    {/if}

    <div class="section-divider"></div>

    <!-- OPEN AREA SUBTASKS MODULE (Fills 100% of open space above bottom action buttons) -->
    <div class="open-subtasks-section">
      <div class="subtasks-header">
        <div class="subtasks-title-wrap">
          <ListTodo size={17} class="subtasks-icon" />
          <span class="section-label">TACTICAL SUBTASKS</span>
        </div>
        <span class="subtasks-counter">
          [{subtasks.filter(s => s.status === 'Completed').length}/{subtasks.length}]
        </span>
      </div>

      <!-- Add Subtask Input Row -->
      <div class="subtask-add-row">
        <input 
          bind:this={subtaskInputRef}
          type="text" 
          placeholder="Enter new tactical subtask & press Enter..." 
          bind:value={newSubtaskTitle}
          onkeydown={(e) => e.key === 'Enter' && addSubtask(e)}
          class="subtask-input"
        />
        <button 
          type="button" 
          class="btn-add-subtask" 
          onclick={(e) => addSubtask(e)}
          disabled={isAddingSubtask || !newSubtaskTitle.trim()}
          title="Add Subtask (Enter)"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>ADD</span>
        </button>
      </div>

      <!-- Subtasks List in Open Area (Fills 100% remaining height, 15px Bold Font) -->
      <div class="open-subtasks-scroll">
        {#if subtasks.length === 0}
          <div class="empty-subtasks">
            <span>No subtasks logged yet. Add subtasks to organize granular mission steps.</span>
          </div>
        {:else}
          {#each subtasks as subtask, idx (subtask.id)}
            <div 
              class="subtask-item-card" 
              class:completed={subtask.status === 'Completed'}
              class:just-updated-subtask={highlightedSubtaskId === subtask.id}
              use:scrollSubtaskIfHighlighted={highlightedSubtaskId === subtask.id}
            >
              <!-- Checkbox Toggle -->
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="subtask-cb" onclick={() => toggleSubtaskStatus(subtask)}>
                {#if subtask.status === 'Completed'}
                  <CheckSquare size={17} class="cb-icon-done" />
                {:else}
                  <Square size={17} class="cb-icon-pending" />
                {/if}
              </div>

              <!-- Title (15px Bold Crisp Font) -->
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <span class="subtask-title-text" onclick={() => toggleSubtaskStatus(subtask)}>
                {subtask.title}
              </span>

              <!-- Actions: ONLY UP BUTTON & DELETE BUTTON -->
              <div class="subtask-actions">
                <button 
                  type="button" 
                  class="subtask-order-btn" 
                  onclick={() => moveSubtaskUp(idx)}
                  disabled={idx === 0}
                  title="Move Up"
                >
                  <ChevronUp size={15} />
                </button>
                <button 
                  type="button" 
                  class="subtask-delete-btn" 
                  onclick={() => deleteSubtask(subtask.id)}
                  title="Delete Subtask"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>

  </div>

  <!-- Actions Footer -->
  <div class="panel-actions">
    <button class="btn-tactical" onclick={openMarkdown}>
      <FileText size={14} /> STRATEGIES (.MD)
    </button>
    
    <button 
      class="btn-tactical btn-reschedule" 
      onclick={openRescheduleModal}
      disabled={task && task.reschedule_count >= 2}
      title={task && task.reschedule_count >= 2 ? 'Maximum 2 reschedule permits used' : 'Reschedule execution deadline'}
    >
      <RefreshCw size={14} /> RESCHEDULE [{task ? (task.reschedule_count || 0) : 0}/2]
    </button>

    <button class="btn-tactical btn-victory" onclick={() => openArchiveModal('Victory')}>
      <CheckCircle2 size={14} /> VICTORY
    </button>

    <button class="btn-tactical btn-abort" onclick={() => openArchiveModal('Aborted')}>
      <XCircle size={14} /> ABORT
    </button>
  </div>
</div>

<!-- RESCHEDULE DEADLINE MODAL OVERLAY -->
{#if isRescheduleModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="deploy-modal-overlay" onclick={() => isRescheduleModalOpen = false}>
    <div class="deploy-modal-dialog" onclick={(e) => e.stopPropagation()}>
      <div class="deploy-dialog-header">
        <div class="deploy-icon-box">
          <RefreshCw size={24} strokeWidth={2.5} class="deploy-dialog-icon" />
        </div>
        <div>
          <h3 class="deploy-dialog-title">RESCHEDULE EXECUTION DEADLINE</h3>
          <p class="deploy-dialog-sub">Permit Count: [{task ? (task.reschedule_count || 0) : 0}/2 Used]</p>
        </div>
        <button type="button" class="close-dialog-btn" onclick={() => isRescheduleModalOpen = false}>
          <X size={18} />
        </button>
      </div>

      <div class="deploy-dialog-body">
        <div class="deploy-warning-banner">
          <AlertTriangle size={18} class="warn-icon" />
          <span>Rescheduling extends the operational deadline and increments your tactical reschedule permit count.</span>
        </div>

        <div class="deploy-field">
          <div class="label-row-deploy">
            <label for="modal-reschedule-calendar">SELECT NEW TARGET DEADLINE (MIN: TODAY)</label>
            {#if newRescheduleDateIso}
              <span class="selected-date-badge">NEW: {formatDisplayDate(newRescheduleDateIso)}</span>
            {/if}
          </div>

          <div class="calendar-input-wrapper-large">
            <div class="calendar-icon-box">
              <Calendar size={22} class="calendar-icon-large" />
            </div>
            <input 
              id="modal-reschedule-calendar" 
              type="date" 
              min={todayIso}
              bind:value={newRescheduleDateIso} 
              class="calendar-picker-ultra"
            />
          </div>
        </div>
      </div>

      <div class="deploy-dialog-footer">
        <button type="button" class="btn-tactical btn-abort-btn" onclick={() => isRescheduleModalOpen = false}>
          CANCEL
        </button>
        <button type="button" class="btn-tactical btn-deploy-confirm" onclick={confirmReschedule}>
          <RefreshCw size={16} /> CONFIRM RESCHEDULE
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ARCHIVE END NOTE MANDATORY MODAL OVERLAY -->
{#if isArchiveModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="deploy-modal-overlay" onclick={() => isArchiveModalOpen = false}>
    <div class="deploy-modal-dialog" onclick={(e) => e.stopPropagation()}>
      <div class="deploy-dialog-header {archiveType.toLowerCase()}">
        <div class="deploy-icon-box {archiveType.toLowerCase()}">
          {#if archiveType === 'Victory'}
            <CheckCircle2 size={24} strokeWidth={2.5} class="victory-icon" />
          {:else}
            <XCircle size={24} strokeWidth={2.5} class="abort-icon" />
          {/if}
        </div>
        <div>
          <h3 class="deploy-dialog-title">CONFIRM {archiveType.toUpperCase()} ARCHIVE</h3>
          <p class="deploy-dialog-sub">Mandatory tactical End Note required before archiving</p>
        </div>
        <button type="button" class="close-dialog-btn" onclick={() => isArchiveModalOpen = false}>
          <X size={18} />
        </button>
      </div>

      <div class="deploy-dialog-body">
        <div class="deploy-field">
          <label for="archive-end-note-input">TACTICAL END NOTE (LESSONS / OUTCOME LOG)</label>
          <textarea
            id="archive-end-note-input"
            bind:value={endNoteText}
            placeholder="Log tactical outcome notes, lessons learned, or reason for mission completion/abort..."
            rows="4"
            class="end-note-textarea"
          ></textarea>
        </div>
      </div>

      <div class="deploy-dialog-footer">
        <button type="button" class="btn-tactical btn-abort-btn" onclick={() => isArchiveModalOpen = false}>
          CANCEL
        </button>
        <button 
          type="button" 
          class="btn-tactical {archiveType === 'Victory' ? 'btn-victory-confirm' : 'btn-abort-confirm'}" 
          onclick={handleArchiveSubmit}
        >
          {#if archiveType === 'Victory'}
            <CheckCircle2 size={16} /> ARCHIVE AS VICTORY
          {:else}
            <XCircle size={16} /> ARCHIVE AS ABORTED
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed; inset: 0; z-index: 8000;
    background: rgba(4, 7, 14, 0.65);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    animation: fade-in 0.18s ease;
  }

  /* EXPANDED SIDEBAR (540px width) */
  .panel {
    position: fixed; top: 64px; bottom: 0;
    width: 540px; 
    max-width: 90vw;
    z-index: 8001;
    background: rgba(10, 15, 26, 0.98);
    backdrop-filter: blur(36px);
    -webkit-backdrop-filter: blur(36px);
    display: flex; flex-direction: column;
    box-shadow: -12px 0 60px rgba(0,0,0,0.85);
  }

  .panel.right {
    right: 0;
    border-left: 1px solid rgba(239,68,68,0.35);
    animation: slide-in-right 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes fade-in { from { opacity:0; } to { opacity:1; } }
  @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }

  .panel-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 24px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background: rgba(239,68,68,0.08);
    flex-shrink: 0;
  }
  .header-left { display: flex; align-items: center; gap: 12px; }
  .priority-dot {
    width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
  }
  .priority-dot.high     { background: #ef4444; box-shadow: 0 0 10px rgba(239,68,68,0.6); }
  .priority-dot.medium   { background: #f59e0b; box-shadow: 0 0 10px rgba(245,158,11,0.6); }
  .priority-dot.low      { background: #3b82f6; box-shadow: 0 0 10px rgba(59,130,246,0.6); }
  
  .stage-label {
    font-size: 11.5px; font-weight: 900; letter-spacing: 0.10em; word-spacing: 0.08em;
    color: #fca5a5; text-transform: uppercase;
  }
  
  .close-btn { 
    color: var(--text-muted); border-radius: 50%; width:32px; height:32px; 
    display:flex; align-items:center; justify-content:center; transition: all 0.15s ease;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
    cursor: pointer;
  }
  .close-btn:hover { background: rgba(239,68,68,0.22); color: #f87171; border-color: rgba(239,68,68,0.4); }

  .panel-body { flex: 1; overflow-y: auto; padding: 24px 28px; display: flex; flex-direction: column; gap: 18px; }

  .task-title { 
    font-size: 21px; font-weight: 900; color: #f3e8ff; line-height: 1.35; 
    letter-spacing: 0.02em; word-spacing: 0.04em; word-break: break-word;
  }

  .meta-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  
  .days-pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 12px; border-radius: 99px; font-size: 11.5px; font-weight: 900;
    color: #34d399; background: rgba(52, 211, 153, 0.12); border: 1px solid rgba(52, 211, 153, 0.35);
  }
  .days-pill.urgent { color: #f59e0b; background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.40); }
  .days-pill.overdue { color: #f87171; background: rgba(239, 68, 68, 0.20); border-color: rgba(239, 68, 68, 0.50); }

  .date-badges-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .date-badge {
    font-size: 11.5px; font-weight: 700; color: var(--text-muted);
    display: inline-flex; align-items: center; gap: 5px;
    background: rgba(255, 255, 255, 0.04); padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);
  }
  .date-badge.deadline { color: #fca5a5; background: rgba(239, 68, 68, 0.12); border-color: rgba(239, 68, 68, 0.25); }
  .date-badge.permit { color: #c4b5fd; background: rgba(139, 92, 246, 0.12); border-color: rgba(139, 92, 246, 0.25); }

  .tags-section { display: flex; flex-direction: column; gap: 8px; }
  .section-label { font-size: 10.5px; font-weight: 900; letter-spacing: 0.10em; word-spacing: 0.08em; color: var(--text-dim); }
  .tags-row { display: flex; flex-wrap: wrap; gap: 7px; }
  .tag { display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:800; color:#ddd6fe; background: rgba(139,92,246,0.15); padding:5px 12px; border-radius:99px; border:1px solid rgba(139,92,246,0.30); }

  .section-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 2px 0; }

  /* ── OPEN AREA SUBTASKS MODULE (Fills ALL open space above bottom buttons) ── */
  .open-subtasks-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
  }

  .subtasks-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .subtasks-title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  :global(.subtasks-icon) {
    color: #fca5a5;
  }

  .subtasks-counter {
    font-size: 11.5px;
    font-weight: 900;
    color: #fca5a5;
    letter-spacing: 0.06em;
  }

  .subtask-add-row {
    display: flex;
    gap: 10px;
  }

  .subtask-input {
    flex: 1;
    padding: 11px 16px;
    font-size: 13px;
    font-weight: 700;
    background: rgba(6, 10, 18, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    color: var(--text-main);
    transition: all 0.15s ease;
  }
  .subtask-input:focus {
    border-color: rgba(239, 68, 68, 0.65);
    outline: none;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.18);
  }

  .btn-add-subtask {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 11px 18px;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.06em;
    color: #ffffff;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.4), rgba(220, 38, 38, 0.3));
    border: 1px solid rgba(239, 68, 68, 0.55);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .btn-add-subtask:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.6), rgba(220, 38, 38, 0.5));
    border-color: rgba(239, 68, 68, 0.85);
    box-shadow: 0 0 16px rgba(239, 68, 68, 0.35);
  }
  .btn-add-subtask:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Subtasks List in Open Area (Fills 100% available height, 15px Bold Font) */
  .open-subtasks-scroll {
    flex: 1;
    min-height: 240px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 9px;
    padding-right: 4px;
  }

  .open-subtasks-scroll::-webkit-scrollbar {
    width: 5px;
  }
  .open-subtasks-scroll::-webkit-scrollbar-thumb {
    background: rgba(239, 68, 68, 0.45);
    border-radius: 99px;
  }

  .empty-subtasks {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-dim);
    padding: 18px 0;
  }

  .subtask-item-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    transition: all 0.15s ease;
  }
  .subtask-item-card:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(239, 68, 68, 0.35);
  }
  .subtask-item-card.completed {
    opacity: 0.55;
    background: rgba(0, 0, 0, 0.25);
  }
  .subtask-item-card.completed .subtask-title-text {
    text-decoration: line-through;
    color: var(--text-dim);
  }
  .subtask-item-card.just-updated-subtask {
    animation: subtaskPulse 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    border-color: rgba(168, 85, 247, 0.85) !important;
  }

  @keyframes subtaskPulse {
    0%   { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.8), 0 0 24px rgba(168, 85, 247, 0.5); transform: scale(1.02); }
    50%  { box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.4); transform: scale(1.01); }
    100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0); transform: scale(1); }
  }

  .subtask-cb {
    cursor: pointer;
    display: flex;
    align-items: center;
  }
  :global(.cb-icon-done) { color: #34d399; }
  :global(.cb-icon-pending) { color: var(--text-dim); }

  /* 15px Crisp Bold Font for Subtasks */
  .subtask-title-text {
    flex: 1;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 0.01em;
    color: var(--text-main);
    cursor: pointer;
    word-break: break-word;
  }

  .subtask-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* ONLY UP BUTTON & DELETE BUTTON */
  .subtask-order-btn, .subtask-delete-btn {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.10);
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .subtask-order-btn:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.25);
    color: #fca5a5;
    border-color: rgba(239, 68, 68, 0.45);
  }
  .subtask-order-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .subtask-delete-btn:hover {
    background: rgba(239, 68, 68, 0.22);
    color: #fca5a5;
    border-color: rgba(239, 68, 68, 0.45);
  }

  /* Panel Actions Footer */
  .panel-actions {
    padding: 18px 24px; 
    border-top: 1px solid rgba(255,255,255,0.08);
    display: flex; gap: 10px; flex-wrap: wrap;
    background: rgba(0,0,0,0.3);
    flex-shrink: 0;
  }

  .btn-tactical {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 11px 16px;
    font-size: 11.5px;
    font-weight: 900;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.15s ease;
    flex: 1;
  }
  .btn-tactical:hover {
    background: rgba(255, 255, 255, 0.09);
    color: var(--text-main);
    border-color: rgba(255, 255, 255, 0.22);
  }

  .btn-reschedule {
    color: #fde68a;
    background: rgba(245, 158, 11, 0.15);
    border-color: rgba(245, 158, 11, 0.45);
  }
  .btn-reschedule:hover:not(:disabled) {
    background: rgba(245, 158, 11, 0.35);
    box-shadow: 0 0 16px rgba(245, 158, 11, 0.35);
  }
  .btn-reschedule:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .btn-victory {
    color: #a7f3d0;
    background: rgba(52, 211, 153, 0.18);
    border-color: rgba(52, 211, 153, 0.45);
  }
  .btn-victory:hover {
    background: rgba(52, 211, 153, 0.35);
    box-shadow: 0 0 16px rgba(52, 211, 153, 0.35);
  }

  .btn-abort {
    color: #fca5a5;
    background: rgba(239, 68, 68, 0.18);
    border-color: rgba(239, 68, 68, 0.45);
  }
  .btn-abort:hover {
    background: rgba(239, 68, 68, 0.35);
    box-shadow: 0 0 16px rgba(239, 68, 68, 0.35);
  }

  /* MODAL OVERLAYS */
  .deploy-modal-overlay {
    position: fixed;
    top: 64px;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 9500;
    background: rgba(4, 7, 14, 0.88);
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    animation: fade-in 0.18s ease;
  }

  .deploy-modal-dialog {
    width: 580px;
    max-width: 92vw;
    background: rgba(12, 17, 29, 0.98);
    border: 1px solid rgba(245, 158, 11, 0.45);
    border-radius: 24px;
    box-shadow: 0 28px 72px rgba(0, 0, 0, 0.95), 0 0 40px rgba(245, 158, 11, 0.25);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: dialogIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes dialogIn {
    from { opacity: 0; transform: scale(0.95) translateY(12px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }

  .deploy-dialog-header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 22px 30px;
    background: rgba(245, 158, 11, 0.08);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .deploy-dialog-header.victory {
    background: rgba(52, 211, 153, 0.08);
  }
  .deploy-dialog-header.aborted {
    background: rgba(239, 68, 68, 0.08);
  }

  .deploy-icon-box {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(245, 158, 11, 0.18);
    border: 1px solid rgba(245, 158, 11, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.25);
    flex-shrink: 0;
  }
  .deploy-icon-box.victory { background: rgba(52, 211, 153, 0.18); border-color: rgba(52, 211, 153, 0.45); }
  .deploy-icon-box.aborted { background: rgba(239, 68, 68, 0.18); border-color: rgba(239, 68, 68, 0.45); }

  :global(.deploy-dialog-icon) { color: #fbbf24; }
  :global(.victory-icon) { color: #34d399; }
  :global(.abort-icon) { color: #f87171; }

  .deploy-dialog-title {
    font-size: 15.5px;
    font-weight: 900;
    letter-spacing: 0.08em;
    word-spacing: 0.10em;
    color: #fef3c7;
    margin: 0;
  }

  .deploy-dialog-sub {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.03em;
    color: var(--text-muted);
    margin-top: 3px;
  }

  .close-dialog-btn {
    margin-left: auto;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.10);
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .close-dialog-btn:hover {
    background: rgba(239, 68, 68, 0.22);
    color: #f87171;
  }

  .deploy-dialog-body {
    padding: 28px 30px;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  .deploy-warning-banner {
    display: flex;
    gap: 12px;
    padding: 16px 18px;
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.38);
    border-radius: 16px;
    color: #fde68a;
    font-size: 12.5px;
    font-weight: 600;
    line-height: 1.5;
  }

  :global(.warn-icon) {
    color: #fbbf24;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .deploy-field {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .label-row-deploy {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .deploy-field label {
    font-size: 11.5px;
    font-weight: 900;
    letter-spacing: 0.09em;
    word-spacing: 0.09em;
    color: var(--text-muted);
  }

  .selected-date-badge {
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.08em;
    color: #fbbf24;
    background: rgba(245, 158, 11, 0.18);
    padding: 3px 10px;
    border-radius: 99px;
    border: 1px solid rgba(245, 158, 11, 0.4);
  }

  .calendar-input-wrapper-large {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }

  .calendar-icon-box {
    position: absolute;
    left: 16px;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: rgba(245, 158, 11, 0.18);
    border: 1px solid rgba(245, 158, 11, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 2;
  }

  :global(.calendar-icon-large) {
    color: #fbbf24;
  }

  /* SINGLE 64px CALENDAR PICKER */
  .calendar-picker-ultra {
    width: 100%;
    height: 64px;
    padding: 0 20px 0 68px;
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 0.08em;
    color-scheme: dark;
    background: rgba(6, 10, 18, 0.95);
    border: 2px solid rgba(245, 158, 11, 0.60);
    border-radius: 18px;
    color: #fef3c7;
    box-sizing: border-box;
    box-shadow: 0 0 28px rgba(245, 158, 11, 0.30), inset 0 0 16px rgba(0, 0, 0, 0.5);
    transition: all 0.2s ease;
    cursor: pointer;
  }
  .calendar-picker-ultra:focus {
    border-color: rgba(245, 158, 11, 0.90);
    box-shadow: 0 0 38px rgba(245, 158, 11, 0.50), inset 0 0 20px rgba(0, 0, 0, 0.6);
    outline: none;
  }

  .calendar-picker-ultra::-webkit-calendar-picker-indicator {
    cursor: pointer;
    font-size: 22px;
    padding: 8px;
    filter: invert(0.85) sepia(1) saturate(5) hue-rotate(5deg);
    transition: transform 0.15s ease;
  }
  .calendar-picker-ultra::-webkit-calendar-picker-indicator:hover {
    transform: scale(1.2);
  }

  .end-note-textarea {
    width: 100%;
    padding: 14px 18px;
    font-size: 13.5px;
    font-weight: 700;
    color: var(--text-main);
    background: rgba(6, 10, 18, 0.90);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 14px;
    box-sizing: border-box;
    resize: vertical;
    transition: all 0.15s ease;
  }
  .end-note-textarea:focus {
    border-color: rgba(139, 92, 246, 0.6);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.18);
    outline: none;
  }

  .deploy-dialog-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 14px;
    padding: 20px 30px;
    background: rgba(0, 0, 0, 0.25);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .btn-abort-btn {
    flex: 0 0 auto;
    padding: 12px 24px;
    font-size: 11.5px;
  }

  .btn-deploy-confirm {
    flex: 1;
    background: linear-gradient(135deg, #f59e0b, #d97706);
    border-color: rgba(253, 230, 138, 0.6);
    box-shadow: 0 0 26px rgba(245, 158, 11, 0.5);
    color: #ffffff;
  }

  .btn-victory-confirm {
    flex: 1;
    background: linear-gradient(135deg, #10b981, #059669);
    border-color: rgba(167, 243, 208, 0.6);
    box-shadow: 0 0 26px rgba(16, 185, 129, 0.5);
    color: #ffffff;
  }

  .btn-abort-confirm {
    flex: 1;
    background: linear-gradient(135deg, #ef4444, #dc2626);
    border-color: rgba(254, 202, 202, 0.6);
    box-shadow: 0 0 26px rgba(239, 68, 68, 0.5);
    color: #ffffff;
  }
</style>
