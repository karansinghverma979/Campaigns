<script>
  import { store } from '../../lib/store.svelte.js';
  import { ChronosMath } from '../../lib/ChronosMath.js';
  import { 
    Archive, FileText, CheckCircle2, XCircle, 
    Tag as TagIcon, X, Calendar, ListTodo, GitCommit,
    CheckSquare, Square, Clock, MessageSquare
  } from 'lucide-svelte';

  let { task = null, onClose = () => {} } = $props();

  // Safe reactive getters from task prop
  let currentTask = $derived(task || {});
  let taskPriority = $derived(currentTask.priority || 'Medium');
  let taskPriorityLower = $derived(taskPriority.toLowerCase() === 'critical' ? 'high' : taskPriority.toLowerCase());
  let taskTitle = $derived(currentTask.title || '');
  let taskOriginDate = $derived(currentTask.origin_date || '');
  let taskInitiatedDate = $derived(currentTask.initiated_at || currentTask.origin_date || '');
  let taskModificationDate = $derived(currentTask.modification_date || currentTask.origin_date || '');
  let taskDeadline = $derived(currentTask.deadline || null);
  let taskRescheduleCount = $derived(currentTask.reschedule_count || 0);
  let taskReschedule1 = $derived(currentTask.reschedule_1 || null);
  let taskReschedule2 = $derived(currentTask.reschedule_2 || null);
  let taskEndedDate = $derived(currentTask.ended_date || currentTask.deadline || '');
  let taskEndNote = $derived(currentTask.end_note || null);
  let taskStage = $derived(currentTask.stage || 'Victory');
  let taskTags = $derived(currentTask.tags || []);
  let daysSpent = $derived(currentTask.days_spent || ChronosMath.daysSpent(taskInitiatedDate, taskEndedDate));

  // Subtasks state & highlight
  let subtasks = $state([]);
  let highlightedSubtaskId = $state(null);

  // Subtask stage counters
  let completedCount = $derived(subtasks.filter(s => s.status === 'Completed').length);
  let doingCount = $derived(subtasks.filter(s => s.status === 'Doing').length);
  let subtaskPct = $derived(subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0);

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

  function openMarkdown() { 
    if (currentTask && currentTask.id) store.openStrategiesFile(currentTask); 
  }

  function handleKey(e) { 
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKey} />

