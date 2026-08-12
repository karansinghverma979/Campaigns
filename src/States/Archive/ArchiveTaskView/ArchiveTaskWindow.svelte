<script>
  import { store } from '../../../lib/store.svelte.js';
  import { ChronosMath, getFormattedDate } from '../../../lib/ChronosMath.js';

  import { 
    FileText, CheckCircle2, XCircle, Clock, 
    CheckSquare, Square, Tag as TagIcon, X, 
    ListTodo, GitCommit, ShieldCheck, ShieldAlert,
    AlertCircle
  } from 'lucide-svelte';

  let { task = null, onClose = () => {} } = $props();

  // ── Reactive getters ──────────────────────────────────────
  let currentTask          = $derived(task || {});
  let taskPriority         = $derived(currentTask.priority || 'Medium');
  let taskPriorityLower    = $derived(taskPriority.toLowerCase() === 'critical' ? 'high' : taskPriority.toLowerCase());
  let taskTitle            = $derived(currentTask.title || '');
  let taskOriginDate       = $derived(currentTask.origin_date || '');
  let taskInitiatedDate    = $derived(currentTask.initiated_at || currentTask.origin_date || '');
  let taskDeadline         = $derived(currentTask.deadline || '');
  let taskEndedDate        = $derived(currentTask.ended_date || '');
  let taskEndNote          = $derived(currentTask.end_note || '');
  let taskStage            = $derived(currentTask.stage || 'Victory');
  let taskRescheduleCount  = $derived(currentTask.reschedule_count || 0);
  let taskReschedule1      = $derived(currentTask.reschedule_1 || null);
  let taskReschedule2      = $derived(currentTask.reschedule_2 || null);
  let taskTags             = $derived(currentTask.tags || []);
  let taskModificationDate = $derived(currentTask.modification_date || currentTask.ended_date || currentTask.origin_date || '');
  let taskDaysSpent = $derived(
    // Prefer stored DB value; fallback: initiated_at → ended_date, both dates inclusive
    currentTask.days_spent != null
      ? currentTask.days_spent
      : (currentTask.initiated_at && currentTask.ended_date
          ? ChronosMath.daysSpent(currentTask.initiated_at, currentTask.ended_date)
          : 1)
  );
  let wasBreachedBeforeArchive = $derived(taskRescheduleCount > 0 || !!taskReschedule1 || !!taskReschedule2);

  // ── Read-only Subtasks state ───────────────────────────────
  let subtasks        = $state([]);
  let completedCount  = $derived(subtasks.filter(s => s.status === 'Completed').length);
  let focusedSubtaskIndex = $state(-1);

  $effect(() => {
    if (currentTask && currentTask.id) loadSubtasks();
  });

  async function loadSubtasks() {
    if (!currentTask || !currentTask.id) return;
    try {
      const res = await window.electronAPI.getSubtasks(currentTask.id);
      if (res.success) subtasks = res.subtasks || [];
    } catch (e) {
      console.error('Error loading subtasks:', e);
    }
  }

  function openMarkdown() {
    if (currentTask && currentTask.id) store.openStrategiesFile(currentTask);
  }

  // ── Keyboard Navigation ────────────────────────────────────
  function handleKey(e) {
    const key = e.key.toLowerCase();
    const active = document.activeElement;
    const isInputFocused = active && (
      active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable
    );

    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (!isInputFocused) {
      // J / ArrowDown — next subtask
      if (key === 'j' || e.key === 'ArrowDown') {
        if (subtasks.length > 0) {
          e.preventDefault();
          focusedSubtaskIndex = focusedSubtaskIndex < 0
            ? 0
            : Math.min(focusedSubtaskIndex + 1, subtasks.length - 1);
        }
        return;
      }
      // K / ArrowUp — previous subtask
      if (key === 'k' || e.key === 'ArrowUp') {
        if (subtasks.length > 0) {
          e.preventDefault();
          focusedSubtaskIndex = focusedSubtaskIndex < 0
            ? subtasks.length - 1
            : Math.max(focusedSubtaskIndex - 1, 0);
        }
        return;
      }
      // M — open markdown
      if (key === 'm') { e.preventDefault(); openMarkdown(); return; }
      // W — close window
      if (key === 'w') { e.preventDefault(); onClose(); return; }
    }
  }
