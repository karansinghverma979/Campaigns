<script>
  import { store } from '../../../lib/store.svelte.js';
  import { onDestroy } from 'svelte';
  import { ChronosMath, getFormattedDate } from '../../../lib/ChronosMath.js';
  import { 
    Flame, FileText, CheckCircle2, XCircle, Clock, Plus, 
    CheckSquare, Square, Trash2, Tag as TagIcon, AlertCircle, 
    X, ChevronUp, Calendar, Calendar as CalendarIcon, AlertTriangle, ListTodo, GitCommit,
    Edit2, Check, PlayCircle, Zap, ArrowRight
  } from 'lucide-svelte';

  let { task = null, onClose = () => {} } = $props();

  // Safe reactive getters from task prop
  let currentTask = $derived(task || {});
  let daysLeft = $derived(currentTask.deadline ? ChronosMath.daysRemaining(currentTask.deadline) : 0);
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
  let taskStage = $derived(currentTask.stage || 'Active');
  let taskTags = $derived(currentTask.tags || []);
  let taskModificationDate = $derived(currentTask.modification_date || currentTask.initiated_at || currentTask.origin_date || '');

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

  // Archive End Note Modal & 60s Lock state
  let archiveType = $state('Victory'); // 'Victory' or 'Aborted'
  let endNoteText = $state('');
  let isArchiveModalOpen = $state(false);
  let archiveTimerSeconds = $state(60);
  let archiveTimerInterval = null;

  onDestroy(() => {
    if (archiveTimerInterval) clearInterval(archiveTimerInterval);
  });

  // Map of subtask_id -> array of linked strike directives
  let linkedStrikesMap = $derived.by(() => {
    const map = {};
    for (const s of (store.strikes || [])) {
      if (s.subtask_id != null) {
        const key = Number(s.subtask_id);
        if (!map[key]) map[key] = [];
        map[key].push(s);
      }
    }
    return map;
  });

  // Track expanded subtask IDs (collapses automatically when window closes or unmounts)
  let expandedSubtaskIds = $state(new Set());

  function toggleSubtaskExpand(subtaskId, e) {
    if (e) e.stopPropagation();
    const next = new Set(expandedSubtaskIds);
    if (next.has(subtaskId)) {
      next.delete(subtaskId);
    } else {
      next.add(subtaskId);
    }
    expandedSubtaskIds = next;
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
        store.updateTaskSubtaskStats(currentTask.id, subtasks);
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
    let timer = null;
    if (isHighlighted) {
      timer = setTimeout(() => {
        if (node && node.isConnected) {
          node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 60);
    }
    return {
      update(nextState) {
        if (timer) clearTimeout(timer);
        if (nextState) {
          timer = setTimeout(() => {
            if (node && node.isConnected) {
              node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }, 60);
        }
      },
      destroy() {
        if (timer) clearTimeout(timer);
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
        if (currentTask && currentTask.id) {
          store.updateTaskSubtaskStats(currentTask.id, subtasks);
        }
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

  // 3-STAGE SUBTASK CYCLE: Initiated -> Doing -> Completed (Permanently Locked on Completed)
  async function cycleSubtaskStatus(subtask) {
    // Once Completed, subtask state is final and locked
    if (subtask.status === 'Completed') {
      store.showToast('Tactical Lock: Completed subtask is finalized and cannot be altered.', 'warning');
      return;
    }

    let nextStatus = 'Initiated';
    if (subtask.status === 'Initiated' || !subtask.status) {
      nextStatus = 'Doing';
    } else if (subtask.status === 'Doing') {
      nextStatus = 'Completed';
    }

    try {
      const res = await window.electronAPI.updateSubtaskStatus({
        subtaskId: subtask.id,
        status: nextStatus
      });
      if (res.success) {
        triggerSubtaskHighlight(subtask.id);
        await loadSubtasks();
        if (currentTask && currentTask.id) {
          store.updateTaskSubtaskStats(currentTask.id, subtasks);
        }
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
        if (currentTask && currentTask.id) {
          store.updateTaskSubtaskStats(currentTask.id, subtasks);
        }
        store.showToast('Subtask purged.', 'info');
      } else {
        store.showToast('Failed to delete subtask: ' + res.error, 'danger');
      }
    } catch (e) {
      store.showToast('Error: ' + e.message, 'danger');
    }
  }

  async function moveSubtaskUp(index) {
    if (index <= 0 || !currentTask || !currentTask.id) return;
    const updated = [...subtasks];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    subtasks = updated;
    triggerSubtaskHighlight(subtasks[index - 1].id);

    try {
      const subtaskIds = subtasks.map(s => s.id);
      await window.electronAPI.reorderSubtasks({ taskId: currentTask.id, subtaskIds });
    } catch (e) {
      console.error('Failed to persist subtask reorder:', e);
    }
  }

  function openMarkdown() { 
    if (currentTask && currentTask.id) store.openStrategiesFile(currentTask); 
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

  function focusTextarea(node) {
    setTimeout(() => {
      if (node && node.isConnected) node.focus();
    }, 60);
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

  async function handleKey(e) { 
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
      } else if (isArchiveModalOpen) {
        closeArchiveModal();
      } else {
        onClose();
      }
      return;
    }

    // Ctrl+Enter or Ctrl+S: Confirm Archive inside active modal
    if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || key === 's')) {
      if (isArchiveModalOpen && archiveTimerSeconds === 0 && endNoteText.trim()) {
        e.preventDefault();
        handleArchiveSubmit();
        return;
      }
    }

    // Single-key shortcuts when not typing in an input
    if (!isInputFocused && !isArchiveModalOpen) {
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

      // Space: Toggle 3-stage status of focused subtask (Initiated -> Doing -> Completed)
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
          const confirmed = window.confirm('Delete this subtask? This cannot be undone.');
          if (!confirmed) return;
          const targetId = subtasks[focusedSubtaskIndex].id;
          await deleteSubtask(targetId);
          focusedSubtaskIndex = -1;
        }
        return;
      }

      if (key === 'v') {
        e.preventDefault();
        openArchiveModal('Victory');
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
<div class="modal-overlay">
  <!-- EXPANDED 1240px × 740px 3-COLUMN WINDOW CANVAS -->
  <div class="modal-window-expanded" onclick={(e) => e.stopPropagation()}>
    
    <!-- Window Header -->
    <div class="window-header">
      <div class="header-title-wrap">
        <span class="priority-dot {taskPriorityLower}"></span>
        <Flame size={18} class="header-icon" />
        <span class="header-title-text">EXECUTION OPERATIONAL MANIFEST</span>
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
          <span class="col-title">CAMPAIGN METADATA</span>
        </div>

        <h2 class="task-title-large">{taskTitle}</h2>

        <div class="meta-row">
          <span class="badge-tactical badge-{taskPriorityLower}">{taskPriority === 'Critical' ? 'High' : taskPriority.toUpperCase()} PRIORITY</span>
          <div class="days-pill" class:urgent={daysLeft <= 2} class:overdue={daysLeft < 0}>
            <Clock size={13} />
            <span>{daysLeft < 0 ? `${Math.abs(daysLeft)}D OVERDUE` : `${daysLeft} DAYS LEFT`}</span>
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
            onkeydown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSubtask();
              } else if (e.key === 'Escape') {
                e.stopPropagation();
                if (newSubtaskTitle) {
                  newSubtaskTitle = '';
                } else {
                  subtaskInputEl?.blur();
                }
              }
            }}
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
                <!-- 3-Stage Status Toggle Button -->
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div 
                  class="subtask-stage-toggle" 
                  onclick={() => cycleSubtaskStatus(subtask)}
                  title="Click to cycle stage: Initiated -> Doing -> Completed"
                >
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

        <!-- DIRECT INLINE TITLE EDITING (No separate wrapper box!) -->
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
                  <!-- Title (15px Crisp Bold Font) -->
                  <div class="subtask-title-wrap">
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <span 
                      class="subtask-title-text" 
                      onclick={() => cycleSubtaskStatus(subtask)}
                      ondblclick={() => startEditingSubtask(subtask)}
                      title="Click to cycle status, double-click to edit title"
                    >
                      {subtask.title}
                    </span>

                    <!-- Concise Strike Summary Badge (Click to toggle expanded view) -->
                    {#if linkedStrikesMap[subtask.id] && linkedStrikesMap[subtask.id].length > 0}
                      {@const strikes = linkedStrikesMap[subtask.id]}
                      {@const isExpanded = expandedSubtaskIds.has(subtask.id)}
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <button 
                        type="button"
                        class="subtask-strikes-toggle-btn"
                        class:is-expanded={isExpanded}
                        onclick={(e) => toggleSubtaskExpand(subtask.id, e)}
                        title={isExpanded ? 'Click to collapse linked strikes' : 'Click to expand linked strikes'}
                      >
                        <Zap size={12} class="toggle-zap-icon" />
                        <span>{strikes.length} Strike{strikes.length > 1 ? 's' : ''}</span>
                        <ChevronUp size={12} class="toggle-chevron {isExpanded ? '' : 'rotated'}" />
                      </button>
                    {/if}
                  </div>
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

              <!-- Clean Nested Expandable Strikes Panel -->
              {#if linkedStrikesMap[subtask.id] && linkedStrikesMap[subtask.id].length > 0 && expandedSubtaskIds.has(subtask.id)}
                <div class="nested-strikes-container">
                  <div class="nested-strikes-list">
                    {#each linkedStrikesMap[subtask.id] as strike (strike.id)}
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <div 
                        class="nested-strike-item {(strike.status || 'unknown').toLowerCase()}"
                        onclick={() => { onClose(); store.navigateToStrike(strike.id); }}
                        title="Click to jump to Strike directive in STRIKES tab"
                      >
                        <div class="nested-strike-left">
                          <Zap size={13} class="nested-zap {(strike.status || 'unknown').toLowerCase()}" />
                          <span class="nested-strike-title">{strike.title}</span>
                        </div>
                        <div class="nested-strike-right">
                          <span class="nested-strike-date"><Calendar size={11} /> {strike.execution_date}</span>
                          <span class="nested-strike-priority-badge badge-{(strike.priority || 'Medium').toLowerCase()}">{(strike.priority || 'Medium').toUpperCase()}</span>
                          <span class="nested-strike-status-badge {(strike.status || 'unknown').toLowerCase()}">{strike.status}</span>
                          <ArrowRight size={13} class="nested-jump-arrow" />
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
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

          <!-- Node 4: Reschedule 1 (if used) -->
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

          <!-- Node 5: Reschedule 2 (if used) -->
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

          <!-- Node 6: Target Deadline -->
          <div class="journey-step" class:last={!taskEndedDate}>
            <div class="journey-node node-deadline"></div>
            {#if taskEndedDate}<div class="journey-line"></div>{/if}
            <div class="journey-content">
              <span class="journey-label">TARGET DEADLINE</span>
              <span class="journey-date deadline">{taskDeadline || '—'}</span>
              <span class="journey-desc">{daysLeft < 0 ? `Breached — Overdue` : `${daysLeft} Days Left`}</span>
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

    <!-- WINDOW FOOTER ACTION CONTROLS (ABORT ON LEFT, STRATEGIES ON RIGHT) -->
    <div class="window-footer">
      <button type="button" class="footer-btn btn-abort" onclick={() => openArchiveModal('Aborted')}>
        <XCircle size={16} />
        <span>ABORT CAMPAIGN</span>
      </button>

      <button type="button" class="footer-btn btn-victory" onclick={() => openArchiveModal('Victory')}>
        <CheckCircle2 size={16} />
        <span>VICTORY ARCHIVE</span>
      </button>

      <button type="button" class="footer-btn btn-markdown" onclick={openMarkdown}>
        <FileText size={16} />
        <span>STRATEGIES (.MD)</span>
      </button>
    </div>
  </div>
</div>

<!-- ARCHIVE END NOTE MANDATORY MODAL OVERLAY -->
{#if isArchiveModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="deploy-modal-overlay">
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
        <button type="button" class="close-dialog-btn" onclick={closeArchiveModal}>
          <X size={18} />
        </button>
      </div>

      <div class="deploy-dialog-body">
        <div class="deploy-field">
          <label for="archive-end-note-input">TACTICAL END NOTE (MANDATORY LESSONS / OUTCOME LOG)</label>
          <textarea
            id="archive-end-note-input"
            bind:value={endNoteText}
            use:focusTextarea
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
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
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
    border: 1px solid rgba(6, 182, 212, 0.45);
    border-radius: 26px;
    box-shadow: 0 28px 72px rgba(0, 0, 0, 0.95), 0 0 44px rgba(6, 182, 212, 0.25);
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
    background: rgba(6, 182, 212, 0.08);
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

  :global(.header-icon) { color: #38bdf8; }

  .header-title-text {
    font-size: 13px; font-weight: 900; letter-spacing: 0.12em; word-spacing: 0.10em; color: #38bdf8;
  }

  .btn-close-window {
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(255, 255, 255, 0.06); border: 1.5px solid rgba(255, 255, 255, 0.14);
    color: #94a3b8; display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  .btn-close-window:hover {
    background: rgba(239, 68, 68, 0.25); color: #fca5a5; border-color: rgba(239, 68, 68, 0.7);
    transform: rotate(90deg) scale(1.08); box-shadow: 0 0 16px rgba(239, 68, 68, 0.45);
  }

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

  :global(.col-icon) { color: #fca5a5; }

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

  .days-pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 12px; border-radius: 99px; font-size: 11px; font-weight: 900;
    color: #34d399; background: rgba(52, 211, 153, 0.12); border: 1px solid rgba(52, 211, 153, 0.35);
  }
  .days-pill.urgent { color: #f59e0b; background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.40); }
  .days-pill.overdue { color: #f87171; background: rgba(239, 68, 68, 0.20); border-color: rgba(239, 68, 68, 0.50); }

  /* Classifications & Tags */
  .tags-section { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
  .section-label { font-size: 10px; font-weight: 900; letter-spacing: 0.08em; color: var(--text-dim); }
  .tags-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .tag-pill-item {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em;
    color: #c4b5fd;
    background: rgba(139, 92, 246, 0.12);
    border: 1px solid rgba(139, 92, 246, 0.25);
    padding: 4px 10px; border-radius: 9999px;
    cursor: pointer; user-select: none;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .tag-pill-item:hover {
    background: rgba(139, 92, 246, 0.28);
    border-color: rgba(168, 85, 247, 0.65);
    color: #ffffff;
    box-shadow: 0 0 14px rgba(139, 92, 246, 0.35);
    transform: translateY(-1.5px) scale(1.03);
  }
  .tag-pill-item:active {
    transform: translateY(0) scale(0.96);
  }

  .info-block {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: rgba(255, 255, 255, 0.02);
    padding: 16px 18px;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .info-label {
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.08em;
    color: var(--text-dim);
  }

  .info-value {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 800;
    color: var(--text-main);
  }
  .info-value.deadline { color: #fca5a5; }
  .info-value.permit { color: #c4b5fd; }
  .info-value.mono { font-family: 'Courier New', monospace; color: #c4b5fd; letter-spacing: 0.04em; }

  /* Compact Meta Info Grid in Portion 1 */
  .meta-info-grid { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
  .meta-info-item { display: flex; flex-direction: column; gap: 3px; padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; }
  .meta-info-label { font-size: 10px; font-weight: 900; letter-spacing: 0.08em; color: var(--text-dim); }
  .meta-info-value { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 800; color: #fca5a5; }
  .meta-info-value.deadline { color: #fca5a5; }
  .meta-info-value.permit { color: #fbbf24; }

  /* Standardized Campaign Journey Timeline in Portion 3 */
  .timeline-scroll { display: flex; flex-direction: column; gap: 0; overflow-y: auto; flex: 1; padding: 4px 0 8px 0; }
  .journey-step { display: flex; align-items: flex-start; gap: 14px; position: relative; min-height: 82px; }
  .journey-step .journey-line { position: absolute; left: 6px; top: 20px; bottom: -18px; width: 2px; background: linear-gradient(180deg, rgba(139,92,246,0.45) 0%, rgba(139,92,246,0.10) 100%); z-index: 1; }
  .journey-step.last .journey-line { display: none; }
  .journey-node { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; z-index: 5; position: relative; border: 2px solid rgba(10, 15, 26, 0.98); }
  .node-logged { background: #8b5cf6; box-shadow: 0 0 14px rgba(139,92,246,0.85); }
  .node-initiated { background: #60a5fa; box-shadow: 0 0 14px rgba(96,165,250,0.85); }
  .node-modified { background: #38bdf8; box-shadow: 0 0 14px rgba(56,189,248,0.85); }
  .node-reschedule { background: #f59e0b; box-shadow: 0 0 14px rgba(245,158,11,0.85); }
  .node-deadline { background: #ef4444; box-shadow: 0 0 14px rgba(239,68,68,0.85); }
  .node-victory { background: #10b981; box-shadow: 0 0 14px rgba(16,185,129,0.85); }
  .node-aborted { background: #ef4444; box-shadow: 0 0 14px rgba(239,68,68,0.85); }
  .journey-content { display: flex; flex-direction: column; gap: 4px; padding-bottom: 32px; flex: 1; }
  .journey-step.last .journey-content { padding-bottom: 0; }
  .journey-label { font-size: 10px; font-weight: 900; letter-spacing: 0.08em; word-spacing: 0.06em; color: var(--text-dim); }
  .journey-date { font-size: 13px; font-weight: 800; color: #c4b5fd; word-spacing: 0.05em; }
  .journey-date.initiated { color: #60a5fa; }
  .journey-date.modified { color: #38bdf8; }
  .journey-date.reschedule { color: #fbbf24; }
  .journey-date.deadline { color: #f87171; }
  .journey-date.victory { color: #34d399; }
  .journey-date.aborted { color: #f87171; }
  .journey-desc { font-size: 10.5px; font-weight: 600; color: var(--text-dim); line-height: 1.4; }
  .journey-note-box {
    margin-top: 8px; padding: 10px 14px;
    background: rgba(0, 0, 0, 0.45); border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px; display: flex; flex-direction: column; gap: 4px;
  }
  .journey-note-label { font-size: 9.5px; font-weight: 900; letter-spacing: 0.08em; color: #c4b5fd; text-transform: uppercase; }
  .journey-note-text { font-size: 12px; font-weight: 600; color: #f3e8ff; line-height: 1.4; margin: 0; word-break: break-word; }

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
    color: #fca5a5;
  }

  .subtask-add-row { display: flex; gap: 10px; }

  .subtask-input {
    flex: 1;
    padding: 13px 18px;
    font-size: 15px;
    font-weight: 800;
    word-spacing: 0.12em;
    letter-spacing: 0.03em;
    background: rgba(6, 10, 18, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 12px;
    color: #ffffff;
    transition: all 0.15s ease;
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

  .subtask-title-wrap {
    flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0;
  }

  .subtask-strikes-toggle-btn {
    display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 6px;
    font-size: 10.5px; font-weight: 900; color: #f59e0b; background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.45); cursor: pointer; transition: all 0.15s ease;
    width: fit-content; margin-top: 3px;
  }
  .subtask-strikes-toggle-btn:hover, .subtask-strikes-toggle-btn.is-expanded {
    background: rgba(245, 158, 11, 0.3); border-color: rgba(245, 158, 11, 0.75);
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.3); color: #ffffff;
  }
  :global(.toggle-zap-icon) { color: #f59e0b; }
  :global(.toggle-chevron) { color: #f59e0b; transition: transform 0.2s ease; }
  :global(.toggle-chevron.rotated) { transform: rotate(180deg); }

  /* NESTED EXPANDABLE STRIKES LIST UI */
  .nested-strikes-container {
    margin-top: -3px; margin-left: 28px; padding: 10px 14px;
    background: rgba(6, 10, 18, 0.95); border: 1.5px solid rgba(245, 158, 11, 0.35);
    border-radius: 12px; display: flex; flex-direction: column; gap: 8px;
    box-shadow: inset 0 2px 6px rgba(0,0,0,0.5), 0 4px 15px rgba(0,0,0,0.4);
    animation: nestedSlideDown 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes nestedSlideDown {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .nested-strikes-header {
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 5px;
  }
  .nested-header-title { font-size: 9.5px; font-weight: 900; color: #a78bfa; letter-spacing: 0.08em; }

  .nested-strikes-list { display: flex; flex-direction: column; gap: 6px; }

  .nested-strike-item {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 7px 10px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px; cursor: pointer; transition: all 0.15s ease;
  }
  .nested-strike-item:hover {
    background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.5);
    transform: translateX(3px); box-shadow: 0 2px 10px rgba(0,0,0,0.4);
  }

  .nested-strike-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
  :global(.nested-zap) { color: #f59e0b; flex-shrink: 0; }
  :global(.nested-zap.neutralized) { color: #34d399; }
  :global(.nested-zap.engaged) { color: #60a5fa; }
  :global(.nested-zap.pending) { color: #ef4444; }

  .nested-strike-title {
    font-size: 12.5px; font-weight: 700; color: #ffffff;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .nested-strike-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .nested-strike-date { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: #94a3b8; }

  .nested-strike-priority-badge {
    font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.04em;
    color: #fde047; background: rgba(253, 224, 71, 0.15); border: 1px solid rgba(253, 224, 71, 0.35);
  }
  .nested-strike-priority-badge.badge-high { color: #fca5a5; background: rgba(239, 68, 68, 0.18); border-color: rgba(239, 68, 68, 0.45); }
  .nested-strike-priority-badge.badge-low { color: #93c5fd; background: rgba(59, 130, 246, 0.18); border-color: rgba(59, 130, 246, 0.45); }

  .nested-strike-status-badge {
    font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.04em;
    color: #f59e0b; background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.4);
  }
  .nested-strike-status-badge.neutralized { color: #a7f3d0; background: rgba(52, 211, 153, 0.2); border-color: rgba(52, 211, 153, 0.4); }
  .nested-strike-status-badge.engaged { color: #93c5fd; background: rgba(96, 165, 250, 0.2); border-color: rgba(96, 165, 250, 0.4); }
  .nested-strike-status-badge.pending { color: #fca5a5; background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4); }
  .nested-strike-status-badge.aborted { color: #94a3b8; background: rgba(100, 116, 139, 0.2); border-color: rgba(100, 116, 139, 0.4); }

  :global(.nested-jump-arrow) { color: #f59e0b; transition: transform 0.15s ease; opacity: 0.8; }
  .nested-strike-item:hover :global(.nested-jump-arrow) { transform: translateX(3px); opacity: 1; color: #ffffff; }

  /* 15px Crisp Bold Font */
  .subtask-title-text {
    flex: 1; font-size: 15px; font-weight: 800; letter-spacing: 0.01em; color: var(--text-main);
    cursor: pointer; word-break: break-word;
  }

  /* Inline Editing UI */
  .inline-edit-wrap {
    flex: 1; display: flex; align-items: center; gap: 6px;
  }

  .inline-edit-input {
    flex: 1; padding: 6px 12px; font-size: 14px; font-weight: 800; color: #ffffff;
    background: rgba(6, 10, 18, 0.95); border: 1px solid rgba(239, 68, 68, 0.65);
    border-radius: 8px; outline: none; box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.20);
  }

  .inline-row-input {
    flex: 1; padding: 6px 16px; font-size: 13.5px; font-weight: 700;
    color: #ffffff; background: rgba(6, 10, 18, 0.95); border: 1.5px solid rgba(6, 182, 212, 0.7);
    border-radius: 9999px; outline: none; box-shadow: 0 0 12px rgba(6, 182, 212, 0.35);
    min-width: 0;
  }

  .inline-btn {
    width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    border: none; cursor: pointer; transition: all 0.15s ease;
  }
  .inline-btn.save { background: rgba(16, 185, 129, 0.25); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.45); }
  .inline-btn.save:hover { background: rgba(16, 185, 129, 0.45); }
  .inline-btn.cancel { background: rgba(239, 68, 68, 0.25); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.45); }
  .inline-btn.cancel:hover { background: rgba(239, 68, 68, 0.45); }

  .subtask-actions { display: flex; align-items: center; gap: 6px; }

  .subtask-edit-btn, .subtask-order-btn, .subtask-delete-btn, .subtask-save-btn, .subtask-cancel-btn {
    width: 30px; height: 30px; border-radius: 50% !important; display: flex; align-items: center; justify-content: center;
    background: rgba(255, 255, 255, 0.05); border: 1.5px solid rgba(255, 255, 255, 0.12); color: var(--text-muted);
    cursor: pointer; transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }
  .subtask-save-btn {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.35), rgba(5, 150, 105, 0.25)) !important;
    color: #34d399 !important; border-color: rgba(52, 211, 153, 0.65) !important;
  }
  .subtask-save-btn:hover {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.65), rgba(5, 150, 105, 0.45)) !important;
    color: #ffffff !important; border-color: #34d399 !important; transform: scale(1.12);
    box-shadow: 0 0 14px rgba(16, 185, 129, 0.6) !important;
  }
  .subtask-cancel-btn {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.35), rgba(220, 38, 38, 0.25)) !important;
    color: #f87171 !important; border-color: rgba(248, 113, 113, 0.65) !important;
  }
  .subtask-cancel-btn:hover {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.65), rgba(220, 38, 38, 0.45)) !important;
    color: #ffffff !important; border-color: #ef4444 !important; transform: scale(1.12) rotate(90deg);
    box-shadow: 0 0 14px rgba(239, 68, 68, 0.6) !important;
  }
  .subtask-edit-btn:hover {
    background: rgba(96, 165, 250, 0.25); color: #60a5fa; border-color: rgba(96, 165, 250, 0.65); transform: scale(1.1);
    box-shadow: 0 0 12px rgba(96, 165, 250, 0.4);
  }
  .subtask-order-btn:hover:not(:disabled) {
    background: rgba(245, 158, 11, 0.25); color: #f59e0b; border-color: rgba(245, 158, 11, 0.65); transform: scale(1.1) translateY(-1px);
    box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
  }
  .subtask-order-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .subtask-delete-btn:hover {
    background: rgba(239, 68, 68, 0.25); color: #fca5a5; border-color: rgba(239, 68, 68, 0.65); transform: scale(1.1);
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
  }

  /* PORTION 3: TASK JOURNEY TIMELINE */
  .timeline-container {
    display: flex; flex-direction: column; gap: 18px; position: relative; padding-left: 20px; margin-top: 6px;
  }
  .timeline-container::before {
    content: ''; position: absolute; top: 6px; bottom: 6px; left: 7px; width: 2px; background: rgba(255, 255, 255, 0.12);
  }

  .timeline-step { position: relative; display: flex; flex-direction: column; gap: 3px; }

  .node-marker {
    position: absolute; left: -19px; top: 3px; width: 12px; height: 12px; border-radius: 50%;
    background: rgba(255, 255, 255, 0.3); border: 2px solid rgba(10, 15, 26, 0.98);
  }
  .node-marker.active { background: #60a5fa; box-shadow: 0 0 12px rgba(96, 165, 250, 0.8); }
  .node-marker.warning { background: #f59e0b; box-shadow: 0 0 12px rgba(245, 158, 11, 0.8); }
  .node-marker.deadline { background: #ef4444; box-shadow: 0 0 12px rgba(239, 68, 68, 0.8); }
  .node-marker.outcome { background: #10b981; box-shadow: 0 0 12px rgba(16, 185, 129, 0.8); }

  .step-content { display: flex; flex-direction: column; gap: 2px; }
  .step-title { font-size: 11px; font-weight: 900; letter-spacing: 0.06em; color: var(--text-main); }
  .step-date { font-size: 11.5px; font-weight: 800; color: #fca5a5; }
  .step-desc { font-size: 10.5px; font-weight: 600; color: var(--text-dim); }
  .step-note { font-size: 11px; font-style: italic; color: #ddd6fe; margin-top: 4px; line-height: 1.35; }

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
    border-radius: 9999px;
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

  .btn-victory {
    color: #ffffff;
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.45), rgba(5, 150, 105, 0.35));
    border: 1px solid rgba(52, 211, 153, 0.65);
    box-shadow: 0 0 20px rgba(16, 185, 129, 0.35);
  }
  .btn-victory:hover {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.70), rgba(5, 150, 105, 0.60));
    box-shadow: 0 0 28px rgba(16, 185, 129, 0.55);
    border-color: rgba(52, 211, 153, 0.90);
  }

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
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.45), rgba(59, 130, 246, 0.35));
    border: 1px solid rgba(56, 189, 248, 0.60);
    box-shadow: 0 0 20px rgba(6, 182, 212, 0.30);
  }
  .btn-markdown:hover {
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.65), rgba(59, 130, 246, 0.55));
    box-shadow: 0 0 28px rgba(6, 182, 212, 0.50);
    border-color: rgba(56, 189, 248, 0.90);
  }

  /* OVERLAY MODALS */
  .deploy-modal-overlay {
    position: fixed; top: 64px; bottom: 0; left: 0; right: 0; z-index: 9500;
    background: rgba(4, 7, 14, 0.88); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center; padding: 24px; animation: fadeIn 0.18s ease;
  }

  .deploy-modal-dialog {
    width: 580px; max-width: 92vw; background: rgba(12, 17, 29, 0.98);
    border: 1px solid rgba(245, 158, 11, 0.45); border-radius: 24px;
    box-shadow: 0 28px 72px rgba(0, 0, 0, 0.95), 0 0 40px rgba(245, 158, 11, 0.25);
    display: flex; flex-direction: column; overflow: hidden; animation: windowScale 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .deploy-dialog-header {
    display: flex; align-items: center; gap: 16px; padding: 22px 30px;
    background: rgba(245, 158, 11, 0.08); border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .deploy-dialog-header.victory { background: rgba(52, 211, 153, 0.08); }
  .deploy-dialog-header.aborted { background: rgba(239, 68, 68, 0.08); }

  .deploy-icon-box {
    width: 48px; height: 48px; border-radius: 50%; background: rgba(245, 158, 11, 0.18);
    border: 1px solid rgba(245, 158, 11, 0.45); display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.25); flex-shrink: 0;
  }
  .deploy-icon-box.victory { background: rgba(52, 211, 153, 0.18); border-color: rgba(52, 211, 153, 0.45); }
  .deploy-icon-box.aborted { background: rgba(239, 68, 68, 0.18); border-color: rgba(239, 68, 68, 0.45); }

  :global(.victory-icon) { color: #34d399; }
  :global(.abort-icon) { color: #f87171; }

  .deploy-dialog-title { font-size: 15.5px; font-weight: 900; letter-spacing: 0.08em; word-spacing: 0.10em; color: #fef3c7; margin: 0; }
  .deploy-dialog-sub { font-size: 12px; font-weight: 600; letter-spacing: 0.03em; color: var(--text-muted); margin-top: 3px; }

  .close-dialog-btn {
    margin-left: auto; width: 36px; height: 36px; border-radius: 50%; background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.10); color: var(--text-muted); display: flex; align-items: center;
    justify-content: center; cursor: pointer; transition: all 0.15s ease;
  }
  .close-dialog-btn:hover { background: rgba(239, 68, 68, 0.22); color: #f87171; }

  .deploy-dialog-body { padding: 28px 30px; display: flex; flex-direction: column; gap: 18px; }

  .deploy-field { display: flex; flex-direction: column; gap: 10px; }
  .deploy-field label { font-size: 11.5px; font-weight: 900; letter-spacing: 0.09em; color: var(--text-muted); }

  .end-note-textarea {
    width: 100%; padding: 14px 18px; font-size: 15.5px; font-weight: 800; word-spacing: 0.08em; color: var(--text-main);
    background: rgba(6, 10, 18, 0.90); border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 14px;
    box-sizing: border-box; resize: vertical; transition: all 0.15s ease;
  }
  .end-note-textarea:focus { border-color: rgba(139, 92, 246, 0.6); box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.18); outline: none; }

  .deploy-dialog-footer {
    display: flex; align-items: center; justify-content: flex-end; gap: 14px; padding: 20px 30px;
    background: rgba(0, 0, 0, 0.25); border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .btn-abort-btn { flex: 0 0 auto; padding: 12px 24px; font-size: 11.5px; }
  .btn-victory-confirm { flex: 1; background: linear-gradient(135deg, #10b981, #059669); border-color: rgba(167, 243, 208, 0.6); box-shadow: 0 0 26px rgba(16, 185, 129, 0.5); color: #ffffff; }
  .btn-abort-confirm { flex: 1; background: linear-gradient(135deg, #ef4444, #dc2626); border-color: rgba(254, 202, 202, 0.6); box-shadow: 0 0 26px rgba(239, 68, 68, 0.5); color: #ffffff; }
</style>
