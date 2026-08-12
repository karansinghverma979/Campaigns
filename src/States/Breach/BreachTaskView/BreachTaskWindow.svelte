<script>
  import { store } from '../../../lib/store.svelte.js';
  import { ChronosMath, getFormattedDate } from '../../../lib/ChronosMath.js';
  import { 
    Flame, FileText, CheckCircle2, XCircle, Clock, Plus, 
    CheckSquare, Square, Trash2, Tag as TagIcon, AlertCircle, 
    X, ChevronUp, Calendar, Calendar as CalendarIcon, AlertTriangle, ListTodo, GitCommit,
    Edit2, Check, RefreshCw
  } from 'lucide-svelte';

  let { task = null, onClose = () => {} } = $props();

  // Safe reactive getters from task prop
  let currentTask = $derived(task || {});
  let daysLeft = $derived(currentTask.deadline ? ChronosMath.daysRemaining(currentTask.deadline) : 0);
  let overdueDays = $derived(currentTask.deadline ? ChronosMath.overdueDays(currentTask.deadline) : 0);
  let taskPriority = $derived(currentTask.priority || 'Medium');
  let taskPriorityLower = $derived(taskPriority.toLowerCase() === 'critical' ? 'high' : taskPriority.toLowerCase());
  let taskTitle = $derived(currentTask.title || '');
  let taskOriginDate = $derived(currentTask.origin_date || '');
  let taskInitiatedDate = $derived(currentTask.initiated_at || currentTask.origin_date || '');
  let taskDeadline = $derived(currentTask.deadline || '');
  let taskRescheduleCount = $derived(currentTask.reschedule_count || 0);
  let taskReschedule1 = $derived(currentTask.reschedule_1 || null);
  let taskReschedule2 = $derived(currentTask.reschedule_2 || null);
  let taskEndedDate = $derived(currentTask.ended_date || null);
  let taskEndNote = $derived(currentTask.end_note || null);
  let taskStage = $derived(currentTask.stage || 'Overdue');
  let taskTags = $derived(currentTask.tags || []);
  let taskModificationDate = $derived(currentTask.modification_date || currentTask.origin_date || '');

  // Subtasks state & highlight & keyboard nav
  let subtasks = $state([]);
  let newSubtaskTitle = $state('');
  let isAddingSubtask = $state(false);
  let highlightedSubtaskId = $state(null);
  let subtaskInputEl = $state(null);
  let focusedSubtaskIndex = $state(-1);

  // Subtask stage counters
  let completedCount = $derived(subtasks.filter(s => s.status === 'Completed').length);
  let doingCount = $derived(subtasks.filter(s => s.status === 'Doing').length);
  let initiatedCount = $derived(subtasks.filter(s => s.status === 'Initiated' || !s.status).length);

  // Inline Subtask Title Editing state
  let editingSubtaskId = $state(null);
  let editingSubtaskText = $state('');

  // Archive End Note Modal state
  let archiveType = $state('Aborted'); // 'Victory' or 'Aborted'
  let endNoteText = $state('');
  let isArchiveModalOpen = $state(false);
  let archiveTimerSeconds = $state(60);
  let archiveTimerInterval = null;

  // Reschedule Modal state
  let isRescheduleModalOpen = $state(false);
  let newRescheduleDateIso = $state('');
  let nativeReschedulePicker = $state(null);

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
    if (currentTask && currentTask.id) {
      loadSubtasks();
    }
  });

  async function loadSubtasks() {
    if (!currentTask || !currentTask.id) return;
    try {
      const res = await window.electronAPI.getSubtasks(currentTask.id);
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

  async function addSubtask() {
    const titleTrimmed = newSubtaskTitle.trim();
    if (!titleTrimmed || !currentTask || !currentTask.id) return;

    try {
      isAddingSubtask = true;
      const res = await window.electronAPI.createSubtask({
        taskId: currentTask.id,
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
        store.showToast('Subtask added [Initiated].', 'info');
      } else {
        store.showToast('Failed to add subtask: ' + res.error, 'danger');
      }
    } catch (e) {
      store.showToast('Error: ' + e.message, 'danger');
    } finally {
      isAddingSubtask = false;
    }
  }

  // 3-STAGE SUBTASK CYCLE: Initiated -> Doing -> Completed -> Initiated
  async function cycleSubtaskStatus(subtask) {
    let nextStatus = 'Initiated';
    if (subtask.status === 'Initiated' || !subtask.status) {
      nextStatus = 'Doing';
    } else if (subtask.status === 'Doing') {
      nextStatus = 'Completed';
    } else {
      nextStatus = 'Initiated';
    }

    try {
      const res = await window.electronAPI.updateSubtaskStatus({
        subtaskId: subtask.id,
        status: nextStatus
      });
      if (res.success) {
        triggerSubtaskHighlight(subtask.id);
        await loadSubtasks();
        store.showToast(`Subtask stage: ${nextStatus.toUpperCase()}`, 'info');
      }
    } catch (e) {
      store.showToast('Failed to update subtask status: ' + e.message, 'danger');
    }
  }

  function startEditingSubtask(subtask) {
    editingSubtaskId = subtask.id;
    editingSubtaskText = subtask.title;
  }

  function cancelEditingSubtask() {
    editingSubtaskId = null;
    editingSubtaskText = '';
  }

  async function saveSubtaskTitle(subtaskId) {
    const trimmed = editingSubtaskText.trim();
    if (!trimmed) {
      cancelEditingSubtask();
      return;
    }
    try {
      const res = await window.electronAPI.updateSubtaskTitle({
        subtaskId,
        title: trimmed
      });
      if (res.success) {
        cancelEditingSubtask();
        triggerSubtaskHighlight(subtaskId);
        await loadSubtasks();
        store.showToast('Subtask title updated.', 'info');
      } else {
        store.showToast('Failed to update subtask title: ' + res.error, 'danger');
      }
    } catch (e) {
      store.showToast('Error: ' + e.message, 'danger');
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
    if (currentTask && currentTask.id) store.openStrategiesFile(currentTask); 
  }

  // Live Date Validation helper (supports DD-MM-YYYY or YYYY-MM-DD)
  function validateDateStr(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return false;
    const trimmed = dateStr.trim();
    if (!trimmed.includes('-')) return false;

    const parts = trimmed.split('-');
    if (parts.length !== 3) return false;

    let dd, mm, yyyy;
    if (parts[0].length === 4) { // YYYY-MM-DD
      yyyy = parseInt(parts[0], 10);
      mm = parseInt(parts[1], 10) - 1;
      dd = parseInt(parts[2], 10);
    } else if (parts[2].length === 4) { // DD-MM-YYYY
      dd = parseInt(parts[0], 10);
      mm = parseInt(parts[1], 10) - 1;
      yyyy = parseInt(parts[2], 10);
    } else {
      return false;
    }

    if (isNaN(dd) || isNaN(mm) || isNaN(yyyy)) return false;
    if (mm < 0 || mm > 11 || dd < 1 || dd > 31) return false;

    const d = new Date(yyyy, mm, dd);
    if (isNaN(d.getTime())) return false;

    // Must be today or future date
    const now = new Date();
    const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return d.getTime() >= todayZero.getTime();
  }

  function getFormattedTodayDdMmYyyy() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  function getDaysFromToday(dateStr) {
    if (!validateDateStr(dateStr)) return 0;
    const trimmed = dateStr.trim();
    const parts = trimmed.split('-');
    let yyyy, mm, dd;
    if (parts[0].length === 4) {
      yyyy = parseInt(parts[0], 10);
      mm = parseInt(parts[1], 10) - 1;
      dd = parseInt(parts[2], 10);
    } else {
      dd = parseInt(parts[0], 10);
      mm = parseInt(parts[1], 10) - 1;
      yyyy = parseInt(parts[2], 10);
    }
    const d = new Date(yyyy, mm, dd);
    const now = new Date();
    const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = d.getTime() - todayZero.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  function openRescheduleModal() {
    if (taskRescheduleCount >= 2) {
      store.showToast('Tactical Block: Maximum 2 reschedule permits allowed per campaign.', 'warning');
      return;
    }
    newRescheduleDateIso = getFormattedTodayDdMmYyyy();
    isRescheduleModalOpen = true;
  }

  async function confirmReschedule() {
    if (!validateDateStr(newRescheduleDateIso)) {
      store.showToast('Select or type a valid new deadline date.', 'warning');
      return;
    }
    const formattedDeadline = formatDisplayDate(newRescheduleDateIso);

    if (!currentTask || !currentTask.id) return;
    const success = await store.rescheduleTask(currentTask.id, formattedDeadline);
    if (success) {
      isRescheduleModalOpen = false;
      store.setHighlightedTaskId(currentTask.id);
      onClose();
    }
  }

  function openArchiveModal(type) {
    archiveType = type;
    endNoteText = '';
    archiveTimerSeconds = 60;
    isArchiveModalOpen = true;

    if (archiveTimerInterval) clearInterval(archiveTimerInterval);
    archiveTimerInterval = setInterval(() => {
      if (archiveTimerSeconds > 0) {
        archiveTimerSeconds -= 1;
      } else {
        clearInterval(archiveTimerInterval);
      }
    }, 1000);
  }

  function closeArchiveModal() {
    isArchiveModalOpen = false;
    if (archiveTimerInterval) clearInterval(archiveTimerInterval);
  }

  async function handleArchiveSubmit() {
    if (!endNoteText || !endNoteText.trim()) {
      store.showToast('Action Blocked: Mandatory End Note required before archiving.', 'warning');
      return;
    }
    closeArchiveModal();
    if (!currentTask || !currentTask.id) return;
    const success = await store.archiveTask(currentTask.id, archiveType, endNoteText);
    if (success) {
      onClose();
    }
  }

  function handleKey(e) { 
    const key = e.key.toLowerCase();
    const activeEl = document.activeElement;
    const isInputFocused = activeEl && (
      activeEl.tagName === 'INPUT' || 
      activeEl.tagName === 'TEXTAREA' || 
      activeEl.isContentEditable
    );

    // Escape key
    if (e.key === 'Escape') {
      if (editingSubtaskId !== null) {
        cancelEditingSubtask();
      } else if (isRescheduleModalOpen) {
        isRescheduleModalOpen = false;
      } else if (isArchiveModalOpen) {
        closeArchiveModal();
      } else {
        onClose();
      }
      return;
    }

    // Ctrl+Enter or Ctrl+S: Confirm active modal
    if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || key === 's')) {
      if (isRescheduleModalOpen) {
        e.preventDefault();
        confirmReschedule();
        return;
      }
      if (isArchiveModalOpen && archiveTimerSeconds === 0 && endNoteText.trim()) {
        e.preventDefault();
        handleArchiveSubmit();
        return;
      }
    }

    // Single-key shortcuts when not typing in an input
    if (!isInputFocused && !isRescheduleModalOpen && !isArchiveModalOpen) {
      // N: Focus Add Subtask input box directly
      if (key === 'n') {
        e.preventDefault();
        if (subtaskInputEl) subtaskInputEl.focus();
        return;
      }

      // J or Down Arrow: Focus next subtask card
      if (key === 'j' || e.key === 'ArrowDown') {
        if (subtasks.length > 0) {
          e.preventDefault();
          if (focusedSubtaskIndex < 0) {
            focusedSubtaskIndex = 0;
          } else {
            focusedSubtaskIndex = Math.min(focusedSubtaskIndex + 1, subtasks.length - 1);
          }
        }
        return;
      }

      // K or Up Arrow: Focus previous subtask card
      if (key === 'k' || e.key === 'ArrowUp') {
        if (subtasks.length > 0) {
          e.preventDefault();
          if (focusedSubtaskIndex < 0) {
            focusedSubtaskIndex = subtasks.length - 1;
          } else {
            focusedSubtaskIndex = Math.max(focusedSubtaskIndex - 1, 0);
          }
        }
        return;
      }

      // Space: Toggle subtask status
      if (e.key === ' ' || e.code === 'Space') {
        if (focusedSubtaskIndex >= 0 && focusedSubtaskIndex < subtasks.length) {
          e.preventDefault();
          cycleSubtaskStatus(subtasks[focusedSubtaskIndex]);
        }
        return;
      }

      // E or F2: Inline edit title of focused subtask
      if (key === 'e' || e.key === 'F2') {
        if (focusedSubtaskIndex >= 0 && focusedSubtaskIndex < subtasks.length) {
          e.preventDefault();
          startEditingSubtask(subtasks[focusedSubtaskIndex]);
        }
        return;
      }

      // U: Move focused subtask UP in list ordering
      if (key === 'u') {
        if (focusedSubtaskIndex > 0 && focusedSubtaskIndex < subtasks.length) {
          e.preventDefault();
          moveSubtaskUp(focusedSubtaskIndex);
          focusedSubtaskIndex -= 1;
        }
        return;
      }

      // Delete or X: Delete focused subtask
      if (e.key === 'Delete' || key === 'x') {
        if (focusedSubtaskIndex >= 0 && focusedSubtaskIndex < subtasks.length) {
          e.preventDefault();
          const targetId = subtasks[focusedSubtaskIndex].id;
          deleteSubtask(targetId);
          if (focusedSubtaskIndex >= subtasks.length - 1) {
            focusedSubtaskIndex = Math.max(0, subtasks.length - 2);
          }
        }
        return;
      }

      if (key === 'r') {
        e.preventDefault();
        openRescheduleModal();
        return;
      }
      if (key === 'a') {
        e.preventDefault();
        openArchiveModal('Aborted');
        return;
      }
      if (key === 'm') {
        e.preventDefault();
        openMarkdown();
        return;
      }
    }
  }
</script>

<svelte:window onkeydown={handleKey} />

<!-- Full Screen Modal Overlay (Strictly below 64px Top Navbar) -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-overlay" onclick={onClose}>
  <!-- EXPANDED 1240px × 740px 3-COLUMN BREACH WINDOW CANVAS -->
  <div class="modal-window-expanded" onclick={(e) => e.stopPropagation()}>
    
    <!-- Window Header -->
    <div class="window-header">
      <div class="header-title-wrap">
        <span class="priority-dot {taskPriorityLower}"></span>
        <AlertTriangle size={18} class="header-icon-breach" />
        <span class="header-title-text">BREACH OPERATIONAL RECOVERY MANIFEST</span>
      </div>
      <button type="button" class="btn-close-window" onclick={onClose} aria-label="Close window">
        <X size={18} strokeWidth={2.5} />
      </button>
    </div>

    <!-- Window Body: 3 DISTINCT PORTIONS -->
    <div class="window-body-grid">
      
      <!-- PORTION 1: LEFT SIDE TASK METADATA -->
      <div class="portion-column portion-left">
        <div class="column-header">
          <FileText size={15} class="col-icon" />
          <span class="col-title">BREACHED CAMPAIGN METADATA</span>
        </div>

        <h2 class="task-title-large">{taskTitle}</h2>

        <div class="meta-row">
          <span class="badge-tactical badge-{taskPriorityLower}">{taskPriority === 'Critical' ? 'High' : taskPriority.toUpperCase()} PRIORITY</span>
          <div class="days-pill overdue">
            <AlertTriangle size={13} />
            <span>OVERDUE BY {overdueDays} DAYS</span>
          </div>
        </div>

        <!-- Classifications & Tags -->
        {#if taskTags.length > 0}
          <div class="tags-section">
            <span class="section-label">CLASSIFICATIONS & TAGS</span>
            <div class="tags-row">
              {#each taskTags as tag}
                <span class="tag-pill-item"><TagIcon size={10} /> {tag.tag_name}</span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Compact Target Deadline Box -->
        <div class="meta-info-grid">
          <div class="meta-info-item">
            <span class="meta-info-label">BREACHED DEADLINE</span>
            <span class="meta-info-value deadline"><Calendar size={12} /> {taskDeadline || '—'}</span>
          </div>
          <div class="meta-info-item">
            <span class="meta-info-label">RESCHEDULE PERMITS</span>
            <span class="meta-info-value permit">{taskRescheduleCount}/2 PERMITS USED</span>
          </div>
        </div>
      </div>


      <!-- PORTION 2: MIDDLE SUBTASKS MODULE (WITH 3-STAGE STATUS TOGGLE: Initiated -> Doing -> Completed) -->
      <div class="portion-column portion-middle">
        <div class="column-header subtasks-header">
          <div class="header-left-title">
            <ListTodo size={15} class="col-icon" />
            <span class="col-title">TACTICAL SUBTASKS</span>
          </div>
          {#if subtasks.length > 0}
            {@const subtaskPct = Math.round((completedCount / subtasks.length) * 100)}
            <div class="header-progress-group">
              <div class="header-progress-bar-track">
                <div class="header-progress-bar-fill" style="width: {subtaskPct}%"></div>
              </div>
              <span class="header-progress-label">{subtaskPct}% [{completedCount}/{subtasks.length}]</span>
            </div>
          {:else}
            <span class="subtasks-counter">[0/0]</span>
          {/if}
        </div>

        <!-- Add Subtask Input Row -->
        <div class="subtask-add-row">
          <input 
            type="text" 
            placeholder="Enter subtask title... (Press 'N' to focus)" 
            bind:value={newSubtaskTitle}
            bind:this={subtaskInputEl}
            onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
            class="subtask-input"
          />
          <button 
            type="button" 
            class="btn-add-subtask" 
            onclick={addSubtask}
            disabled={isAddingSubtask || !newSubtaskTitle.trim()}
            title="Add Subtask"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>ADD</span>
          </button>
        </div>

        <!-- Subtasks Scrollable List (15px bold crisp font with 3-STAGE TOGGLE & INLINE EDITING) -->
        <div class="subtasks-scroll-container">
          {#if subtasks.length === 0}
            <div class="empty-subtasks">
              <span>No subtasks logged yet. Add subtasks to organize granular mission steps.</span>
            </div>
          {:else}
            {#each subtasks as subtask, idx (subtask.id)}
              <div 
                class="subtask-item-card {subtask.status ? subtask.status.toLowerCase() : 'initiated'}" 
                class:subtask-nav-focused={idx === focusedSubtaskIndex}
                class:just-updated-subtask={highlightedSubtaskId === subtask.id}
                use:scrollSubtaskIfHighlighted={highlightedSubtaskId === subtask.id || idx === focusedSubtaskIndex}
              >
                <!-- Status Badge (READ-ONLY in Breach — click on title to edit, no status cycling) -->
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="subtask-stage-badge-readonly" onclick={() => store.showToast('BREACH STAGE: Deadline breached. Reschedule campaign to Execution to update subtask progress.', 'warning')}>
                  {#if subtask.status === 'Completed'}
                    <CheckSquare size={17} class="status-icon completed" />
                    <span class="stage-pill-badge completed">COMPLETED</span>
                  {:else if subtask.status === 'Doing'}
                    <Clock size={17} class="status-icon doing" />
                    <span class="stage-pill-badge doing">DOING</span>
                  {:else}
                    <Square size={17} class="status-icon initiated" />
                    <span class="stage-pill-badge initiated">INITIATED</span>
                  {/if}
                </div>

                <!-- DIRECT INLINE TITLE EDITING -->
                {#if editingSubtaskId === subtask.id}
                  <input 
                    type="text" 
                    bind:value={editingSubtaskText}
                    onkeydown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); saveSubtaskTitle(subtask.id); }
                      else if (e.key === 'Escape') { e.preventDefault(); cancelEditingSubtask(); }
                    }}
                    class="inline-row-input"
                  />
                {:else}
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <span 
                    class="subtask-title-text" 
                    ondblclick={() => startEditingSubtask(subtask)}
                    title="Double-click to edit title"
                  >
                    {subtask.title}
                  </span>
                {/if}

                <!-- Actions: Edit/Save/Cancel, Move Up & Delete -->
                <div class="subtask-actions">
                  {#if editingSubtaskId === subtask.id}
                    <button type="button" class="subtask-save-btn" onclick={() => saveSubtaskTitle(subtask.id)} title="Save Title">
                      <Check size={14} />
                    </button>
                    <button type="button" class="subtask-cancel-btn" onclick={cancelEditingSubtask} title="Cancel">
                      <X size={14} />
                    </button>
                  {:else}
                    <button 
                      type="button" 
                      class="subtask-edit-btn" 
                      onclick={() => startEditingSubtask(subtask)}
                      title="Edit Subtask Title"
                    >
                      <Edit2 size={13} />
                    </button>

                    <button 
                      type="button" 
                      class="subtask-order-btn" 
                      onclick={() => moveSubtaskUp(idx)}
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
                  {/if}
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <!-- PORTION 3: CAMPAIGN JOURNEY TIMELINE (ALL TAT) -->
      <div class="portion-column portion-right">
        <div class="column-header">
          <GitCommit size={15} class="col-icon" />
          <span class="col-title">CAMPAIGN JOURNEY</span>
        </div>

        <div class="timeline-scroll">

          <!-- Node 1: Campaign Logged -->
          <div class="journey-step">
            <div class="journey-node node-logged"></div>
            <div class="journey-line"></div>
            <div class="journey-content">
              <span class="journey-label">CAMPAIGN LOGGED</span>
              <span class="journey-date">{taskOriginDate || '—'}</span>
              <span class="journey-desc">Added to Arsenal Database</span>
            </div>
          </div>

          <!-- Node 2: Execution Initiated -->
          <div class="journey-step">
            <div class="journey-node node-initiated"></div>
            <div class="journey-line"></div>
            <div class="journey-content">
              <span class="journey-label">EXECUTION INITIATED</span>
              <span class="journey-date initiated">{taskInitiatedDate || '—'}</span>
              <span class="journey-desc">Deployed to Execution Theater</span>
            </div>
          </div>

          <!-- Node 3: Last Modification -->
          <div class="journey-step">
            <div class="journey-node node-modified"></div>
            <div class="journey-line"></div>
            <div class="journey-content">
              <span class="journey-label">LAST MODIFICATION</span>
              <span class="journey-date modified">{taskModificationDate || taskInitiatedDate || taskOriginDate}</span>
              <span class="journey-desc">Last updated in system</span>
            </div>
          </div>

          <!-- Node 3: Reschedule 1 (if used) -->
          {#if taskReschedule1}
            <div class="journey-step">
              <div class="journey-node node-reschedule"></div>
              <div class="journey-line"></div>
              <div class="journey-content">
                <span class="journey-label">RESCHEDULE PERMIT 1</span>
                <span class="journey-date reschedule">{taskReschedule1}</span>
                <span class="journey-desc">Action Executed on {taskReschedule1}</span>
              </div>
            </div>
          {/if}

          <!-- Node 4: Reschedule 2 (if used) -->
          {#if taskReschedule2}
            <div class="journey-step">
              <div class="journey-node node-reschedule"></div>
              <div class="journey-line"></div>
              <div class="journey-content">
                <span class="journey-label">RESCHEDULE PERMIT 2</span>
                <span class="journey-date reschedule">{taskReschedule2}</span>
                <span class="journey-desc">Action Executed on {taskReschedule2}</span>
              </div>
            </div>
          {/if}

          <!-- Node 5: Breached Deadline -->
          <div class="journey-step" class:last={!taskEndedDate}>
            <div class="journey-node node-deadline"></div>
            {#if taskEndedDate}<div class="journey-line"></div>{/if}
            <div class="journey-content">
              <span class="journey-label">DEADLINE BREACHED</span>
              <span class="journey-date deadline">{taskDeadline || '—'}</span>
              <span class="journey-desc">Overdue by {overdueDays} Days</span>
            </div>
          </div>

          <!-- Node 6: Mission Outcome (if archived) -->
          {#if taskEndedDate}
            <div class="journey-step last">
              <div class="journey-node {taskStage === 'Victory' ? 'node-victory' : 'node-aborted'}"></div>
              <div class="journey-content">
                <span class="journey-label">MISSION {taskStage.toUpperCase()}</span>
                <span class="journey-date {taskStage === 'Victory' ? 'victory' : 'aborted'}">{taskEndedDate}</span>
                {#if taskEndNote}
                  <div class="journey-note-box">
                    <span class="journey-note-label">TACTICAL LESSONS & END NOTE:</span>
                    <p class="journey-note-text">"{taskEndNote}"</p>
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      </div>

    </div>

    <!-- WINDOW FOOTER ACTION CONTROLS: ABORT (LEFT), RESCHEDULE (MIDDLE), STRATEGIES (RIGHT) -->
    <div class="window-footer">
      <button type="button" class="footer-btn btn-abort" onclick={() => openArchiveModal('Aborted')}>
        <XCircle size={16} />
        <span>ABORT CAMPAIGN</span>
      </button>

      <button 
        type="button"
        class="footer-btn btn-reschedule" 
        onclick={openRescheduleModal}
        title={taskRescheduleCount >= 2 ? 'Maximum 2 reschedule permits used' : 'Reschedule execution deadline'}
      >
        <RefreshCw size={16} />
        <span>RESCHEDULE [{taskRescheduleCount}/2]</span>
      </button>

      <button type="button" class="footer-btn btn-markdown" onclick={openMarkdown}>
        <FileText size={16} />
        <span>STRATEGIES (.MD)</span>
      </button>
    </div>
  </div>
</div>

<!-- RESCHEDULE DEADLINE MODAL OVERLAY -->
{#if isRescheduleModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="deploy-modal-overlay" onclick={() => isRescheduleModalOpen = false}>
    <div class="deploy-modal-card" onclick={(e) => e.stopPropagation()}>
      <div class="deploy-card-header">
        <div class="deploy-title-wrap">
          <RefreshCw size={22} class="deploy-icon" />
          <h3>RESCHEDULE BREACHED DEADLINE [{taskRescheduleCount}/2 Permits Used]</h3>
        </div>
        <button type="button" class="btn-close-deploy" onclick={() => isRescheduleModalOpen = false}>
          <X size={18} />
        </button>
      </div>

      <div class="date-picker-wrap">
        <input 
          type="text" 
          placeholder="DD-MM-YYYY"
          bind:value={newRescheduleDateIso}
          class="deploy-text-input"
        />
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
          class="calendar-btn-2x" 
          title="Pick date from native calendar"
          onclick={() => {
            try {
              if (nativeReschedulePicker && nativeReschedulePicker.showPicker) {
                nativeReschedulePicker.showPicker();
              }
            } catch (err) {}
          }}
        >
          <CalendarIcon size={20} />
          <input 
            bind:this={nativeReschedulePicker}
            type="date"
            min={todayIso}
            class="hidden-native-date-2x"
            onchange={(e) => {
              if (e.target.value) {
                const parts = e.target.value.split('-');
                if (parts.length === 3) {
                  newRescheduleDateIso = `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
              }
            }}
          />
        </div>
      </div>

      <div class="date-status-badge {validateDateStr(newRescheduleDateIso) ? 'valid' : 'invalid'}">
        {#if validateDateStr(newRescheduleDateIso)}
          {@const days = getDaysFromToday(newRescheduleDateIso)}
          <CheckCircle2 size={15} />
          <span>{days === 0 ? 'TODAY' : `${days} DAYS FROM TODAY`}</span>
        {:else}
          <AlertTriangle size={15} />
          <span>INVALID DATE</span>
        {/if}
      </div>

      <div class="deploy-actions">
        <button type="button" class="btn-deploy-cancel" onclick={() => isRescheduleModalOpen = false}>CANCEL</button>
        <button 
          type="button" 
          class="btn-deploy-confirm" 
          disabled={!validateDateStr(newRescheduleDateIso)}
          onclick={confirmReschedule}
        >
          CONFIRM RESCHEDULE
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
          <label for="archive-end-note-input">TACTICAL END NOTE (MANDATORY LESSONS / OUTCOME LOG)</label>
          <textarea
            id="archive-end-note-input"
            bind:value={endNoteText}
            placeholder="Type mandatory tactical outcome notes or lessons learned during the 60s timer..."
            rows="4"
            class="end-note-textarea"
          ></textarea>
        </div>
      </div>

      <div class="deploy-dialog-footer">
        <button type="button" class="btn-tactical btn-abort-btn" onclick={closeArchiveModal}>
          CANCEL
        </button>
        <button 
          type="button" 
          class="btn-tactical {archiveType === 'Victory' ? 'btn-victory-confirm' : 'btn-abort-confirm'}" 
          disabled={archiveTimerSeconds > 0}
          onclick={handleArchiveSubmit}
        >
          {#if archiveType === 'Victory'}
            <CheckCircle2 size={16} />
            {#if archiveTimerSeconds > 0}
              <span>ARCHIVE AS VICTORY (WAIT {archiveTimerSeconds}s...)</span>
            {:else}
              <span>CONFIRM ARCHIVE AS VICTORY</span>
            {/if}
          {:else}
            <XCircle size={16} />
            {#if archiveTimerSeconds > 0}
              <span>ARCHIVE AS ABORTED (WAIT {archiveTimerSeconds}s...)</span>
            {:else}
              <span>CONFIRM ARCHIVE AS ABORTED</span>
            {/if}
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* ── OVERLAY STRICTLY BELOW 64px NAVBAR ── */
  .modal-overlay {
    position: fixed;
    top: 64px;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 8000;
    background: rgba(4, 7, 14, 0.84);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    animation: fadeIn 0.18s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  /* ── 1240px × 740px EXPANDED 3-COLUMN WINDOW CANVAS ── */
  .modal-window-expanded {
    width: 1240px;
    height: 740px;
    max-width: 95vw;
    max-height: calc(100vh - 80px);
    background: rgba(10, 15, 26, 0.98);
    border: 1px solid rgba(248, 113, 113, 0.45);
    border-radius: 24px;
    box-shadow: 0 28px 72px rgba(0, 0, 0, 0.95), 0 0 44px rgba(248, 113, 113, 0.25);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: windowScale 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes windowScale {
    from { opacity: 0; transform: scale(0.96) translateY(12px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }

  /* Header */
  .window-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 30px;
    background: rgba(239, 68, 68, 0.10);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
  }

  .header-title-wrap { display: flex; align-items: center; gap: 12px; }

  .priority-dot {
    width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
  }
  .priority-dot.high     { background: #ef4444; box-shadow: 0 0 10px rgba(239,68,68,0.6); }
  .priority-dot.medium   { background: #f59e0b; box-shadow: 0 0 10px rgba(245,158,11,0.6); }
  .priority-dot.low      { background: #3b82f6; box-shadow: 0 0 10px rgba(59,130,246,0.6); }

  :global(.header-icon-breach) { color: #f87171; }

  .header-title-text {
    font-size: 13px; font-weight: 900; letter-spacing: 0.12em; word-spacing: 0.10em; color: #f87171;
  }

  .btn-close-window {
    width: 34px; height: 34px; border-radius: 50%;
    background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.10);
    color: var(--text-muted); display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s ease;
  }
  .btn-close-window:hover { background: rgba(239, 68, 68, 0.22); color: #f87171; border-color: rgba(239, 68, 68, 0.40); }

  /* ── 3-COLUMN BODY GRID ── */
  .window-body-grid {
    flex: 1;
    display: grid;
    grid-template-columns: 310px 1fr 255px;
    gap: 22px;
    padding: 24px 30px;
    min-height: 0;
    overflow: hidden;
  }

  .portion-column {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0;
  }

  .portion-left {
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    padding-right: 22px;
    overflow-y: auto;
  }

  .portion-middle {
    padding: 0 4px;
    overflow: hidden;
  }

  .portion-right {
    border-left: 1px solid rgba(255, 255, 255, 0.08);
    padding-left: 22px;
    overflow-y: auto;
  }

  .column-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  :global(.col-icon) { color: #f87171; }

  .col-title {
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.10em;
    color: var(--text-muted);
    text-transform: uppercase;
  }

  .task-title-large {
    font-size: 20px;
    font-weight: 900;
    color: #f3e8ff;
    line-height: 1.35;
    letter-spacing: 0.02em;
    word-break: break-word;
    margin: 0;
  }

  .meta-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

  .days-pill.overdue { color: #f87171; background: rgba(239, 68, 68, 0.20); border: 1px solid rgba(239, 68, 68, 0.55); padding: 5px 12px; border-radius: 99px; font-size: 11px; font-weight: 900; display: inline-flex; align-items: center; gap: 6px; }

  .info-block {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 10px;
    gap: 12px;
  }

  .info-item {
    display: flex;
  }

  .info-label {
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.08em;
    color: var(--text-dim);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .info-value {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-main);
    text-align: right;
    word-break: break-all;
  }
  .info-value.mono { font-family: 'Courier New', monospace; color: #c4b5fd; letter-spacing: 0.04em; }
  .info-value.deadline { color: #f87171; }
  .info-value.permit { color: #c4b5fd; }

  .tags-section { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
  .section-label { font-size: 10px; font-weight: 900; letter-spacing: 0.08em; color: var(--text-dim); }
  .tags-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .tag-pill-item {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em;
    color: #fca5a5;
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.25);
    padding: 4px 10px; border-radius: 9999px;
    cursor: pointer; user-select: none;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .tag-pill-item:hover {
    background: rgba(239, 68, 68, 0.28);
    border-color: rgba(248, 113, 113, 0.65);
    color: #ffffff;
    box-shadow: 0 0 14px rgba(239, 68, 68, 0.35);
    transform: translateY(-1.5px) scale(1.03);
  }
  .tag-pill-item:active {
    transform: translateY(0) scale(0.96);
  }

  /* PORTION 2: SUBTASKS MODULE */
  .subtasks-header { justify-content: space-between; }
  .header-left-title { display: flex; align-items: center; gap: 8px; }
  .header-progress-group { display: flex; align-items: center; gap: 10px; }
  .header-progress-bar-track { width: 80px; height: 6px; background: rgba(255,255,255,0.10); border-radius: 99px; overflow: hidden; }
  .header-progress-bar-fill { height: 100%; background: linear-gradient(90deg, #8b5cf6 0%, #ec4899 50%, #06b6d4 100%); border-radius: 99px; transition: width 0.3s ease; }
  .header-progress-label { font-size: 11px; font-weight: 900; color: #a7f3d0; letter-spacing: 0.04em; }

  .subtasks-counter {
    margin-left: auto;
    font-size: 11px;
    font-weight: 900;
    color: #f87171;
  }

  .subtask-add-row { display: flex; gap: 10px; }

  .subtask-input {
    flex: 1; padding: 10px 16px; font-size: 13px; font-weight: 700;
    background: rgba(6, 10, 18, 0.85); border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px; color: var(--text-main); transition: all 0.15s ease;
  }
  .subtask-input:focus { border-color: rgba(239, 68, 68, 0.65); outline: none; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.18); }

  .btn-add-subtask {
    display: flex; align-items: center; gap: 6px; padding: 10px 18px;
    font-size: 12px; font-weight: 900; letter-spacing: 0.06em; color: #ffffff;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.4), rgba(220, 38, 38, 0.3));
    border: 1px solid rgba(239, 68, 68, 0.55); border-radius: 12px; cursor: pointer; transition: all 0.15s ease;
  }
  .btn-add-subtask:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.6), rgba(220, 38, 38, 0.5));
    border-color: rgba(239, 68, 68, 0.85); box-shadow: 0 0 16px rgba(239, 68, 68, 0.35);
  }
  .btn-add-subtask:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Subtasks Scrollable Container */
  .subtasks-scroll-container {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 9px;
    padding: 2px 6px;
  }
  .subtasks-scroll-container::-webkit-scrollbar { width: 5px; }
  .subtasks-scroll-container::-webkit-scrollbar-thumb { background: rgba(239, 68, 68, 0.45); border-radius: 99px; }

  .empty-subtasks { font-size: 12.5px; font-weight: 600; color: var(--text-dim); padding: 16px 0; }

  .subtask-item-card {
    display: flex; align-items: center; gap: 10px; padding: 10px 14px;
    background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px; transition: all 0.15s ease;
  }
  .subtask-item-card:hover { background: rgba(255, 255, 255, 0.06); border-color: rgba(239, 68, 68, 0.35); }
  .subtask-item-card.subtask-nav-focused {
    border-color: rgba(239, 68, 68, 0.95) !important;
    box-shadow: 0 0 18px rgba(239, 68, 68, 0.45) !important;
    background: rgba(239, 68, 68, 0.16) !important;
  }
  .subtask-item-card.completed { opacity: 0.65; background: rgba(0, 0, 0, 0.25); }
  .subtask-item-card.completed .subtask-title-text { text-decoration: line-through; color: var(--text-dim); }
  .subtask-item-card.doing { background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.35); }
  .subtask-item-card.just-updated-subtask { animation: subtaskPulse 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; border-color: rgba(168, 85, 247, 0.85) !important; }

  @keyframes subtaskPulse {
    0%   { box-shadow: inset 0 0 0 2px rgba(168, 85, 247, 0.9), 0 0 24px rgba(168, 85, 247, 0.5); }
    50%  { box-shadow: inset 0 0 0 2px rgba(168, 85, 247, 0.6), 0 0 12px rgba(168, 85, 247, 0.3); }
    100% { box-shadow: inset 0 0 0 0 transparent, 0 0 0 transparent; }
  }

  /* Subtask stage badge (read-only: icon + pill on same axis as title) */
  .subtask-stage-badge-readonly {
    display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0;
  }

  /* 3-Stage Subtask Toggle UI */
  .subtask-stage-toggle {
    display: inline-flex; align-items: center; gap: 6px; cursor: pointer; user-select: none;
  }

  :global(.status-icon.completed) { color: #34d399; }
  :global(.status-icon.doing) { color: #fbbf24; }
  :global(.status-icon.initiated) { color: var(--text-dim); }

  .stage-pill-badge {
    font-size: 9px; font-weight: 900; letter-spacing: 0.06em; padding: 2px 7px; border-radius: 99px;
  }
  .stage-pill-badge.completed { color: #a7f3d0; background: rgba(52, 211, 153, 0.2); border: 1px solid rgba(52, 211, 153, 0.4); }
  .stage-pill-badge.doing { color: #fde68a; background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.4); }
  .stage-pill-badge.initiated { color: var(--text-muted); background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); }

  .subtask-title-text {
    flex: 1; font-size: 15px; font-weight: 800; letter-spacing: 0.01em; color: var(--text-main);
    cursor: default; word-break: break-word;
  }

  /* Inline Editing UI */
  .inline-edit-wrap {
    flex: 1; display: flex; align-items: center; gap: 6px;
  }

  /* Direct Inline Row Input - seamlessly replaces title */
  .inline-row-input {
    flex: 1; padding: 6px 10px; font-size: 15px; font-weight: 800; color: #ffffff;
    background: rgba(6, 10, 18, 0.95); border: 1.5px solid rgba(239, 68, 68, 0.65);
    border-radius: 10px; outline: none; box-shadow: 0 0 10px rgba(239, 68, 68, 0.25);
    min-width: 0;
  }

  /* Save/Cancel button classes */
  .subtask-save-btn { background: rgba(16, 185, 129, 0.25); border: 1px solid rgba(16, 185, 129, 0.5); color: #34d399; }
  .subtask-cancel-btn { background: rgba(239, 68, 68, 0.25); border: 1px solid rgba(239, 68, 68, 0.5); color: #f87171; }
  .subtask-save-btn, .subtask-cancel-btn { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; }

  /* Dates Info Section in Portion 1 */
  .dates-info-section { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
  .date-info-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 12px; background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 10px; }
  .date-info-label { font-size: 10px; font-weight: 900; letter-spacing: 0.08em; color: var(--text-dim); white-space: nowrap; }
  .date-info-value { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: #f87171; }
  .date-info-value.mod { color: #f59e0b; }

  .subtask-actions { display: flex; align-items: center; gap: 4px; }
  .subtask-edit-btn, .subtask-order-btn, .subtask-delete-btn {
    width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
    background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.10); color: var(--text-muted);
    cursor: pointer; transition: all 0.12s ease;
  }
  .subtask-edit-btn:hover { background: rgba(96, 165, 250, 0.25); color: #60a5fa; border-color: rgba(96, 165, 250, 0.45); }
  .subtask-order-btn:hover:not(:disabled) { background: rgba(239, 68, 68, 0.25); color: #fca5a5; border-color: rgba(239, 68, 68, 0.45); }
  .subtask-order-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .subtask-delete-btn:hover { background: rgba(239, 68, 68, 0.22); color: #fca5a5; border-color: rgba(239, 68, 68, 0.45); }

  /* Compact Meta Info Grid in Portion 1 */
  .meta-info-grid { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
  .meta-info-item { display: flex; flex-direction: column; gap: 3px; padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; }
  .meta-info-label { font-size: 10px; font-weight: 900; letter-spacing: 0.08em; color: var(--text-dim); }
  .meta-info-value { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 800; color: #f87171; }
  .meta-info-value.deadline { color: #f87171; }
  .meta-info-value.permit { color: #fbbf24; }

  /* Standardized Campaign Journey Timeline in Portion 3 */
  .timeline-scroll { display: flex; flex-direction: column; overflow-y: auto; flex: 1; padding: 4px 0 8px 0; }
  .journey-step { display: flex; align-items: flex-start; gap: 14px; position: relative; min-height: 82px; }
  .journey-step .journey-line { position: absolute; left: 6px; top: 20px; bottom: -18px; width: 2px; background: linear-gradient(180deg, rgba(239,68,68,0.5) 0%, rgba(239,68,68,0.08) 100%); z-index: 1; }
  .journey-step.last .journey-line { display: none; }
  .journey-node { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; z-index: 5; position: relative; border: 2px solid rgba(10, 15, 26, 0.98); }
  .node-logged { background: #8b5cf6; box-shadow: 0 0 14px rgba(139,92,246,0.85); }
  .node-initiated { background: #60a5fa; box-shadow: 0 0 14px rgba(96,165,250,0.85); }
  .node-modified { background: #38bdf8; box-shadow: 0 0 14px rgba(56,189,248,0.85); }
  .node-reschedule { background: #f59e0b; box-shadow: 0 0 14px rgba(245,158,11,0.85); }
  .node-deadline { background: #ef4444; box-shadow: 0 0 14px rgba(239,68,68,0.95); }
  .node-victory { background: #10b981; box-shadow: 0 0 14px rgba(16,185,129,0.85); }
  .node-aborted { background: #ef4444; box-shadow: 0 0 14px rgba(239,68,68,0.85); }
  .journey-content { display: flex; flex-direction: column; gap: 4px; padding-bottom: 32px; flex: 1; }
  .journey-step.last .journey-content { padding-bottom: 0; }
  .journey-label { font-size: 10px; font-weight: 900; letter-spacing: 0.08em; word-spacing: 0.06em; color: var(--text-dim); }
  .journey-date { font-size: 13px; font-weight: 800; color: #c4b5fd; word-spacing: 0.05em; }
  .journey-date.initiated { color: #60a5fa; }
  .journey-date.reschedule { color: #fbbf24; }
  .journey-date.deadline { color: #f87171; }
  .journey-date.victory { color: #34d399; }
  .journey-date.aborted { color: #f87171; }
  .journey-desc { font-size: 10.5px; font-weight: 600; color: var(--text-dim); line-height: 1.4; }
  .journey-note { font-size: 11px; font-style: italic; color: #ddd6fe; margin-top: 4px; line-height: 1.35; }
  .journey-note-box {
    margin-top: 8px; padding: 10px 14px;
    background: rgba(0, 0, 0, 0.45); border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px; display: flex; flex-direction: column; gap: 4px;
  }
  .journey-note-label { font-size: 9.5px; font-weight: 900; letter-spacing: 0.08em; color: #c4b5fd; text-transform: uppercase; }
  .journey-note-text { font-size: 12px; font-weight: 600; color: #f3e8ff; line-height: 1.4; margin: 0; word-break: break-word; }

  /* Inline date input for calendar (fixes Electron hang with hidden-native-date) */
  .calendar-date-input-2x {
    width: 64px; height: 64px; border-radius: 18px; cursor: pointer;
    background: linear-gradient(135deg, rgba(139,92,246,0.4), rgba(99,102,241,0.35));
    border: 1.5px solid rgba(139,92,246,0.6); color: transparent; font-size: 0;
    padding: 0; transition: all 0.18s ease; flex-shrink: 0; color-scheme: dark;
  }
  .calendar-date-input-2x::-webkit-calendar-picker-indicator {
    width: 100%; height: 100%; opacity: 0.8; cursor: pointer;
    filter: invert(1);
  }
  .calendar-date-input-2x:hover {
    border-color: rgba(168,85,247,0.85); box-shadow: 0 0 20px rgba(139,92,246,0.5);
  }

  /* WINDOW FOOTER ACTION CONTROLS */
  .window-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 18px 28px;
    background: rgba(6, 10, 18, 0.95);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
  }

  .footer-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 22px;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.06em;
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    word-spacing: 0.04em;
    flex: 1;
  }
  .footer-btn:hover {
    transform: translateY(-2px);
  }
  .footer-btn:active {
    transform: translateY(0) scale(0.96);
  }

  .btn-reschedule {
    color: #ffffff;
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.45), rgba(217, 119, 6, 0.35));
    border: 1px solid rgba(251, 191, 36, 0.65);
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.35);
  }
  .btn-reschedule:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.70), rgba(217, 119, 6, 0.60));
    box-shadow: 0 0 28px rgba(245, 158, 11, 0.55);
    border-color: rgba(251, 191, 36, 0.90);
  }
  .btn-reschedule:disabled { opacity: 0.35; cursor: not-allowed; box-shadow: none; transform: none; }

  .btn-abort {
    color: #ffffff;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.45), rgba(220, 38, 38, 0.35));
    border: 1px solid rgba(248, 113, 113, 0.60);
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.30);
  }
  .btn-abort:hover {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.65), rgba(220, 38, 38, 0.55));
    box-shadow: 0 0 28px rgba(239, 68, 68, 0.50);
    border-color: rgba(248, 113, 113, 0.90);
  }

  .btn-markdown {
    color: #ffffff;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.45), rgba(99, 102, 241, 0.35));
    border: 1px solid rgba(196, 181, 253, 0.60);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.30);
  }
  .btn-markdown:hover {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.65), rgba(99, 102, 241, 0.55));
    box-shadow: 0 0 28px rgba(139, 92, 246, 0.50);
    border-color: rgba(196, 181, 253, 0.90);
  }

  /* DEPLOY MODAL OVERLAY (580px 2X LARGE DARK THEMED DIALOG) */
  .deploy-modal-overlay { position: fixed; top: 64px; left: 0; right: 0; bottom: 0; z-index: 50000; background: rgba(4, 7, 13, 0.92); backdrop-filter: blur(24px); display: flex; align-items: center; justify-content: center; }
  .deploy-modal-dialog, .deploy-modal-card { width: 580px; background: rgba(14, 20, 33, 0.98); border: 1.5px solid rgba(139, 92, 246, 0.55); border-radius: 24px; padding: 28px; display: flex; flex-direction: column; gap: 20px; box-shadow: 0 28px 72px rgba(0, 0, 0, 0.90), 0 0 40px rgba(139, 92, 246, 0.25); }
  .deploy-card-header { display: flex; align-items: center; justify-content: space-between; }
  .deploy-title-wrap { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 900; color: #f3e8ff; letter-spacing: 0.04em; word-spacing: 0.04em; }
  :global(.deploy-icon) { color: #c4b5fd; }
  .btn-close-deploy { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: var(--text-dim); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
  .deploy-desc { font-size: 13px; font-weight: 700; color: var(--text-muted); line-height: 1.4; }
  
  .date-picker-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(4, 7, 14, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    outline: none !important;
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.8) !important;
    border-radius: 16px;
    padding: 6px 6px 6px 18px;
  }
  .date-picker-wrap:focus-within {
    border: 1px solid rgba(255, 255, 255, 0.14) !important;
    outline: none !important;
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.8) !important;
  }
  .deploy-text-input {
    flex: 1;
    background: transparent;
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    color: #ffffff;
    font-size: 16.5px;
    font-weight: 800;
    letter-spacing: 0.04em;
  }
  .calendar-btn-2x {
    position: relative;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.35), rgba(99, 102, 241, 0.3));
    border: 1px solid rgba(168, 85, 247, 0.5);
    color: #e9d5ff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.15s ease;
  }
  .calendar-btn-2x:hover {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.55), rgba(99, 102, 241, 0.45));
    border-color: rgba(168, 85, 247, 0.85);
    box-shadow: 0 0 16px rgba(139, 92, 246, 0.45);
  }
  .hidden-native-date-2x {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    color-scheme: dark;
  }

  .date-status-badge { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 900; padding: 10px 16px; border-radius: 12px; letter-spacing: 0.03em; }
  .date-status-badge.valid { color: #a7f3d0; background: rgba(52, 211, 153, 0.15); border: 1px solid rgba(52, 211, 153, 0.35); }
  .date-status-badge.invalid { color: #fca5a5; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); }

  .deploy-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 4px; }
  .btn-deploy-cancel { padding: 11px 20px; font-size: 12px; font-weight: 900; color: var(--text-muted); background: transparent; border: none; cursor: pointer; }
  .btn-deploy-confirm { padding: 11px 24px; font-size: 12px; font-weight: 900; color: #ffffff; background: linear-gradient(135deg, #8b5cf6, #6366f1); border: 1px solid rgba(196, 181, 253, 0.4); border-radius: 14px; cursor: pointer; transition: all 0.15s ease; box-shadow: 0 0 20px rgba(139, 92, 246, 0.35); }
  .btn-deploy-confirm:hover:not(:disabled) { background: linear-gradient(135deg, #9333ea, #4f46e5); box-shadow: 0 0 28px rgba(139, 92, 246, 0.55); }
  .btn-deploy-confirm:disabled { opacity: 0.35; cursor: not-allowed; box-shadow: none; }

  /* ── ARCHIVE / ABORT END NOTE DIALOG ── */
  .deploy-dialog-header {
    display: flex; align-items: center; gap: 14px;
    padding-bottom: 18px; border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .deploy-dialog-header.victory { border-color: rgba(52, 211, 153, 0.25); }
  .deploy-dialog-header.aborted { border-color: rgba(239, 68, 68, 0.25); }

  .deploy-icon-box {
    width: 48px; height: 48px; border-radius: 14px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .deploy-icon-box.victory { background: rgba(52, 211, 153, 0.15); border: 1.5px solid rgba(52, 211, 153, 0.35); }
  .deploy-icon-box.aborted { background: rgba(239, 68, 68, 0.15); border: 1.5px solid rgba(239, 68, 68, 0.35); }
  :global(.victory-icon) { color: #34d399; }
  :global(.abort-icon)   { color: #f87171; }

  .deploy-dialog-title { font-size: 14px; font-weight: 900; letter-spacing: 0.04em; color: #f3e8ff; margin: 0 0 4px 0; }
  .deploy-dialog-sub   { font-size: 12px; font-weight: 600; color: var(--text-dim); margin: 0; }

  .close-dialog-btn {
    margin-left: auto; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.10);
    color: var(--text-dim); border-radius: 50%; width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    transition: all 0.15s ease;
  }
  .close-dialog-btn:hover { background: rgba(255,255,255,0.12); color: var(--text-main); }

  .deploy-dialog-body { display: flex; flex-direction: column; gap: 14px; }

  .deploy-field { display: flex; flex-direction: column; gap: 8px; }
  .deploy-field label { font-size: 10.5px; font-weight: 900; letter-spacing: 0.08em; color: var(--text-dim); }

  .end-note-textarea {
    width: 100%; min-height: 110px; padding: 14px 16px; resize: vertical;
    background: rgba(4, 7, 14, 0.90); border: 1px solid rgba(255,255,255,0.12);
    border-radius: 14px; color: var(--text-main); font-size: 13px; font-weight: 600;
    line-height: 1.5; font-family: inherit; transition: border-color 0.15s ease;
    box-sizing: border-box;
  }
  .end-note-textarea:focus { outline: none; border-color: rgba(239,68,68,0.55); box-shadow: 0 0 0 3px rgba(239,68,68,0.15); }
  .end-note-textarea::placeholder { color: rgba(255,255,255,0.25); }

  .deploy-dialog-footer {
    display: flex; gap: 12px; justify-content: flex-end; align-items: center;
    padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.08);
  }

  .btn-abort-btn {
    padding: 11px 20px; font-size: 12px; font-weight: 900; color: var(--text-muted);
    background: transparent; border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; cursor: pointer;
    transition: all 0.15s ease; letter-spacing: 0.04em;
  }
  .btn-abort-btn:hover { background: rgba(255,255,255,0.06); color: var(--text-main); }

  .btn-victory-confirm {
    display: flex; align-items: center; gap: 8px;
    padding: 11px 22px; font-size: 12px; font-weight: 900; letter-spacing: 0.05em; color: #ffffff;
    background: linear-gradient(135deg, rgba(52,211,153,0.5), rgba(16,185,129,0.4));
    border: 1px solid rgba(52,211,153,0.55); border-radius: 14px; cursor: pointer;
    transition: all 0.15s ease; box-shadow: 0 0 18px rgba(52,211,153,0.25);
  }
  .btn-victory-confirm:hover:not(:disabled) { background: linear-gradient(135deg, rgba(52,211,153,0.7), rgba(16,185,129,0.6)); box-shadow: 0 0 28px rgba(52,211,153,0.45); }
  .btn-victory-confirm:disabled { opacity: 0.35; cursor: not-allowed; box-shadow: none; }

  .btn-abort-confirm {
    display: flex; align-items: center; gap: 8px;
    padding: 11px 22px; font-size: 12px; font-weight: 900; letter-spacing: 0.05em; color: #ffffff;
    background: linear-gradient(135deg, rgba(239,68,68,0.5), rgba(220,38,38,0.4));
    border: 1px solid rgba(239,68,68,0.55); border-radius: 14px; cursor: pointer;
    transition: all 0.15s ease; box-shadow: 0 0 18px rgba(239,68,68,0.25);
  }
  .btn-abort-confirm:hover:not(:disabled) { background: linear-gradient(135deg, rgba(239,68,68,0.7), rgba(220,38,38,0.6)); box-shadow: 0 0 28px rgba(239,68,68,0.45); }
  .btn-abort-confirm:disabled { opacity: 0.35; cursor: not-allowed; box-shadow: none; }
</style>
