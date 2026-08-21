<script>
  import { store } from '../../../lib/store.svelte.js';
  import { ChronosMath, getFormattedDate } from '../../../lib/ChronosMath.js';
  import { 
    Brain, FileText, Rocket, Edit2, Plus, ChevronUp,
    CheckSquare, Clock, Square, Trash2, Tag as TagIcon, 
    X, Calendar, Calendar as CalendarIcon, ListTodo, GitCommit, Check, AlertTriangle, CheckCircle2
  } from 'lucide-svelte';

  let { task = null, side = 'right', onClose = () => {}, onOpenEditModal = () => {} } = $props();

  // Safe reactive getters from task prop
  let currentTask = $derived(task || {});
  let taskPriority = $derived(currentTask.priority || 'Medium');
  let taskPriorityLower = $derived(taskPriority.toLowerCase() === 'critical' ? 'high' : taskPriority.toLowerCase());
  let taskTitle = $derived(currentTask.title || '');
  let taskOriginDate = $derived(currentTask.origin_date || '');
  let taskModificationDate = $derived(currentTask.modification_date || currentTask.origin_date || '');
  let taskStage = $derived(currentTask.stage || 'RawIntel');
  let taskTags = $derived(currentTask.tags || []);

  let isDeployOpen = $state(false);
  let deployDateInput = $state(''); // Supports manual DD-MM-YYYY or YYYY-MM-DD
  let nativeDeployPicker = $state(null);

  // Subtasks state & highlight
  let subtasks = $state([]);
  let newSubtaskTitle = $state('');
  let isAddingSubtask = $state(false);
  let highlightedSubtaskId = $state(null);
  let subtaskInputRef = $state(null);

  // Subtask stage counters
  let completedCount = $derived(subtasks.filter(s => s.status === 'Completed').length);
  let doingCount = $derived(subtasks.filter(s => s.status === 'Doing').length);
  let subtaskPct = $derived(subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0);

  // Inline Subtask Title Editing state
  let editingSubtaskId = $state(null);
  let editingSubtaskText = $state('');

  // Compute today's ISO string (YYYY-MM-DD) for min attribute of date picker
  const todayIso = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();

  function getFormattedTodayDdMmYyyy() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
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
    } else { // DD-MM-YYYY
      dd = parseInt(parts[0], 10);
      mm = parseInt(parts[1], 10) - 1;
      yyyy = parseInt(parts[2], 10);
    }

    if (!ChronosMath.isValidCalendarDate(dd, mm, yyyy)) return false;

    const d = new Date(yyyy, mm, dd, 0, 0, 0, 0);
    const now = new Date();
    const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return d.getTime() >= todayZero.getTime();
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const trimmed = dateStr.trim();
    if (!trimmed.includes('-')) return trimmed;
    const parts = trimmed.split('-');
    if (parts.length !== 3) return trimmed;
    if (parts[0].length === 4) {
      const dd = String(parseInt(parts[2], 10)).padStart(2, '0');
      const mm = String(parseInt(parts[1], 10)).padStart(2, '0');
      const yyyy = parts[0];
      return `${dd}-${mm}-${yyyy}`;
    } else {
      const dd = String(parseInt(parts[0], 10)).padStart(2, '0');
      const mm = String(parseInt(parts[1], 10)).padStart(2, '0');
      const yyyy = parts[2];
      return `${dd}-${mm}-${yyyy}`;
    }
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

  async function addSubtask(e) {
    if (e && e.preventDefault) e.preventDefault();
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
      store.showToast('Failed to update subtask: ' + e.message, 'danger');
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
        store.showToast('Subtask deleted.', 'info');
      }
    } catch (e) {
      store.showToast('Failed to delete subtask: ' + e.message, 'danger');
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

  function openDeploy() {
    deployDateInput = getFormattedTodayDdMmYyyy();
    isDeployOpen = true;
  }

  async function confirmDeploy() {
    if (!validateDateStr(deployDateInput)) {
      store.showToast('Invalid or past deadline date.', 'warning');
      return;
    }
    const formattedDeadline = formatDisplayDate(deployDateInput);

    if (!currentTask || !currentTask.id) return;
    const success = await store.assignDeadlineAndExecute(currentTask.id, formattedDeadline);
    if (success) {
      isDeployOpen = false;
      onClose();
    }
  }

  function openMarkdown() { 
    if (currentTask && currentTask.id) store.openStrategiesFile(currentTask); 
  }

  function handleTriggerEditModal() {
    if (onOpenEditModal && currentTask) {
      onOpenEditModal(currentTask);
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
      if (editingSubtaskId !== null) {
        cancelEditingSubtask();
      } else if (isDeployOpen) {
        isDeployOpen = false;
      } else {
        onClose();
      }
      return;
    }

    if (!isInputFocused && !isDeployOpen && subtasks.length > 0) {
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
        <Brain size={18} class="header-icon" />
        <span class="header-title-text">ARSENAL STRATEGIZING MANIFEST</span>
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
          <span class="badge-tactical badge-{taskPriorityLower}">{taskPriority === 'Critical' ? 'High' : taskPriority} PRIORITY</span>
          <span class="stage-badge">{taskStage.toUpperCase()}</span>
        </div>

        <!-- Tags Section -->
        {#if taskTags.length > 0}
          <div class="tags-section">
            <span class="section-label">CLASSIFICATIONS & TAGS</span>
            <div class="tags-row">
              {#each taskTags as tag}
                <span class="tag"><TagIcon size={11} /> {tag.tag_name}</span>
              {/each}
            </div>
          </div>
        {/if}

      </div>

      <!-- PORTION 2: MIDDLE SUBTASKS MODULE (With Header Progress Track & Percentage Counter) -->
      <div class="portion-column portion-middle">
        <div class="column-header subtasks-header">
          <div class="header-left-title">
            <ListTodo size={15} class="col-icon" />
            <span class="col-title">TACTICAL SUBTASKS</span>
          </div>
          
          {#if subtasks.length > 0}
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
            bind:this={subtaskInputRef}
            type="text" 
            placeholder="Enter new subtask title..." 
            bind:value={newSubtaskTitle}
            onkeydown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSubtask(e);
              } else if (e.key === 'Escape') {
                e.stopPropagation();
                if (newSubtaskTitle) {
                  newSubtaskTitle = '';
                } else {
                  subtaskInputRef?.blur();
                }
              }
            }}
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

        <!-- Subtasks Scrollable List (Internal Padding to Prevent Boundary Clipping) -->
        <div class="subtasks-scroll-container">
          {#if subtasks.length === 0}
            <div class="empty-subtasks">
              <span>No tactical subtasks logged yet. Add subtasks to organize granular mission steps.</span>
            </div>
          {:else}
            {#each subtasks as subtask, idx (subtask.id)}
              <div 
                class="subtask-item-card {subtask.status ? subtask.status.toLowerCase() : 'initiated'}" 
                class:just-updated-subtask={highlightedSubtaskId === subtask.id}
                use:scrollSubtaskIfHighlighted={highlightedSubtaskId === subtask.id}
              >
                <!-- Status Badge (READ-ONLY in Arsenal — add/edit/delete allowed, but no status cycling) -->
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="subtask-stage-badge-readonly" onclick={() => store.showToast('ARSENAL STAGE: Subtasks are in planning. Deploy campaign to Execution to cycle subtask progress.', 'info')}>
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
                  <!-- Title (15px Prominent Bold Font - double-click to edit) -->
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

          <!-- Node 2: Last Modification -->
          <div class="journey-step">
            <div class="journey-node node-modified"></div>
            <div class="journey-line"></div>
            <div class="journey-content">
              <span class="journey-label">LAST MODIFICATION</span>
              <span class="journey-date modified">{taskModificationDate || taskOriginDate}</span>
              <span class="journey-desc">Last updated in system</span>
            </div>
          </div>

          <!-- Node: Current Status -->
          <div class="journey-step last">
            <div class="journey-node node-current"></div>
            <div class="journey-content">
              <span class="journey-label">CURRENT STAGE</span>
              <span class="journey-date current">{taskStage.toUpperCase()}</span>
              <span class="journey-desc">Awaiting Deployment</span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Window Footer: 3 DISTINCT BUTTONS -->
    <div class="window-footer">
      <button type="button" class="footer-btn btn-secondary" onclick={handleTriggerEditModal}>
        <Edit2 size={15} />
        <span>EDIT DETAILS</span>
      </button>

      <button type="button" class="footer-btn btn-deploy" onclick={openDeploy}>
        <Rocket size={15} />
        <span>DEPLOY</span>
      </button>

      <button type="button" class="footer-btn btn-secondary" onclick={openMarkdown}>
        <FileText size={15} />
        <span>STRATEGIES (.MD)</span>
      </button>
    </div>

  </div>
</div>

<!-- DEPLOYMENT CALENDAR DATE SELECTOR WINDOW MODAL (520px Large Dialog) -->
{#if isDeployOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="deploy-modal-overlay">
    <div class="deploy-modal-card" onclick={(e) => e.stopPropagation()}>
      <div class="deploy-card-header">
        <div class="deploy-title-wrap">
          <Rocket size={20} class="deploy-icon" />
          <h3>BATTLEFIELD DEPLOYMENT DEADLINE</h3>
        </div>
        <button type="button" class="btn-close-deploy" onclick={() => isDeployOpen = false}>
          <X size={18} />
        </button>
      </div>

      <div class="date-picker-wrap">
        <input 
          type="text" 
          placeholder="DD-MM-YYYY"
          bind:value={deployDateInput}
          class="deploy-text-input"
        />
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
          class="calendar-btn-2x" 
          title="Pick date from native calendar"
          onclick={() => {
            try {
              if (nativeDeployPicker && nativeDeployPicker.showPicker) {
                nativeDeployPicker.showPicker();
              }
            } catch (err) {}
          }}
        >
          <CalendarIcon size={20} />
          <input 
            bind:this={nativeDeployPicker}
            type="date"
            min={todayIso}
            class="hidden-native-date-2x"
            onchange={(e) => {
              if (e.target.value) {
                const parts = e.target.value.split('-');
                if (parts.length === 3) {
                  deployDateInput = `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
              }
            }}
          />
        </div>
      </div>

      <div class="date-status-badge {validateDateStr(deployDateInput) ? 'valid' : 'invalid'}">
        {#if validateDateStr(deployDateInput)}
          {@const days = getDaysFromToday(deployDateInput)}
          <CheckCircle2 size={15} />
          <span>{days === 0 ? 'TODAY' : `${days} DAYS FROM TODAY`}</span>
        {:else}
          <AlertTriangle size={15} />
          <span>INVALID DATE</span>
        {/if}
      </div>

      <div class="deploy-actions">
        <button type="button" class="btn-deploy-cancel" onclick={() => isDeployOpen = false}>CANCEL</button>
        <button 
          type="button" 
          class="btn-deploy-confirm" 
          disabled={!validateDateStr(deployDateInput)}
          onclick={confirmDeploy}
        >
          CONFIRM DEPLOYMENT
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Strict Navbar Spacing & Centered 1240px × 740px Overlay Canvas */
  .modal-overlay {
    position: fixed;
    top: 64px; left: 0; right: 0; bottom: 0;
    z-index: 1000;
    background: rgba(4, 7, 13, 0.88);
    backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes fadeIn {
    from { opacity: 0; } to { opacity: 1; }
  }

  .modal-window-expanded {
    width: 1240px; height: 740px;
    max-width: 95vw; max-height: calc(100vh - 84px);
    background: rgba(10, 15, 26, 0.95);
    border: 1px solid rgba(139, 92, 246, 0.35);
    border-radius: 24px;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.75), 0 0 32px rgba(139, 92, 246, 0.20);
    display: flex; flex-direction: column; overflow: hidden;
    animation: scaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes scaleUp {
    from { opacity: 0; transform: scale(0.96); }
    to   { opacity: 1; transform: scale(1); }
  }

  /* Header */
  .window-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 28px; background: rgba(139, 92, 246, 0.08);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08); flex-shrink: 0;
  }
  .header-title-wrap { display: flex; align-items: center; gap: 12px; }
  .priority-dot { width: 10px; height: 10px; border-radius: 50%; }
  .priority-dot.high { background: #ef4444; box-shadow: 0 0 10px rgba(239, 68, 68, 0.6); }
  .priority-dot.medium { background: #f59e0b; box-shadow: 0 0 10px rgba(245, 158, 11, 0.6); }
  .priority-dot.low { background: #3b82f6; box-shadow: 0 0 10px rgba(59, 130, 246, 0.6); }

  :global(.header-icon) { color: #c4b5fd; }
  .header-title-text { font-size: 13px; font-weight: 900; letter-spacing: 0.10em; color: #f3e8ff; word-spacing: 0.04em; }

  .btn-close-window {
    width: 36px; height: 36px; border-radius: 50% !important;
    background: rgba(255, 255, 255, 0.06); border: 1.5px solid rgba(255, 255, 255, 0.14);
    color: #94a3b8; display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  .btn-close-window:hover {
    background: rgba(239, 68, 68, 0.25); color: #fca5a5; border-color: rgba(239, 68, 68, 0.7);
    transform: rotate(90deg) scale(1.08); box-shadow: 0 0 16px rgba(239, 68, 68, 0.45);
  }

  /* 3-Column Body Grid */
  .window-body-grid { flex: 1; display: grid; grid-template-columns: 310px 1fr 255px; min-height: 0; }

  .portion-column { padding: 24px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }
  .portion-left { border-right: 1px solid rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.01); }
  .portion-middle { border-right: 1px solid rgba(255, 255, 255, 0.08); }
  .portion-right { background: rgba(0, 0, 0, 0.15); }

  .column-header { display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 900; letter-spacing: 0.08em; color: #c4b5fd; word-spacing: 0.04em; }
  .header-left-title { display: flex; align-items: center; gap: 8px; }
  :global(.col-icon) { color: #c4b5fd; }
  .col-title { flex: 1; }

  .task-title-large { font-size: 20px; font-weight: 900; color: #ffffff; line-height: 1.35; word-break: break-word; letter-spacing: 0.02em; word-spacing: 0.04em; }

  .meta-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .stage-badge { font-size: 10px; font-weight: 900; letter-spacing: 0.06em; color: #c4b5fd; background: rgba(139, 92, 246, 0.18); padding: 4px 10px; border-radius: 99px; border: 1px solid rgba(139, 92, 246, 0.3); }

  .tags-section { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
  .section-label { font-size: 10.5px; font-weight: 900; letter-spacing: 0.08em; color: var(--text-dim); word-spacing: 0.04em; }
  .tags-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .tag { 
    display: inline-flex; 
    align-items: center; 
    gap: 4px; 
    font-size: 11px; 
    font-weight: 800; 
    color: #ddd6fe; 
    background: rgba(139, 92, 246, 0.14); 
    padding: 4px 10px; 
    border-radius: 99px; 
    border: 1px solid rgba(139, 92, 246, 0.28); 
    cursor: pointer;
    user-select: none;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .tag:hover {
    background: rgba(139, 92, 246, 0.32);
    border-color: rgba(168, 85, 247, 0.7);
    color: #ffffff;
    box-shadow: 0 0 14px rgba(139, 92, 246, 0.4);
    transform: translateY(-1.5px) scale(1.03);
  }
  .tag:active {
    transform: translateY(0) scale(0.96);
  }

  /* Obsidian-style property info blocks */
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
  .info-label {
    font-size: 10px; font-weight: 900; letter-spacing: 0.08em;
    color: var(--text-dim); white-space: nowrap; flex-shrink: 0;
  }
  .info-value {
    font-size: 12px; font-weight: 700; color: var(--text-main);
    text-align: right; word-break: break-all;
  }
  .info-value.mono { font-family: 'Courier New', monospace; color: #c4b5fd; letter-spacing: 0.04em; }

  /* Subtasks Column Header Progress Track & Counter */
  .header-progress-group { display: flex; align-items: center; gap: 10px; }
  .header-progress-bar-track { width: 80px; height: 6px; background: rgba(255, 255, 255, 0.1); border-radius: 99px; overflow: hidden; }
  .header-progress-bar-fill { height: 100%; background: linear-gradient(90deg, #8b5cf6, #10b981); border-radius: 99px; transition: width 0.3s ease; }
  .header-progress-label { font-size: 11px; font-weight: 900; color: #a7f3d0; letter-spacing: 0.04em; }
  .subtasks-counter { font-size: 11px; font-weight: 900; color: #c4b5fd; letter-spacing: 0.06em; }

  .subtask-add-row { display: flex; gap: 8px; }
  .subtask-input { flex: 1; padding: 13px 18px; font-size: 15px; font-weight: 800; word-spacing: 0.12em; letter-spacing: 0.03em; background: rgba(6, 10, 18, 0.95); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 12px; color: #ffffff; outline: none; }
  .subtask-input:focus { border-color: rgba(139, 92, 246, 0.65); box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.18); }
  .btn-add-subtask { display: flex; align-items: center; gap: 6px; padding: 10px 16px; font-size: 11.5px; font-weight: 900; letter-spacing: 0.06em; color: #ffffff; background: linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(99, 102, 241, 0.3)); border: 1px solid rgba(139, 92, 246, 0.55); border-radius: 12px; cursor: pointer; }
  .btn-add-subtask:hover:not(:disabled) { background: linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.5)); }
  .btn-add-subtask:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Subtasks Scrollable Container (Internal Padding to Prevent Boundary Clipping) */
  .subtasks-scroll-container { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 6px 8px; }
  .empty-subtasks { font-size: 12.5px; font-weight: 600; color: var(--text-dim); padding: 18px 0; }

  /* Subtask Card with un-clipped highlight boundaries */
  .subtask-item-card {
    display: flex; align-items: center; gap: 10px; padding: 11px 14px;
    background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px; transition: all 0.15s ease; box-sizing: border-box;
  }
  .subtask-item-card:hover { background: rgba(255, 255, 255, 0.06); border-color: rgba(139, 92, 246, 0.35); }
  .subtask-item-card.completed { opacity: 0.65; background: rgba(0, 0, 0, 0.25); }
  .subtask-item-card.completed .subtask-title-text { text-decoration: line-through; color: var(--text-dim); }
  .subtask-item-card.doing { background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.35); }
  
  /* Internal glow highlight without transform scaling */
  .subtask-item-card.just-updated-subtask {
    animation: subtaskPulse 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    border-color: rgba(168, 85, 247, 0.95) !important;
  }

  @keyframes subtaskPulse {
    0%   { box-shadow: inset 0 0 0 2px #a855f7, 0 0 20px rgba(168, 85, 247, 0.5); }
    50%  { box-shadow: inset 0 0 0 2px #a855f7, 0 0 12px rgba(168, 85, 247, 0.3); }
    100% { box-shadow: inset 0 0 0 0 transparent, 0 0 0 transparent; }
  }

  .subtask-stage-badge-readonly { display: inline-flex; align-items: center; gap: 6px; user-select: none; cursor: default; }
  .subtask-stage-toggle { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; }
  :global(.status-icon.completed) { color: #34d399; }
  :global(.status-icon.doing) { color: #fbbf24; }
  :global(.status-icon.initiated) { color: var(--text-dim); }

  .stage-pill-badge { font-size: 9px; font-weight: 900; letter-spacing: 0.06em; padding: 2px 7px; border-radius: 99px; }
  .stage-pill-badge.completed { color: #a7f3d0; background: rgba(52, 211, 153, 0.2); border: 1px solid rgba(52, 211, 153, 0.4); }
  .stage-pill-badge.doing { color: #fde68a; background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.4); }
  .stage-pill-badge.initiated { color: var(--text-muted); background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); }

  .subtask-title-text { flex: 1; font-size: 15px; font-weight: 800; letter-spacing: 0.01em; color: var(--text-main); cursor: pointer; word-break: break-word; }

  /* Direct Inline Title Input (No separate wrapper box!) */
  .inline-row-input {
    flex: 1; background: rgba(6, 10, 18, 0.95); border: 1.5px solid rgba(139, 92, 246, 0.7);
    border-radius: 9999px; padding: 6px 16px; font-size: 13.5px; font-weight: 700;
    color: #ffffff; outline: none; box-shadow: 0 0 12px rgba(139, 92, 246, 0.35);
  }

  .subtask-actions { display: flex; align-items: center; gap: 6px; }
  .subtask-edit-btn, .subtask-order-btn, .subtask-delete-btn, .subtask-save-btn, .subtask-cancel-btn {
    width: 30px; height: 30px; border-radius: 50% !important; display: flex; align-items: center;
    justify-content: center; background: rgba(255, 255, 255, 0.05); border: 1.5px solid rgba(255, 255, 255, 0.12);
    color: var(--text-muted); cursor: pointer; transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
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
    background: rgba(139, 92, 246, 0.25); color: #c4b5fd; border-color: rgba(139, 92, 246, 0.65); transform: scale(1.1) translateY(-1px);
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.4);
  }
  .subtask-order-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .subtask-delete-btn:hover {
    background: rgba(239, 68, 68, 0.25); color: #f87171; border-color: rgba(239, 68, 68, 0.65); transform: scale(1.1);
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
  }

  /* Compact Meta Info Grid in Portion 1 */
  .meta-info-grid { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
  .meta-info-item { display: flex; flex-direction: column; gap: 3px; padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; }
  .meta-info-label { font-size: 10px; font-weight: 900; letter-spacing: 0.08em; color: var(--text-dim); }
  .meta-info-value { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 800; color: #c4b5fd; }

  /* Standardized Campaign Journey Timeline in Portion 3 */
  .timeline-scroll { display: flex; flex-direction: column; gap: 0; overflow-y: auto; flex: 1; padding: 4px 0 8px 0; }
  .journey-step { display: flex; align-items: flex-start; gap: 14px; position: relative; min-height: 82px; }
  .journey-step .journey-line { position: absolute; left: 6px; top: 20px; bottom: -18px; width: 2px; background: linear-gradient(180deg, rgba(139,92,246,0.4) 0%, rgba(99,102,241,0.15) 100%); z-index: 1; }
  .journey-node { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; z-index: 5; position: relative; border: 2px solid rgba(10, 15, 26, 0.98); }
  .journey-node.node-logged { background: #8b5cf6; box-shadow: 0 0 14px rgba(139,92,246,0.85); }
  .journey-node.node-modified { background: #38bdf8; box-shadow: 0 0 14px rgba(56,189,248,0.85); }
  .journey-node.node-current { background: #34d399; box-shadow: 0 0 14px rgba(52,211,153,0.85); }
  .journey-content { display: flex; flex-direction: column; gap: 4px; padding-bottom: 32px; flex: 1; }
  .journey-step.last .journey-content { padding-bottom: 0; }
  .journey-label { font-size: 10px; font-weight: 900; letter-spacing: 0.08em; word-spacing: 0.06em; color: var(--text-dim); }
  .journey-date { font-size: 13px; font-weight: 800; color: #c4b5fd; word-spacing: 0.05em; }
  .journey-date.modified { color: #60a5fa; }
  .journey-date.current { color: #34d399; }
  .journey-desc { font-size: 10.5px; font-weight: 600; color: var(--text-dim); line-height: 1.4; }

  /* Footer */
  .window-footer { display: flex; align-items: center; justify-content: space-between; padding: 18px 28px; background: rgba(6, 10, 18, 0.95); border-top: 1px solid rgba(255, 255, 255, 0.08); flex-shrink: 0; }
  .footer-btn { display: flex; align-items: center; gap: 8px; padding: 11px 22px; font-size: 12px; font-weight: 900; letter-spacing: 0.06em; border-radius: 12px; cursor: pointer; transition: all 0.15s ease; word-spacing: 0.04em; }
  .btn-secondary { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.12); color: #ffffff; }
  .btn-secondary:hover { background: rgba(255, 255, 255, 0.12); }
  .btn-deploy { background: linear-gradient(135deg, rgba(139, 92, 246, 0.5), rgba(99, 102, 241, 0.4)); border: 1px solid rgba(139, 92, 246, 0.7); color: #ffffff; box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
  .btn-deploy:hover { background: linear-gradient(135deg, rgba(139, 92, 246, 0.7), rgba(99, 102, 241, 0.6)); }

  /* DEPLOY MODAL OVERLAY (580px 2X LARGE DARK THEMED DIALOG) */
  .deploy-modal-overlay { position: fixed; top: 64px; left: 0; right: 0; bottom: 0; z-index: 50000; background: rgba(4, 7, 13, 0.92); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; }
  .deploy-modal-card { width: 580px; background: rgba(14, 20, 33, 0.98); border: 1.5px solid rgba(139, 92, 246, 0.55); border-radius: 24px; padding: 32px; display: flex; flex-direction: column; gap: 20px; box-shadow: 0 28px 72px rgba(0, 0, 0, 0.90), 0 0 40px rgba(139, 92, 246, 0.25); }
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
</style>