<!-- Full Screen Modal Overlay (Strictly below 64px Top Navbar) -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-overlay" onclick={onClose}>
  <!-- EXPANDED 1240px × 740px 3-COLUMN WINDOW CANVAS -->
  <div class="modal-window-expanded" onclick={(e) => e.stopPropagation()}>
    
    <!-- Window Header -->
    <div class="window-header">
      <div class="header-title-wrap">
        <span class="priority-dot {taskPriorityLower}"></span>
        <Archive size={18} class="header-icon-archive" />
        <span class="header-title-text">ARCHIVED HISTORICAL MANIFEST</span>
      </div>
      <button type="button" class="btn-close-window" onclick={onClose} aria-label="Close window">
        <X size={18} strokeWidth={2.5} />
      </button>
    </div>

    <!-- Window Body: 3 DISTINCT PORTIONS -->
    <div class="window-body-grid">
      
      <!-- PORTION 1: LEFT SIDE TASK INFORMATION (Minimalist & Non-repeating) -->
      <div class="portion-column portion-left">
        <div class="column-header">
          <FileText size={15} class="col-icon" />
          <span class="col-title">CAMPAIGN METADATA</span>
        </div>

        <h2 class="task-title-large">{taskTitle}</h2>

        <div class="meta-row">
          <span class="badge-tactical badge-{taskPriorityLower}">{taskPriority === 'Critical' ? 'High' : taskPriority} PRIORITY</span>
          <span class="stage-badge {taskStage.toLowerCase()}">
            {#if taskStage === 'Victory'}
              <CheckCircle2 size={13} /> VICTORY
            {:else}
              <XCircle size={13} /> ABORTED
            {/if}
          </span>
          <span class="days-spent-badge">
            <Clock size={12} /> {daysSpent} DAYS SPENT
          </span>
        </div>

        <!-- End Note Block -->
        {#if taskEndNote}
          <div class="end-note-card">
            <div class="note-card-header">
              <MessageSquare size={13} class="note-icon" />
              <span>TACTICAL END NOTE</span>
            </div>
            <p class="note-body-text">"{taskEndNote}"</p>
          </div>
        {/if}

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

        <!-- Subtasks Scrollable List (Read-Only Mode) -->
        <div class="subtasks-scroll-container">
          {#if subtasks.length === 0}
            <div class="empty-subtasks">
              <span>No tactical subtasks logged for this campaign.</span>
            </div>
          {:else}
            {#each subtasks as subtask (subtask.id)}
              <div class="subtask-item-card {subtask.status ? subtask.status.toLowerCase() : 'initiated'}">
                <div class="subtask-stage-toggle">
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

                <span class="subtask-title-text">{subtask.title}</span>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <!-- PORTION 3: RIGHT SIDE TASK JOURNEY & CHRONOLOGY -->
      <div class="portion-column portion-right">
        <div class="column-header">
          <GitCommit size={15} class="col-icon" />
          <span class="col-title">CAMPAIGN JOURNEY</span>
        </div>

        <div class="timeline-container">
          <!-- Creation Date Node -->
          <div class="timeline-node active">
            <span class="node-dot"></span>
            <div class="node-content">
              <span class="node-title">LOGGED DATE</span>
              <span class="node-date"><Calendar size={12} /> {taskOriginDate}</span>
            </div>
          </div>

          <!-- Vertical Connector Line -->
          <div class="timeline-connector"></div>

          <!-- Initiated Date Node -->
          {#if taskInitiatedDate}
            <div class="timeline-node active">
              <span class="node-dot init"></span>
              <div class="node-content">
                <span class="node-title">INITIATED DATE</span>
                <span class="node-date"><Calendar size={12} /> {taskInitiatedDate}</span>
              </div>
            </div>
            <div class="timeline-connector"></div>
          {/if}

          <!-- Modification Date Node -->
          <div class="timeline-node active">
            <span class="node-dot mod"></span>
            <div class="node-content">
              <span class="node-title">LAST MODIFICATION</span>
              <span class="node-date"><Calendar size={12} /> {taskModificationDate}</span>
            </div>
          </div>

          <!-- Reschedule Nodes if any -->
          {#if taskReschedule1}
            <div class="timeline-connector"></div>
            <div class="timeline-node active">
              <span class="node-dot resch"></span>
              <div class="node-content">
                <span class="node-title">RESCHEDULE PERMIT #1</span>
                <span class="node-date"><Calendar size={12} /> {taskReschedule1}</span>
              </div>
            </div>
          {/if}
          {#if taskReschedule2}
            <div class="timeline-connector"></div>
            <div class="timeline-node active">
              <span class="node-dot resch"></span>
              <div class="node-content">
                <span class="node-title">RESCHEDULE PERMIT #2</span>
                <span class="node-date"><Calendar size={12} /> {taskReschedule2}</span>
              </div>
            </div>
          {/if}

          <div class="timeline-connector"></div>

          <!-- Concluded Node -->
          <div class="timeline-node active outcome {taskStage.toLowerCase()}">
            <span class="node-dot outcome {taskStage.toLowerCase()}"></span>
            <div class="node-content">
              <span class="node-title">{taskStage.toUpperCase()} DATE</span>
              <span class="node-date"><Calendar size={12} /> {taskEndedDate}</span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Window Footer -->
    <div class="window-footer">
      <button type="button" class="footer-btn btn-secondary" onclick={openMarkdown}>
        <FileText size={15} />
        <span>STRATEGIES (.MD)</span>
      </button>

      <button type="button" class="footer-btn btn-secondary" onclick={onClose}>
        <X size={15} />
        <span>CLOSE</span>
      </button>
    </div>

  </div>
</div>

<style>
  /* Strict Navbar Spacing & Centered 1240px × 740px Overlay Canvas */
  .modal-overlay {
    position: fixed;
    top: 64px; left: 0; right: 0; bottom: 0;
    z-index: 1000;
    background: rgba(4, 7, 13, 0.88);
    backdrop-filter: blur(16px);
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

  :global(.header-icon-archive) { color: #a7f3d0; }
  .header-title-text { font-size: 13px; font-weight: 900; letter-spacing: 0.10em; color: #f3e8ff; word-spacing: 0.04em; }

  .btn-close-window {
    background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.10);
    color: var(--text-muted); border-radius: 50%; width: 34px; height: 34px;
    display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s ease;
  }
  .btn-close-window:hover { background: rgba(239, 68, 68, 0.2); color: #f87171; border-color: rgba(239, 68, 68, 0.4); }

  /* 3-Column Body Grid */
  .window-body-grid { flex: 1; display: grid; grid-template-columns: 310px 1fr 280px; min-height: 0; }

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
  .stage-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 900; letter-spacing: 0.06em; padding: 4px 10px; border-radius: 99px; }
  .stage-badge.victory { color: #a7f3d0; background: rgba(16, 185, 129, 0.18); border: 1px solid rgba(16, 185, 129, 0.35); }
  .stage-badge.aborted { color: #fca5a5; background: rgba(239, 68, 68, 0.18); border: 1px solid rgba(239, 68, 68, 0.35); }

  .days-spent-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 900; color: #93c5fd; background: rgba(59, 130, 246, 0.15); padding: 4px 10px; border-radius: 99px; border: 1px solid rgba(59, 130, 246, 0.3); }

  .end-note-card { background: rgba(6, 10, 18, 0.85); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 6px; }
  .note-card-header { display: flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 900; color: #f59e0b; letter-spacing: 0.06em; }
  .note-body-text { font-size: 12.5px; font-weight: 700; color: #ffffff; font-style: italic; line-height: 1.45; }

  .tags-section { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
  .section-label { font-size: 10.5px; font-weight: 900; letter-spacing: 0.08em; color: var(--text-dim); word-spacing: 0.04em; }
  .tags-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .tag { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 800; color: #ddd6fe; background: rgba(139, 92, 246, 0.14); padding: 4px 10px; border-radius: 99px; border: 1px solid rgba(139, 92, 246, 0.28); }

  /* Subtasks Column Header Progress Track & Counter */
  .header-progress-group { display: flex; align-items: center; gap: 10px; }
  .header-progress-bar-track { width: 80px; height: 6px; background: rgba(255, 255, 255, 0.1); border-radius: 99px; overflow: hidden; }
  .header-progress-bar-fill { height: 100%; background: linear-gradient(90deg, #8b5cf6, #10b981); border-radius: 99px; transition: width 0.3s ease; }
  .header-progress-label { font-size: 11px; font-weight: 900; color: #a7f3d0; letter-spacing: 0.04em; }
  .subtasks-counter { font-size: 11px; font-weight: 900; color: #c4b5fd; letter-spacing: 0.06em; }

  /* Subtasks Scrollable Container */
  .subtasks-scroll-container { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 6px 8px; }
  .empty-subtasks { font-size: 12.5px; font-weight: 600; color: var(--text-dim); padding: 18px 0; }

  .subtask-item-card {
    display: flex; align-items: center; gap: 10px; padding: 11px 14px;
    background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px; box-sizing: border-box;
  }
  .subtask-item-card.completed { opacity: 0.65; background: rgba(0, 0, 0, 0.25); }
  .subtask-item-card.completed .subtask-title-text { text-decoration: line-through; color: var(--text-dim); }
  .subtask-item-card.doing { background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.35); }

  .subtask-stage-toggle { display: inline-flex; align-items: center; gap: 6px; user-select: none; }
  :global(.status-icon.completed) { color: #34d399; }
  :global(.status-icon.doing) { color: #fbbf24; }
  :global(.status-icon.initiated) { color: var(--text-dim); }

  .stage-pill-badge { font-size: 9px; font-weight: 900; letter-spacing: 0.06em; padding: 2px 7px; border-radius: 99px; }
  .stage-pill-badge.completed { color: #a7f3d0; background: rgba(52, 211, 153, 0.2); border: 1px solid rgba(52, 211, 153, 0.4); }
  .stage-pill-badge.doing { color: #fde68a; background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.4); }
  .stage-pill-badge.initiated { color: var(--text-muted); background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); }

  .subtask-title-text { flex: 1; font-size: 15px; font-weight: 800; letter-spacing: 0.01em; color: var(--text-main); word-break: break-word; }

  /* Timeline Right Column */
  .timeline-container { display: flex; flex-direction: column; gap: 6px; padding: 10px 0; }
  .timeline-node { display: flex; align-items: flex-start; gap: 12px; }
  .node-dot { width: 10px; height: 10px; border-radius: 50%; background: #8b5cf6; margin-top: 4px; box-shadow: 0 0 10px rgba(139, 92, 246, 0.6); }
  .node-dot.init { background: #34d399; box-shadow: 0 0 10px rgba(52, 211, 153, 0.6); }
  .node-dot.mod { background: #60a5fa; box-shadow: 0 0 10px rgba(96, 165, 250, 0.6); }
  .node-dot.resch { background: #fbbf24; box-shadow: 0 0 10px rgba(251, 191, 36, 0.6); }
  .node-dot.outcome.victory { background: #10b981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.8); }
  .node-dot.outcome.aborted { background: #ef4444; box-shadow: 0 0 10px rgba(239, 68, 68, 0.8); }

  .node-content { display: flex; flex-direction: column; gap: 2px; }
  .node-title { font-size: 10px; font-weight: 900; letter-spacing: 0.08em; color: var(--text-dim); word-spacing: 0.04em; }
  .node-date { font-size: 12.5px; font-weight: 800; color: #ffffff; display: flex; align-items: center; gap: 5px; }
  .timeline-connector { width: 2px; height: 24px; background: rgba(139, 92, 246, 0.3); margin-left: 4px; }

  /* Footer */
  .window-footer { display: flex; align-items: center; justify-content: space-between; padding: 18px 28px; background: rgba(6, 10, 18, 0.95); border-top: 1px solid rgba(255, 255, 255, 0.08); flex-shrink: 0; }
  .footer-btn { display: flex; align-items: center; gap: 8px; padding: 11px 22px; font-size: 12px; font-weight: 900; letter-spacing: 0.06em; border-radius: 12px; cursor: pointer; transition: all 0.15s ease; word-spacing: 0.04em; }
  .btn-secondary { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.12); color: #ffffff; }
  .btn-secondary:hover { background: rgba(255, 255, 255, 0.12); }
</style>