</script>

<svelte:window onkeydown={handleKey} />

<!-- Full Screen Modal Overlay (Strictly below 64px Top Navbar) -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-overlay" onclick={onClose}>
  <!-- 1240px × 740px 3-COLUMN ARCHIVE WINDOW -->
  <div class="modal-window-expanded" onclick={(e) => e.stopPropagation()}>

    <!-- Window Header -->
    <div class="window-header {taskStage.toLowerCase()}">
      <div class="header-title-wrap">
        <span class="priority-dot {taskPriorityLower}"></span>
        {#if taskStage === 'Victory'}
          <ShieldCheck size={18} class="header-icon-victory" />
        {:else}
          <ShieldAlert size={18} class="header-icon-abort" />
        {/if}
        <span class="header-title-text {taskStage.toLowerCase()}">
          ARCHIVED CAMPAIGN MANIFEST — {taskStage.toUpperCase()}
        </span>
      </div>
      <button type="button" class="btn-close-window" onclick={onClose} aria-label="Close window">
        <X size={18} strokeWidth={2.5} />
      </button>
    </div>

    <!-- Window Body: 3 DISTINCT PORTIONS -->
    <div class="window-body-grid">

      <!-- PORTION 1: LEFT — Campaign Metadata + End Note Callout -->
      <div class="portion-column portion-left">
        <div class="column-header">
          <FileText size={15} class="col-icon" />
          <span class="col-title">HISTORICAL CAMPAIGN DATA</span>
        </div>

        <h2 class="task-title-large">{taskTitle}</h2>

        <!-- Stage + Priority badges -->
        <div class="meta-row">
          <span class="stage-badge {taskStage.toLowerCase()}">
            {#if taskStage === 'Victory'}
              <CheckCircle2 size={12} /> VICTORY
            {:else}
              <XCircle size={12} /> ABORTED
            {/if}
          </span>
          <span class="badge-tactical badge-{taskPriorityLower}">
            {taskPriority === 'Critical' ? 'HIGH' : taskPriority.toUpperCase()} PRIORITY
          </span>
        </div>

        <!-- Tags -->
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

        <!-- Meta Info Grid -->
        <div class="meta-info-grid">
          <div class="meta-info-item">
            <span class="meta-info-label">DAYS SPENT IN FIELD</span>
            <span class="meta-info-value days"><Clock size={12} /> {taskDaysSpent || 1} DAYS</span>
          </div>
          {#if taskRescheduleCount > 0}
            <div class="meta-info-item">
              <span class="meta-info-label">RESCHEDULE PERMITS USED</span>
              <span class="meta-info-value permit">{taskRescheduleCount}/2 PERMITS USED</span>
            </div>
          {/if}
          {#if wasBreachedBeforeArchive}
            <div class="meta-info-item">
              <span class="meta-info-label">ORIGINATING THEATER</span>
              <span class="meta-info-value breach-badge"><AlertCircle size={12} /> BREACH EXTRACTED</span>
            </div>
          {/if}
        </div>

        <!-- END NOTE CALLOUT (Prominently in Portion 1) -->
        {#if taskEndNote}
          <div class="end-note-box {taskStage.toLowerCase()}">
            <span class="end-note-title">
              {#if taskStage === 'Victory'}
                <CheckCircle2 size={12} /> VICTORY END NOTE
              {:else}
                <XCircle size={12} /> ABORT END NOTE
              {/if}
            </span>
            <p class="end-note-body">"{taskEndNote}"</p>
          </div>
        {/if}
      </div>

      <!-- PORTION 2: MIDDLE — Read-Only Subtasks -->
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

        <!-- Subtasks Read-Only List -->
        <div class="subtasks-scroll-container">
          {#if subtasks.length === 0}
            <div class="empty-subtasks">
              <span>No subtasks logged for this campaign.</span>
            </div>
          {:else}
            {#each subtasks as subtask, idx (subtask.id)}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="subtask-item-card {subtask.status ? subtask.status.toLowerCase() : 'initiated'}"
                class:subtask-nav-focused={idx === focusedSubtaskIndex}
                onclick={() => store.showToast('ARCHIVE STATE: Historical campaign log is read-only. Subtasks cannot be modified.', 'warning')}
              >
                <!-- Status Badge: icon + pill on same axis -->
                <div class="subtask-stage-badge-readonly">
                  {#if subtask.status === 'Completed'}
                    <CheckSquare size={16} class="status-icon completed" />
                    <span class="stage-pill-badge completed">DONE</span>
                  {:else if subtask.status === 'Doing'}
                    <Clock size={16} class="status-icon doing" />
                    <span class="stage-pill-badge doing">DOING</span>
                  {:else}
                    <Square size={16} class="status-icon initiated" />
                    <span class="stage-pill-badge initiated">INIT</span>
                  {/if}
                </div>

                <!-- Title -->
                <span class="subtask-title-text">{subtask.title}</span>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <!-- PORTION 3: RIGHT — Campaign Journey Timeline -->
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
          {#if taskInitiatedDate && taskInitiatedDate !== taskOriginDate}
            <div class="journey-step">
              <div class="journey-node node-initiated"></div>
              <div class="journey-line"></div>
              <div class="journey-content">
                <span class="journey-label">EXECUTION INITIATED</span>
                <span class="journey-date initiated">{taskInitiatedDate}</span>
                <span class="journey-desc">Deployed to Execution Theater</span>
              </div>
            </div>
          {/if}

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

          <!-- Node 5: Target Deadline -->
          {#if taskDeadline}
            <div class="journey-step">
              <div class="journey-node node-deadline"></div>
              <div class="journey-line"></div>
              <div class="journey-content">
                <span class="journey-label">TARGET DEADLINE</span>
                <span class="journey-date deadline">{taskDeadline}</span>
                <span class="journey-desc">Campaign Final Target Date</span>
              </div>
            </div>
          {/if}

          <!-- Node 6: Mission Outcome -->
          <div class="journey-step last">
            <div class="journey-node {taskStage === 'Victory' ? 'node-victory' : 'node-aborted'}"></div>
            <div class="journey-content">
              <span class="journey-label">MISSION {taskStage.toUpperCase()}</span>
              <span class="journey-date {taskStage === 'Victory' ? 'victory' : 'aborted'}">{taskEndedDate || '—'}</span>
              <span class="journey-desc">Campaign Archived & Closed</span>
            </div>
          </div>

        </div>
      </div>

    </div>

    <!-- WINDOW FOOTER -->
    <div class="window-footer">
      <button type="button" class="btn-tactical btn-close-footer" onclick={onClose}>
        <X size={14} /> CLOSE MANIFEST
      </button>
      <button type="button" class="btn-tactical btn-markdown" onclick={openMarkdown}>
        <FileText size={14} /> STRATEGIES (.MD)
      </button>
    </div>

  </div>
</div>

<style>
  /* ── OVERLAY STRICTLY BELOW 64px NAVBAR ── */
  .modal-overlay {
    position: fixed; top: 64px; bottom: 0; left: 0; right: 0;
    z-index: 8000;
    background: rgba(4, 7, 14, 0.84);
    backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
    display: flex; align-items: center; justify-content: center; padding: 24px;
    animation: fadeIn 0.18s ease-out;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  /* ── 1240px × 740px 3-COLUMN WINDOW ── */
  .modal-window-expanded {
    width: 1240px; height: 740px; max-width: 95vw; max-height: calc(100vh - 80px);
    background: rgba(10, 15, 26, 0.98);
    border: 1px solid rgba(139, 92, 246, 0.35); border-radius: 24px;
    box-shadow: 0 28px 72px rgba(0,0,0,0.95), 0 0 40px rgba(139,92,246,0.20);
    display: flex; flex-direction: column; overflow: hidden;
    animation: windowScale 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes windowScale {
    from { opacity: 0; transform: scale(0.96) translateY(12px); }
    to   { opacity: 1; transform: scale(1)    translateY(0); }
  }

  /* ── HEADER ── */
  .window-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 30px;
    background: rgba(139, 92, 246, 0.08);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08); flex-shrink: 0;
  }
  .window-header.victory { background: rgba(52, 211, 153, 0.08); border-color: rgba(52,211,153,0.20); }
  .window-header.aborted { background: rgba(239, 68,  68,  0.08); border-color: rgba(239,68,68,0.20); }
  .header-title-wrap { display: flex; align-items: center; gap: 12px; }
  .priority-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .priority-dot.high   { background: #ef4444; box-shadow: 0 0 10px rgba(239,68,68,0.6); }
  .priority-dot.medium { background: #f59e0b; box-shadow: 0 0 10px rgba(245,158,11,0.6); }
  .priority-dot.low    { background: #3b82f6; box-shadow: 0 0 10px rgba(59,130,246,0.6); }
  :global(.header-icon-victory) { color: #34d399; }
  :global(.header-icon-abort)   { color: #f87171; }
  .header-title-text { font-size: 13px; font-weight: 900; letter-spacing: 0.12em; color: #ddd6fe; }
  .header-title-text.victory { color: #a7f3d0; }
  .header-title-text.aborted { color: #fca5a5; }
  .btn-close-window {
    width: 34px; height: 34px; border-radius: 50%;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.10);
    color: var(--text-muted); display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s ease;
  }
  .btn-close-window:hover { background: rgba(239,68,68,0.22); color: #f87171; border-color: rgba(239,68,68,0.40); }

  /* ── 3-COLUMN BODY GRID ── */
  .window-body-grid {
    flex: 1; display: grid; grid-template-columns: 310px 1fr 255px;
    gap: 0; padding: 0; min-height: 0; overflow: hidden;
  }
  .portion-column { display: flex; flex-direction: column; gap: 14px; min-height: 0; }

  .portion-left {
    padding: 20px 22px; border-right: 1px solid rgba(255,255,255,0.07);
    overflow-y: auto; gap: 12px;
  }
  .portion-left::-webkit-scrollbar { width: 4px; }
  .portion-left::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.35); border-radius: 99px; }

  .portion-middle { padding: 20px 18px; overflow: hidden; }
  .portion-right  { padding: 20px 22px; border-left: 1px solid rgba(255,255,255,0.07); overflow-y: auto; }
  .portion-right::-webkit-scrollbar { width: 4px; }
  .portion-right::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.35); border-radius: 99px; }

  /* ── COLUMN HEADER ── */
  .column-header {
    display: flex; align-items: center; gap: 8px;
    padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0;
  }
  .subtasks-header { justify-content: space-between; }
  .header-left-title { display: flex; align-items: center; gap: 8px; }
  :global(.col-icon) { color: #c4b5fd; }
  .col-title { font-size: 11px; font-weight: 900; letter-spacing: 0.10em; color: var(--text-muted); }

  /* ── PORTION 1 CONTENT ── */
  .task-title-large {
    font-size: 20px; font-weight: 900; color: #f3e8ff; line-height: 1.35;
    letter-spacing: 0.02em; word-break: break-word; margin: 0;
  }
  .meta-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 2px; }

  .stage-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 99px; font-size: 10.5px; font-weight: 900;
  }
  .stage-badge.victory { color: #34d399; background: rgba(52,211,153,0.15); border: 1px solid rgba(52,211,153,0.35); }
  .stage-badge.aborted { color: #f87171; background: rgba(239,68,68,0.15);  border: 1px solid rgba(239,68,68,0.35); }

  .badge-tactical {
    display: inline-flex; align-items: center; padding: 4px 10px;
    border-radius: 99px; font-size: 10px; font-weight: 900; letter-spacing: 0.06em;
  }
  .badge-high     { color: #fca5a5; background: rgba(239,68,68,0.15);  border: 1px solid rgba(239,68,68,0.30); }
  .badge-medium   { color: #fde68a; background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.30); }
  .badge-low      { color: #93c5fd; background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.30); }

  /* Tags */
  .tags-section { display: flex; flex-direction: column; gap: 8px; }
  .section-label { font-size: 10px; font-weight: 900; letter-spacing: 0.08em; color: var(--text-dim); }
  .tags-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .tag-pill-item {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 10.5px; font-weight: 800; letter-spacing: 0.03em;
    color: #ddd6fe; background: rgba(139,92,246,0.12); border: 1px solid rgba(139,92,246,0.25);
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

  /* Meta Info Grid */
  .meta-info-grid { display: flex; flex-direction: column; gap: 7px; }
  .meta-info-item {
    display: flex; flex-direction: column; gap: 3px; padding: 9px 13px;
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px;
  }
  .meta-info-label { font-size: 10px; font-weight: 900; letter-spacing: 0.08em; color: var(--text-dim); }
  .meta-info-value { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 800; color: #c4b5fd; }
  .meta-info-value.days     { color: #a7f3d0; }
  .meta-info-value.deadline { color: #fca5a5; }
  .meta-info-value.ended    { color: #ddd6fe; }
  .meta-info-value.permit   { color: #fde68a; }
  .meta-info-value.breach-badge { color: #fca5a5; }

  /* End Note Callout Box */
  .end-note-box {
    background: rgba(139, 92, 246, 0.08); border: 1px solid rgba(139,92,246,0.25);
    border-radius: 14px; padding: 14px 16px;
    display: flex; flex-direction: column; gap: 8px; flex-shrink: 0;
  }
  .end-note-box.victory { background: rgba(52,211,153,0.08); border-color: rgba(52,211,153,0.25); }
  .end-note-box.aborted { background: rgba(239,68,68,0.08);  border-color: rgba(239,68,68,0.25); }
  .end-note-title {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 10px; font-weight: 900; letter-spacing: 0.08em; color: #ddd6fe;
  }
  .end-note-box.victory .end-note-title { color: #a7f3d0; }
  .end-note-box.aborted .end-note-title { color: #fca5a5; }
  .end-note-body { font-size: 12.5px; font-weight: 600; color: #f3e8ff; line-height: 1.45; margin: 0; word-break: break-word; font-style: italic; }

  /* ── PORTION 2: SUBTASKS ── */
  .header-progress-group { display: flex; align-items: center; gap: 10px; }
  .header-progress-bar-track { width: 72px; height: 6px; background: rgba(255,255,255,0.10); border-radius: 99px; overflow: hidden; }
  .header-progress-bar-fill { height: 100%; background: linear-gradient(90deg, #8b5cf6 0%, #ec4899 50%, #06b6d4 100%); border-radius: 99px; transition: width 0.3s ease; }
  .header-progress-label { font-size: 11px; font-weight: 900; color: #a7f3d0; letter-spacing: 0.04em; }
  .subtasks-counter { margin-left: auto; font-size: 11px; font-weight: 900; color: var(--text-dim); }

  .subtasks-scroll-container {
    flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 2px 2px;
  }
  .subtasks-scroll-container::-webkit-scrollbar { width: 5px; }
  .subtasks-scroll-container::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.35); border-radius: 99px; }

  .empty-subtasks { font-size: 12.5px; font-weight: 600; color: var(--text-dim); padding: 16px 0; }

  /* Subtask cards — read-only */
  .subtask-item-card {
    display: flex; align-items: center; gap: 10px; padding: 10px 14px;
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px; transition: all 0.15s ease; flex-shrink: 0;
  }
  .subtask-item-card.completed { opacity: 0.6; background: rgba(0,0,0,0.25); }
  .subtask-item-card.completed .subtask-title-text { text-decoration: line-through; color: var(--text-dim); }
  .subtask-item-card.doing { background: rgba(245,158,11,0.06); border-color: rgba(245,158,11,0.25); }
  .subtask-item-card.subtask-nav-focused {
    border-color: rgba(139,92,246,0.85) !important;
    background: rgba(139,92,246,0.12) !important;
    box-shadow: 0 0 14px rgba(139,92,246,0.35) !important;
  }

  /* Status badge (icon + pill perfectly centered) */
  .subtask-stage-badge-readonly {
    display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0;
  }
  :global(.status-icon.completed) { color: #34d399; }
  :global(.status-icon.doing)     { color: #fbbf24; }
  :global(.status-icon.initiated) { color: var(--text-dim); }

  .stage-pill-badge {
    font-size: 9px; font-weight: 900; letter-spacing: 0.06em; padding: 2px 7px; border-radius: 99px;
    flex-shrink: 0;
  }
  .stage-pill-badge.completed { color: #a7f3d0; background: rgba(52,211,153,0.2); border: 1px solid rgba(52,211,153,0.4); }
  .stage-pill-badge.doing     { color: #fde68a; background: rgba(245,158,11,0.2); border: 1px solid rgba(245,158,11,0.4); }
  .stage-pill-badge.initiated { color: var(--text-muted); background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); }

  .subtask-title-text {
    flex: 1; font-size: 14px; font-weight: 800; letter-spacing: 0.01em;
    color: var(--text-main); word-break: break-word;
  }

  /* ── PORTION 3: CAMPAIGN JOURNEY TIMELINE ── */
  .timeline-scroll { display: flex; flex-direction: column; overflow-y: auto; flex: 1; padding: 2px 0 8px 0; }
  .timeline-scroll::-webkit-scrollbar { width: 4px; }
  .timeline-scroll::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.35); border-radius: 99px; }

  .journey-step { display: flex; align-items: flex-start; gap: 14px; position: relative; min-height: 82px; }
  .journey-step .journey-line {
    position: absolute; left: 6px; top: 20px; bottom: -18px;
    width: 2px; background: linear-gradient(180deg, rgba(139,92,246,0.5) 0%, rgba(139,92,246,0.08) 100%); z-index: 1;
  }
  .journey-step.last .journey-line { display: none; }
  .journey-node { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; z-index: 5; position: relative; border: 2px solid rgba(10, 15, 26, 0.98); }
  .node-logged    { background: #8b5cf6; box-shadow: 0 0 14px rgba(139,92,246,0.85); }
  .node-initiated { background: #60a5fa; box-shadow: 0 0 14px rgba(96,165,250,0.85); }
  .node-modified  { background: #38bdf8; box-shadow: 0 0 14px rgba(56,189,248,0.85); }
  .node-reschedule{ background: #f59e0b; box-shadow: 0 0 14px rgba(245,158,11,0.85); }
  .node-deadline  { background: #c4b5fd; box-shadow: 0 0 14px rgba(196,181,253,0.85); }
  .node-victory   { background: #10b981; box-shadow: 0 0 14px rgba(16,185,129,0.85); }
  .node-aborted   { background: #ef4444; box-shadow: 0 0 14px rgba(239,68,68,0.85); }
  .journey-content { display: flex; flex-direction: column; gap: 4px; padding-bottom: 32px; flex: 1; }
  .journey-step.last .journey-content { padding-bottom: 0; }
  .journey-label { font-size: 10px; font-weight: 900; letter-spacing: 0.08em; word-spacing: 0.06em; color: var(--text-dim); }
  .journey-date  { font-size: 13px; font-weight: 800; color: #c4b5fd; word-spacing: 0.05em; }
  .journey-date.initiated { color: #60a5fa; }
  .journey-date.modified  { color: #38bdf8; }
  .journey-date.reschedule{ color: #fbbf24; }
  .journey-date.deadline  { color: #fca5a5; }
  .journey-date.victory   { color: #34d399; }
  .journey-date.aborted   { color: #f87171; }
  .journey-desc { font-size: 10.5px; font-weight: 600; color: var(--text-dim); line-height: 1.4; }

  /* ── FOOTER ── */
  .window-footer {
    padding: 16px 30px; border-top: 1px solid rgba(255,255,255,0.08);
    display: flex; gap: 12px; background: rgba(0,0,0,0.3); flex-shrink: 0;
  }
  .btn-tactical {
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    padding: 11px 22px; font-size: 12px; font-weight: 900; letter-spacing: 0.06em;
    color: var(--text-muted); background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12);
    border-radius: 9999px; cursor: pointer; transition: all 0.15s ease;
  }
  .btn-tactical:hover { background: rgba(255,255,255,0.09); color: var(--text-main); border-color: rgba(255,255,255,0.22); }
  .btn-close-footer { color: var(--text-muted); }
  .btn-markdown     { color: #c4b5fd; border-color: rgba(139,92,246,0.35); background: rgba(139,92,246,0.08); }
  .btn-markdown:hover { background: rgba(139,92,246,0.22); border-color: rgba(139,92,246,0.6); box-shadow: 0 0 14px rgba(139,92,246,0.3); }
</style>
