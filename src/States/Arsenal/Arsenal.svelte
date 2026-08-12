<script>
  import { store } from '../../lib/store.svelte.js';
  import { onDestroy } from 'svelte';
  import { Brain, Search, ChevronDown, ArrowUp, ArrowDown, Plus, Network, Tag as TagIcon, Calendar, CheckSquare, Square, X, Trash2, AlertTriangle, Copy } from 'lucide-svelte';
  import ArsenalTaskView from './ArsenalTaskView/ArsenalTaskView.svelte';
  import ArsenalTaskEdit from './ArsenalTaskEdit/ArsenalTaskEdit.svelte';

  // ── Filter & Sort state ──
  let filterPriority = $state('ALL'); // 'ALL' | 'High' | 'Medium' | 'Low'
  let searchQuery    = $state('');
  let _searchRaw     = $state('');
  let _searchTimer   = null;
  function handleSearchInput(v) {
    _searchRaw = v;
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => { searchQuery = v; }, 180);
  }
  let selectedTagNames = $state([]); // Array of selected tag names for multi-select
  let sortBy         = $state('date'); // 'date' | 'name'
  let sortDir        = $state('desc'); // 'asc' | 'desc'
  let tagDropdownOpen = $state(false);
  let sortDropdownOpen = $state(false);

  // ── Selected task for detail view & editing ──
  let selectedTask = $state(null);
  let selectedSide = $state('right'); // 'left' | 'right'
  let editingTask  = $state(null); // Task object being edited in modal window

  // ── 60-Second Purge Modal state (Raw Intel Cards Only) ──
  let isPurgeModalOpen = $state(false);
  let purgingTask = $state(null);
  let purgeTimerSeconds = $state(60);
  let purgeTimerInterval = null;

  onDestroy(() => {
    if (purgeTimerInterval) clearInterval(purgeTimerInterval);
    if (_searchTimer) clearTimeout(_searchTimer);
  });

  function openPurgeModal(task, event) {
    if (event) { event.stopPropagation(); }
    purgingTask = task;
    isPurgeModalOpen = true;
    purgeTimerSeconds = 60;
    if (purgeTimerInterval) clearInterval(purgeTimerInterval);
    purgeTimerInterval = setInterval(() => {
      if (purgeTimerSeconds > 0) {
        purgeTimerSeconds -= 1;
      } else {
        clearInterval(purgeTimerInterval);
      }
    }, 1000);
  }

  function closePurgeModal() {
    isPurgeModalOpen = false;
    purgingTask = null;
    if (purgeTimerInterval) clearInterval(purgeTimerInterval);
  }

  async function confirmPermanentPurge() {
    if (!purgingTask || !purgingTask.id) return;
    const idToPurge = purgingTask.id;
    try {
      const success = await store.deleteTask(idToPurge);
      closePurgeModal();
    } catch (err) {
      console.error('Purge error:', err);
      store.showToast('Purge failed: ' + err.message, 'danger');
    }
  }

  // ── Auto collapse dropdowns on click outside ──
  function handleWindowClick(e) {
    if (!tagDropdownOpen && !sortDropdownOpen) return; // Skip DOM scan when nothing is open
    const target = e.target;
    if (!target.closest('.dropdown-wrap')) {
      tagDropdownOpen = false;
      sortDropdownOpen = false;
    }
  }

  // Action to smoothly scroll highlighted element into view
  function scrollIfHighlighted(node, isHighlighted) {
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

  // ── Computed ──
  const priorityCounts = $derived({
    ALL:    store.arsenalTasks.length,
    High:   store.arsenalTasks.filter(t => t.priority === 'High' || t.priority === 'Critical').length,
    Medium: store.arsenalTasks.filter(t => t.priority === 'Medium').length,
    Low:    store.arsenalTasks.filter(t => t.priority === 'Low').length,
  });

  // Extract all distinct tag names across arsenal tasks
  const allTags = $derived.by(() => {
    const s = new Set();
    store.arsenalTasks.forEach(t => {
      if (t.tags) t.tags.forEach(tag => s.add(tag.tag_name.toUpperCase()));
    });
    return Array.from(s).sort();
  });

  // Filter tasks based on priority, search query, multi-select tags, and sort
  const filteredTasks = $derived.by(() => {
    let tasks = store.arsenalTasks;
    
    // Priority filter (treat Critical as High for backward compatibility)
    if (filterPriority !== 'ALL') {
      if (filterPriority === 'High') {
        tasks = tasks.filter(t => t.priority === 'High' || t.priority === 'Critical');
      } else {
        tasks = tasks.filter(t => t.priority === filterPriority);
      }
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tasks = tasks.filter(t => t.title.toLowerCase().includes(q));
    }

    // Multi-select tags filter
    if (selectedTagNames.length > 0) {
      tasks = tasks.filter(t => 
        t.tags && t.tags.some(tag => selectedTagNames.includes(tag.tag_name.toUpperCase()))
      );
    }

    // Sorting
    return [...tasks].sort((a, b) => {
      if (sortBy === 'name') {
        return sortDir === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
      }
      return sortDir === 'desc' ? Number(b.id) - Number(a.id) : Number(a.id) - Number(b.id);
    });
  });

  // Compile once per search query change, not per card render
  const _searchRegex = $derived(
    searchQuery.trim()
      ? new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')})`, 'gi')
      : null
  );

  const rawIntelTasks     = $derived(filteredTasks.filter(t => t.stage === 'RawIntel'));
  const strategizingTasks = $derived(filteredTasks.filter(t => t.stage === 'Strategizing'));

  function togglePriority(p) {
    filterPriority = p;
  }

  function toggleSortDir() {
    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  }

  // Tag checkbox multi-select handlers
  function toggleTagSelect(tagName) {
    const formatted = tagName.toUpperCase();
    if (selectedTagNames.includes(formatted)) {
      selectedTagNames = selectedTagNames.filter(t => t !== formatted);
    } else {
      selectedTagNames = [...selectedTagNames, formatted];
    }
  }

  function filterByTag(tagName, e) {
    if (e) e.stopPropagation();
    toggleTagSelect(tagName);
  }

  function toggleSelectAllTags() {
    selectedTagNames = [];
  }

  // Stage transition helpers
  async function moveToStrategizing(task, e) {
    e.stopPropagation();
    try {
      const res = await window.electronAPI.updateTask({
        id: task.id, title: task.title, priority: task.priority === 'Critical' ? 'High' : task.priority,
        stage: 'Strategizing', tags: task.tags ? task.tags.map(t => t.tag_name) : []
      });
      if (res.success) { 
        store.showToast('Moved to Strategizing.', 'info'); 
        store.setHighlightedTaskId(task.id);
        // Update task in-place — no full reload needed
        const idx = store.tasks.findIndex(t => t.id === task.id);
        if (idx !== -1) store.tasks[idx] = res.task;
      }
      else store.showToast('Failed: ' + res.error, 'danger');
    } catch(e) { store.logError(e.message, 'High'); }
  }

  async function moveToRawIntel(task, e) {
    e.stopPropagation();
    try {
      const res = await window.electronAPI.updateTask({
        id: task.id, title: task.title, priority: task.priority === 'Critical' ? 'High' : task.priority,
        stage: 'RawIntel', tags: task.tags ? task.tags.map(t => t.tag_name) : []
      });
      if (res.success) { 
        store.showToast('Moved back to Raw Intel.', 'info'); 
        store.setHighlightedTaskId(task.id);
        // Update task in-place — no full reload needed
        const idx = store.tasks.findIndex(t => t.id === task.id);
        if (idx !== -1) store.tasks[idx] = res.task;
      }
      else store.showToast('Failed: ' + res.error, 'danger');
    } catch(e) { store.logError(e.message, 'High'); }
  }

  async function handleDuplicateTask(task, e) {
    if (e) e.stopPropagation();
    try {
      await store.duplicateTask(task.id);
    } catch (err) {
      console.error('Duplicate error:', err);
    }
  }

  function openDetail(task, side) {
    selectedTask = task;
    selectedSide = side;
  }

  function closeDetail() {
    selectedTask = null;
    store.loadAllData();
  }

  function openTaskCreation() {
    store.isTaskModalOpen = true;
  }

  // Helper function for title search highlighting
  function getTitleParts(title, query) {
    if (!_searchRegex) return [{ text: title, highlight: false }];
    const regex = new RegExp(_searchRegex.source, _searchRegex.flags); // clone to reset lastIndex
    const parts = [];
    let lastIdx = 0;
    let match;
    while ((match = regex.exec(title)) !== null) {
      if (match.index > lastIdx) {
        parts.push({ text: title.substring(lastIdx, match.index), highlight: false });
      }
      parts.push({ text: match[0], highlight: true });
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < title.length) {
      parts.push({ text: title.substring(lastIdx), highlight: false });
    }
    return parts;
  }
</script>

<svelte:window onclick={handleWindowClick} />

<div class="arsenal-root">

  <!-- ── FILTER BAR ── -->
  <div class="filter-bar">
    <!-- Left Side: New Campaign Button -->
    <button class="new-campaign-btn" onclick={openTaskCreation} title="Log New Campaign (Ctrl+N)">
      <Plus size={16} strokeWidth={2.8} />
      <span>NEW CAMPAIGN</span>
    </button>

    <div class="filter-divider"></div>

    <!-- Priority pills (HIGH, MEDIUM, LOW) with Circular Badge Count -->
    <div class="priority-pills">
      {#each ['ALL', 'High', 'Medium', 'Low'] as p}
        <button
          class="pill {p.toLowerCase()}"
          class:active={filterPriority === p}
          onclick={() => togglePriority(p)}
        >
          <span>{p.toUpperCase()}</span>
          <span class="pill-count-badge">{priorityCounts[p]}</span>
        </button>
      {/each}
    </div>

    <div class="filter-divider"></div>

    <!-- Search input taking full remaining display width -->
    <div class="search-wrap">
      <Search size={14} class="search-icon" />
      <input
        class="search-input"
        type="text"
        placeholder="Search campaigns..."
        bind:value={_searchRaw}
        oninput={(e) => handleSearchInput(e.target.value)}
      />
    </div>

    <!-- Tags Multi-Select Checkbox Dropdown -->
    <div class="dropdown-wrap">
      <button 
        class="dropdown-btn" 
        onclick={(e) => { e.stopPropagation(); tagDropdownOpen = !tagDropdownOpen; sortDropdownOpen = false; }}
      >
        <TagIcon size={13} />
        <span>
          {#if selectedTagNames.length === 0}
            All Tags
          {:else if selectedTagNames.length === 1}
            Tag: {selectedTagNames[0]}
          {:else}
            Tags ({selectedTagNames.length})
          {/if}
        </span>
        <ChevronDown size={12} class="chevron {tagDropdownOpen ? 'open' : ''}" />
      </button>

      {#if tagDropdownOpen}
        <div class="dropdown-menu tags-menu">
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="dropdown-checkbox-item" onclick={toggleSelectAllTags}>
            {#if selectedTagNames.length === 0}
              <CheckSquare size={14} class="cb-icon active" />
            {:else}
              <Square size={14} class="cb-icon" />
            {/if}
            <span class="cb-label">All Tags</span>
          </div>
          <div class="menu-divider"></div>
          {#each allTags as tag}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="dropdown-checkbox-item" onclick={() => toggleTagSelect(tag)}>
              {#if selectedTagNames.includes(tag)}
                <CheckSquare size={14} class="cb-icon active" />
              {:else}
                <Square size={14} class="cb-icon" />
              {/if}
              <span class="cb-label">{tag}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Sort by dropdown -->
    <div class="dropdown-wrap">
      <button 
        class="dropdown-btn" 
        onclick={(e) => { e.stopPropagation(); sortDropdownOpen = !sortDropdownOpen; tagDropdownOpen = false; }}
      >
        <span>Sort: {sortBy === 'date' ? 'Creation Date' : 'Name'}</span>
        <ChevronDown size={12} class="chevron {sortDropdownOpen ? 'open' : ''}" />
      </button>

      {#if sortDropdownOpen}
        <div class="dropdown-menu">
          <button class="dropdown-item" class:active={sortBy === 'date'} onclick={() => { sortBy = 'date'; sortDropdownOpen = false; }}>Creation Date</button>
          <button class="dropdown-item" class:active={sortBy === 'name'} onclick={() => { sortBy = 'name'; sortDropdownOpen = false; }}>Name</button>
        </div>
      {/if}
    </div>

    <!-- Sort direction toggle -->
    <button class="sort-dir-btn" onclick={toggleSortDir} title={sortDir === 'asc' ? 'Ascending' : 'Descending'}>
      {#if sortDir === 'asc'}
        <ArrowUp size={15} strokeWidth={2.5} />
      {:else}
        <ArrowDown size={15} strokeWidth={2.5} />
      {/if}
    </button>
  </div>

  <!-- ── TWO PANELS ── -->
  <div class="panels">

    <!-- LEFT: RAW INTEL -->
    <div class="panel">
      <div class="panel-header raw-intel">
        <div class="panel-title">
          <Brain size={18} strokeWidth={2.2} />
          <span>RAW INTEL</span>
        </div>
        <span class="panel-count">{rawIntelTasks.length}</span>
      </div>

      <div class="panel-body">
        {#if rawIntelTasks.length === 0}
          <div class="empty-state">
            <Brain size={36} />
            <p>No raw intel campaigns found.</p>
          </div>
        {:else}
          {#each rawIntelTasks as task (task.id)}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div 
              class="task-card" 
              class:just-updated={store.highlightedTaskId === task.id}
              use:scrollIfHighlighted={store.highlightedTaskId === task.id}
              onclick={() => editingTask = task}
            >
              <span class="priority-bar {task.priority.toLowerCase() === 'critical' ? 'high' : task.priority.toLowerCase()}"></span>
              
              <div class="card-content">
                <!-- Creation Time ONLY ABOVE Title -->
                <div class="card-header-row">
                  <span class="meta-date"><Calendar size={11} /> ORIGIN DATE: {task.origin_date}</span>
                </div>

                <!-- Title with Search Highlight (Double click to open .md file) -->
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <h3 
                  class="card-title clickable-title" 
                  ondblclick={(e) => { e.stopPropagation(); store.openStrategiesFile(task); }}
                  title="Double-click to open Markdown strategy note (.md)"
                >
                  {#each getTitleParts(task.title, searchQuery) as part}
                    {#if part.highlight}
                      <mark class="search-highlight">{part.text}</mark>
                    {:else}
                      {part.text}
                    {/if}
                  {/each}
                </h3>

                <!-- Tags (All visible with dynamic line wrapping) -->
                {#if task.tags && task.tags.length > 0}
                  <div class="tags-row">
                    {#each task.tags as tag}
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <span 
                        class="tag clickable" 
                        class:active={selectedTagNames.includes(tag.tag_name.toUpperCase())}
                        onclick={(e) => filterByTag(tag.tag_name, e)}
                        title="Filter by tag: {tag.tag_name}"
                      >
                        <TagIcon size={10} /> {tag.tag_name}
                      </span>
                    {/each}
                  </div>
                {/if}
              </div>

              <!-- PRIORITY STATUS, PURGE BUTTON & MOVE BUTTON ON EXACT SAME HORIZONTAL ROW -->
              <div class="card-actions" onclick={(e) => e.stopPropagation()}>
                <span class="badge-tactical badge-{task.priority.toLowerCase() === 'critical' ? 'high' : task.priority.toLowerCase()}">
                  {task.priority === 'Critical' ? 'High' : task.priority.toUpperCase()}
                </span>

                <!-- PURGE BUTTON (RAW INTEL STAGE ONLY) -->
                <button 
                  type="button"
                  class="action-btn-purge" 
                  onclick={(e) => openPurgeModal(task, e)} 
                  title="Permanently Purge Raw Intel Campaign"
                >
                  <Trash2 size={12} />
                  <span>PURGE</span>
                </button>

                <button 
                  class="action-btn strategize" 
                  onclick={(e) => moveToStrategizing(task, e)} 
                  title="Move to Strategizing"
                >
                  <Network size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <!-- Divider -->
    <div class="panel-divider"></div>

    <!-- RIGHT: STRATEGIZING -->
    <div class="panel">
      <div class="panel-header strategizing">
        <div class="panel-title">
          <Network size={18} strokeWidth={2.2} />
          <span>STRATEGIZING</span>
        </div>
        <span class="panel-count">{strategizingTasks.length}</span>
      </div>

      <div class="panel-body">
        {#if strategizingTasks.length === 0}
          <div class="empty-state">
            <Network size={36} />
            <p>No campaigns in strategizing.</p>
          </div>
        {:else}
          {#each strategizingTasks as task (task.id)}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div 
              class="task-card strategizing-card" 
              class:just-updated={store.highlightedTaskId === task.id}
              use:scrollIfHighlighted={store.highlightedTaskId === task.id}
              onclick={() => openDetail(task, 'right')}
            >
              <span class="priority-bar {task.priority.toLowerCase() === 'critical' ? 'high' : task.priority.toLowerCase()}"></span>
              
              <div class="card-content">
                <!-- Creation Time ONLY ABOVE Title -->
                <div class="card-header-row">
                  <span class="meta-date"><Calendar size={11} /> ORIGIN DATE: {task.origin_date}</span>
                </div>

                <!-- Title with Search Highlight (Double click to open .md file) -->
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <h3 
                  class="card-title clickable-title" 
                  ondblclick={(e) => { e.stopPropagation(); store.openStrategiesFile(task); }}
                  title="Double-click to open Markdown strategy note (.md)"
                >
                  {#each getTitleParts(task.title, searchQuery) as part}
                    {#if part.highlight}
                      <mark class="search-highlight">{part.text}</mark>
                    {:else}
                      {part.text}
                    {/if}
                  {/each}
                </h3>

                <!-- Tags (All visible with dynamic line wrapping) -->
                {#if task.tags && task.tags.length > 0}
                  <div class="tags-row">
                    {#each task.tags as tag}
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <span 
                        class="tag strat clickable" 
                        class:active={selectedTagNames.includes(tag.tag_name.toUpperCase())}
                        onclick={(e) => filterByTag(tag.tag_name, e)}
                        title="Filter by tag: {tag.tag_name}"
                      >
                        <TagIcon size={10} /> {tag.tag_name}
                      </span>
                    {/each}
                  </div>
                {/if}
              </div>

              <!-- PRIORITY STATUS BUTTON & MOVE BUTTON ON EXACT SAME HORIZONTAL ROW -->
              <div class="card-actions" onclick={(e) => e.stopPropagation()}>
                <span class="badge-tactical badge-{task.priority.toLowerCase() === 'critical' ? 'high' : task.priority.toLowerCase()}">
                  {task.priority === 'Critical' ? 'High' : task.priority.toUpperCase()}
                </span>
                <!-- DUPLICATE BUTTON -->
                <button 
                  type="button"
                  class="action-btn duplicate" 
                  onclick={(e) => handleDuplicateTask(task, e)} 
                  title="Duplicate Campaign"
                >
                  <Copy size={12} />
                </button>

                <button 
                  class="action-btn back" 
                  onclick={(e) => moveToRawIntel(task, e)} 
                  title="Move back to Raw Intel"
                >
                  <Brain size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
</div>

<!-- Task detail slide-in panel (for Strategizing) -->
{#if selectedTask}
  <ArsenalTaskView 
    task={selectedTask} 
    side={selectedSide} 
    onClose={closeDetail} 
    onOpenEditModal={(taskToEdit) => { closeDetail(); editingTask = taskToEdit; }}
  />
{/if}

<!-- Task editing window modal (for Raw Intel) -->
{#if editingTask}
  <ArsenalTaskEdit task={editingTask} onClose={() => editingTask = null} />
{/if}

<!-- 60-SECOND PURGE CONFIRMATION MODAL FOR RAW INTEL CARDS -->
{#if isPurgeModalOpen && purgingTask}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="purge-modal-overlay" onclick={closePurgeModal}>
    <div class="purge-modal-card" onclick={(e) => e.stopPropagation()}>
      <div class="purge-header">
        <div class="purge-title-wrap">
          <Trash2 size={22} class="purge-icon" />
          <div>
            <h3 class="purge-title">CONFIRM PERMANENT CAMPAIGN PURGE</h3>
            <span class="purge-sub">IRREVERSIBLE DISK & DATABASE PURGE</span>
          </div>
        </div>
        <button type="button" class="btn-close-purge" onclick={closePurgeModal}>
          <X size={18} />
        </button>
      </div>

      <div class="purge-body">
        <div class="purge-warning-box">
          <AlertTriangle size={20} class="warning-icon" />
          <p>This action will <strong>permanently purge</strong> the Raw Intel campaign <em>"{purgingTask.title}"</em> from your SQLite database and strategy file. It will <strong>NOT</strong> be archived.</p>
        </div>
      </div>

      <div class="purge-footer">
        <button type="button" class="btn-cancel-purge" onclick={closePurgeModal}>CANCEL</button>
        <button 
          type="button" 
          class="btn-confirm-purge" 
          disabled={purgeTimerSeconds > 0} 
          onclick={confirmPermanentPurge}
        >
          <Trash2 size={16} />
          {#if purgeTimerSeconds > 0}
            <span>PURGE LOCKED ({purgeTimerSeconds}s)</span>
          {:else}
            <span>CONFIRM PERMANENT PURGE</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .arsenal-root {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 64px);
    width: 100%;
    overflow: hidden;
    background: var(--bg-dark);
  }

  /* ── FILTER BAR ── */
  .filter-bar {
    position: relative;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    background: rgba(10, 15, 26, 0.92);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    flex-shrink: 0;
    width: 100%;
    box-sizing: border-box;
  }

  .new-campaign-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 18px;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.08em;
    word-spacing: 0.10em;
    color: #ffffff;
    background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
    border: 1px solid rgba(196, 181, 253, 0.50);
    border-radius: 9999px;
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.40);
    cursor: pointer;
    transition: all 0.18s ease;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .new-campaign-btn:hover {
    background: linear-gradient(135deg, #9333ea 0%, #4f46e5 100%);
    border-color: rgba(255, 255, 255, 0.80);
    box-shadow: 0 0 28px rgba(139, 92, 246, 0.60);
    transform: translateY(-1px);
  }

  .filter-divider {
    width: 1px;
    height: 24px;
    background: rgba(255, 255, 255, 0.10);
    flex-shrink: 0;
  }

  /* Priority Pills with Circular Count Badge */
  .priority-pills {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    font-size: 11.5px;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 9999px;
    transition: all 0.15s ease;
    cursor: pointer;
  }
  .pill:hover { color: var(--text-main); background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18); }
  .pill.active {
    color: #ffffff;
    background: rgba(139, 92, 246, 0.28);
    border-color: rgba(139, 92, 246, 0.65);
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.25);
  }
  .pill.high.active { background: rgba(239, 68, 68, 0.28); border-color: rgba(239, 68, 68, 0.65); color: #fca5a5; }
  .pill.medium.active { background: rgba(245, 158, 11, 0.28); border-color: rgba(245, 158, 11, 0.65); color: #fde68a; }
  .pill.low.active { background: rgba(59, 130, 246, 0.28); border-color: rgba(59, 130, 246, 0.65); color: #93c5fd; }

  .pill-count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 99px;
    background: rgba(255, 255, 255, 0.12);
    font-size: 10px;
    font-weight: 900;
    color: #ffffff;
    margin-left: 0;
  }
  .pill.active .pill-count-badge { background: rgba(255, 255, 255, 0.25); }

  /* Full Width Flex Search Bar */
  .search-wrap {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    min-width: 140px;
  }
  :global(.search-icon) {
    position: absolute;
    left: 14px;
    color: var(--text-muted);
    pointer-events: none;
  }
  .search-input {
    width: 100%;
    padding: 8px 16px 8px 38px;
    font-size: 12.5px;
    font-weight: 700;
    color: var(--text-main);
    background: rgba(6, 10, 18, 0.85);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 9999px;
    transition: all 0.15s ease;
    box-sizing: border-box;
  }
  .search-input:focus { border-color: rgba(139,92,246,0.55); box-shadow: 0 0 0 3px rgba(139,92,246,0.15); outline: none; }

  .dropdown-wrap { position: relative; flex-shrink: 0; }
  .dropdown-btn {
    display: flex; align-items: center; gap: 7px;
    padding: 8px 14px; font-size: 12px; font-weight: 700;
    color: var(--text-muted);
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 9999px;
    transition: all 0.15s ease; white-space: nowrap;
    cursor: pointer;
  }
  .dropdown-btn:hover { color: var(--text-main); background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18); }
  :global(.chevron) { transition: transform 0.15s ease; }
  :global(.chevron.open) { transform: rotate(180deg); }
  
  /* Dropdown Z-index high layering to stay above task cards */
  .dropdown-menu {
    position: absolute; top: calc(100% + 8px); right: 0; z-index: 99999;
    min-width: 180px; max-height: 260px; overflow-y: auto;
    background: rgba(12, 17, 30, 0.98);
    backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
    border: 1px solid rgba(139, 92, 246, 0.35);
    border-radius: var(--radius-md);
    box-shadow: 0 16px 40px rgba(0,0,0,0.85);
    padding: 6px 0;
  }
  
  .dropdown-item {
    display: block; width: 100%; padding: 9px 16px; text-align: left;
    font-size: 12px; font-weight: 700; color: var(--text-muted);
    transition: all 0.12s ease; border: none; background: none; cursor: pointer;
  }
  .dropdown-item:hover { background: rgba(255,255,255,0.07); color: var(--text-main); }
  .dropdown-item.active { color: #ddd6fe; background: rgba(139,92,246,0.22); font-weight: 800; }

  .dropdown-checkbox-item {
    display: flex; align-items: center; gap: 9px;
    padding: 8px 16px; font-size: 12px; font-weight: 700;
    color: var(--text-muted); cursor: pointer; transition: background 0.12s ease;
  }
  .dropdown-checkbox-item:hover { background: rgba(255,255,255,0.07); color: var(--text-main); }
  :global(.cb-icon) { color: var(--text-dim); }
  :global(.cb-icon.active) { color: #c4b5fd; }
  .cb-label { flex: 1; font-size: 12px; font-weight: 700; }
  .menu-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 4px 0; }

  .sort-dir-btn {
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.10);
    color: var(--text-muted);
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s ease; cursor: pointer; flex-shrink: 0;
  }
  .sort-dir-btn:hover { background: rgba(139,92,246,0.20); border-color: rgba(139,92,246,0.40); color: #ddd6fe; }

  /* ── PANELS ── */
  .panels {
    display: flex;
    flex: 1;
    overflow: hidden;
    width: 100%;
    position: relative;
    z-index: 1;
  }

  .panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .panel-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 20px;
    flex-shrink: 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .panel-header.raw-intel {
    background: rgba(139,92,246,0.06);
    border-bottom-color: rgba(139,92,246,0.15);
  }
  .panel-header.strategizing {
    background: rgba(59,130,246,0.05);
    border-bottom-color: rgba(59,130,246,0.12);
  }
  .panel-title {
    display: flex; align-items: center; gap: 9px;
    font-size: 13px; font-weight: 900; letter-spacing: 0.10em;
    color: var(--text-main);
  }
  .raw-intel .panel-title { color: #c4b5fd; }
  .strategizing .panel-title { color: #93c5fd; }
  .panel-count {
    font-size: 11px; font-weight: 900;
    background: rgba(255,255,255,0.08); color: var(--text-muted);
    padding: 2px 9px; border-radius: 99px;
    border: 1px solid rgba(255,255,255,0.10);
  }

  .panel-divider {
    width: 1px;
    background: linear-gradient(180deg, transparent, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.08) 80%, transparent);
    flex-shrink: 0;
  }

  .panel-body {
    flex: 1; overflow-y: auto;
    padding: 16px;
    display: flex; flex-direction: column; gap: 10px;
  }

  /* ── TASK CARDS (one per row, auto adjustable height) ── */
  .task-card {
    display: flex;
    align-items: center;
    min-height: 100px;
    height: auto;
    background: rgba(14, 20, 33, 0.75);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 22px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    width: 100%;
    box-sizing: border-box;
  }
  .task-card:hover {
    border-color: rgba(139,92,246,0.45);
    background: rgba(24, 30, 52, 0.88);
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(0,0,0,0.45), 0 0 20px rgba(139,92,246,0.18);
  }
  .task-card.just-updated {
    animation: highlightCardPulse 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    border-color: rgba(168, 85, 247, 0.85) !important;
  }

  @keyframes highlightCardPulse {
    0%   { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.8), 0 0 36px rgba(168, 85, 247, 0.6); transform: scale(1.015); }
    50%  { box-shadow: 0 0 0 4px rgba(168, 85, 247, 0.4), 0 0 44px rgba(168, 85, 247, 0.6); transform: scale(1.008); }
    100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0); transform: scale(1); }
  }

  .strategizing-card:hover {
    border-color: rgba(59,130,246,0.45);
    box-shadow: 0 8px 28px rgba(0,0,0,0.45), 0 0 20px rgba(59,130,246,0.18);
  }

  /* Left priority bar vertically centered / stretched */
  .priority-bar { width: 4px; flex-shrink: 0; display: block; align-self: stretch; }
  .priority-bar.high   { background: linear-gradient(180deg, #ef4444, #dc2626); }
  .priority-bar.medium { background: linear-gradient(180deg, #f59e0b, #d97706); }
  .priority-bar.low    { background: linear-gradient(180deg, #3b82f6, #2563eb); }

  .card-content {
    flex: 1; padding: 16px 20px;
    display: flex; flex-direction: column; gap: 8px; min-width: 0;
  }

  /* Date Header */
  .card-header-row {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
  }
  .meta-date { display: flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 700; color: #c4b5fd; }

  .card-title {
    font-size: 15px; font-weight: 900; line-height: 1.38;
    color: #f3e8ff; letter-spacing: 0.02em; word-spacing: 0.04em;
    word-break: break-word; white-space: normal; margin: 0;
  }

  :global(.search-highlight) {
    background: rgba(245, 158, 11, 0.35);
    color: #fef3c7;
    padding: 0 2px;
    border-radius: 2px;
  }

  .tags-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 2px; max-height: 44px; overflow: hidden; }
  .tag {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 10px; font-weight: 800; letter-spacing: 0.04em;
    color: var(--text-muted);
    background: rgba(139,92,246,0.10); padding: 3px 9px;
    border-radius: 99px; border: 1px solid rgba(139,92,246,0.18);
    transition: all 0.15s ease;
  }
  .tag.clickable { cursor: pointer; }
  .tag.clickable:hover {
    background: rgba(139,92,246,0.25);
    border-color: rgba(139,92,246,0.50);
    color: #ddd6fe;
    transform: translateY(-1px);
  }
  .tag.clickable.active {
    background: rgba(139,92,246,0.40);
    border-color: rgba(139,92,246,0.80);
    color: #ffffff;
    box-shadow: 0 0 10px rgba(139,92,246,0.35);
  }
  .tag.strat {
    background: rgba(59,130,246,0.10); border-color: rgba(59,130,246,0.18);
  }
  .tag.strat.clickable:hover {
    background: rgba(59,130,246,0.25);
    border-color: rgba(59,130,246,0.50);
    color: #bfdbfe;
  }
  .tag.strat.clickable.active {
    background: rgba(59,130,246,0.40);
    border-color: rgba(59,130,246,0.80);
    color: #ffffff;
    box-shadow: 0 0 10px rgba(59,130,246,0.35);
  }

  /* PRIORITY STATUS BUTTON & MOVE BUTTON ON EXACT SAME HORIZONTAL ROW / LEVEL */
  .card-actions {
    display: flex; 
    align-items: center; 
    justify-content: flex-end;
    gap: 12px;
    align-self: center;
    padding: 12px 18px;
    border-left: 1px solid rgba(255,255,255,0.06);
    flex-shrink: 0;
  }
  .action-btn {
    width: 32px; height: 32px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid transparent;
    transition: all 0.15s ease;
    cursor: pointer;
  }
  .action-btn:hover { transform: scale(1.12); }
  .action-btn.strategize {
    background: rgba(59,130,246,0.12); border-color: rgba(59,130,246,0.25); color: #60a5fa;
  }
  .action-btn.strategize:hover {
    background: rgba(59,130,246,0.30); border-color: rgba(59,130,246,0.60); color: #bfdbfe;
    box-shadow: 0 0 14px rgba(59,130,246,0.35);
  }
  .action-btn.back {
    background: rgba(139,92,246,0.12); border-color: rgba(139,92,246,0.25); color: #c4b5fd;
  }
  .action-btn.back:hover {
    background: rgba(139,92,246,0.30); border-color: rgba(139,92,246,0.60); color: #ddd6fe;
    box-shadow: 0 0 14px rgba(139,92,246,0.35);
  }
  .action-btn.duplicate {
    background: rgba(6,182,212,0.14); border-color: rgba(6,182,212,0.30); color: #67e8f9;
  }
  .action-btn.duplicate:hover {
    background: rgba(6,182,212,0.32); border-color: rgba(6,182,212,0.65); color: #a5f3fc;
    box-shadow: 0 0 16px rgba(6,182,212,0.40);
  }

  /* PURGE BUTTON ON RAW INTEL TASK CARD (BETWEEN PRIORITY PILL & MOVE BUTTON) */
  .action-btn-purge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    font-size: 10.5px;
    font-weight: 900;
    letter-spacing: 0.05em;
    color: #fca5a5;
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.38);
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .action-btn-purge:hover {
    background: rgba(239, 68, 68, 0.32);
    border-color: rgba(239, 68, 68, 0.70);
    box-shadow: 0 0 14px rgba(239, 68, 68, 0.35);
    color: #ffffff;
    transform: translateY(-1px);
  }

  /* 60s PURGE MODAL OVERLAY IN ARSENAL */
  .purge-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 50000;
    background: rgba(4, 7, 14, 0.92);
    backdrop-filter: blur(24px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .purge-modal-card {
    width: 540px;
    max-width: 90vw;
    background: rgba(14, 20, 33, 0.98);
    border: 1.5px solid rgba(239, 68, 68, 0.6);
    border-radius: 24px;
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-shadow: 0 28px 72px rgba(0, 0, 0, 0.95), 0 0 40px rgba(239, 68, 68, 0.25);
  }

  .purge-header { display: flex; align-items: center; justify-content: space-between; }
  .purge-title-wrap { display: flex; align-items: center; gap: 12px; }
  :global(.purge-icon) { color: #fca5a5; }
  .purge-title { font-size: 15px; font-weight: 900; color: #fef2f2; letter-spacing: 0.05em; margin: 0; }
  .purge-sub { font-size: 10.5px; font-weight: 700; color: #fca5a5; letter-spacing: 0.06em; }
  .btn-close-purge { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--text-muted); display: flex; align-items: center; justify-content: center; cursor: pointer; }

  .purge-body { display: flex; flex-direction: column; gap: 14px; }
  .purge-warning-box { display: flex; gap: 12px; padding: 14px 16px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 14px; color: #fca5a5; font-size: 12px; line-height: 1.5; }
  :global(.warning-icon) { flex-shrink: 0; color: #f87171; }

  .purge-footer { display: flex; align-items: center; justify-content: flex-end; gap: 12px; }
  .btn-cancel-purge { padding: 10px 20px; font-size: 11.5px; font-weight: 900; color: var(--text-muted); background: transparent; border: none; cursor: pointer; }
  .btn-confirm-purge { display: flex; align-items: center; gap: 8px; padding: 11px 22px; font-size: 12px; font-weight: 900; color: #ffffff; background: linear-gradient(135deg, #dc2626, #b91c1c); border: 1px solid rgba(254, 202, 202, 0.4); border-radius: 12px; cursor: pointer; transition: all 0.15s ease; box-shadow: 0 0 20px rgba(239, 68, 68, 0.4); }
  .btn-confirm-purge:hover:not(:disabled) { background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 0 28px rgba(239, 68, 68, 0.6); }
  .btn-confirm-purge:disabled { opacity: 0.35; cursor: not-allowed; box-shadow: none; filter: grayscale(0.8); }

  /* Empty state */
  .empty-state {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 14px; padding: 60px 20px;
    color: var(--text-dim); text-align: center;
    font-size: 13px; font-weight: 600;
  }
</style>
