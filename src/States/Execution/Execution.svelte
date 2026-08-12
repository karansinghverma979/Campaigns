<script>
  import { store } from '../../lib/store.svelte.js';
  import { onDestroy } from 'svelte';
  import { ChronosMath } from '../../lib/ChronosMath.js';
  import { 
    Flame, Search, ChevronDown, ArrowUp, ArrowDown, 
    Tag as TagIcon, Calendar, Clock, CheckSquare, Square
  } from 'lucide-svelte';
  import ExecutionTaskWindow from './ExecutionTaskView/ExecutionTaskWindow.svelte';

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
  
  onDestroy(() => {
    if (_searchTimer) clearTimeout(_searchTimer);
  });

  let selectedTagNames = $state([]); // Array of selected tag names for multi-select
  let sortBy         = $state('deadline'); // 'deadline' | 'date' | 'name'
  let sortDir        = $state('asc'); // 'asc' | 'desc'
  let tagDropdownOpen = $state(false);
  let sortDropdownOpen = $state(false);

  // ── Selected task for detail modal window ──
  let selectedTask = $state(null);

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
    ALL:    store.executionTasks.length,
    High:   store.executionTasks.filter(t => t.priority === 'High' || t.priority === 'Critical').length,
    Medium: store.executionTasks.filter(t => t.priority === 'Medium').length,
    Low:    store.executionTasks.filter(t => t.priority === 'Low').length
  });

  // Extract all unique tag names from Execution tasks
  const availableTags = $derived.by(() => {
    const tagSet = new Set();
    store.executionTasks.forEach(task => {
      if (task.tags && Array.isArray(task.tags)) {
        task.tags.forEach(t => {
          if (t.tag_name) tagSet.add(t.tag_name);
        });
      }
    });
    return Array.from(tagSet).sort();
  });

  // Dynamic filtered and sorted tasks array
  const filteredTasks = $derived.by(() => {
    let result = store.executionTasks.filter(t => {
      // Priority filter
      if (filterPriority === 'High') {
        if (t.priority !== 'High' && t.priority !== 'Critical') return false;
      } else if (filterPriority !== 'ALL') {
        if (t.priority !== filterPriority) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = t.title.toLowerCase().includes(q);
        const tagMatch = t.tags && t.tags.some(tg => tg.tag_name.toLowerCase().includes(q));
        if (!titleMatch && !tagMatch) return false;
      }

      // Tags multi-select filter
      if (selectedTagNames.length > 0) {
        const taskTagNames = (t.tags || []).map(tg => tg.tag_name);
        const hasMatchingTag = selectedTagNames.some(name => taskTagNames.includes(name));
        if (!hasMatchingTag) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'deadline') {
        const remainingA = ChronosMath.daysRemaining(a.deadline);
        const remainingB = ChronosMath.daysRemaining(b.deadline);
        comparison = remainingA - remainingB;
      } else if (sortBy === 'date') {
        const dateA = a.initiated_at || a.origin_date || '';
        const dateB = b.initiated_at || b.origin_date || '';
        comparison = dateA.localeCompare(dateB);
      } else if (sortBy === 'name') {
        comparison = a.title.localeCompare(b.title);
      }

      return sortDir === 'asc' ? comparison : -comparison;
    });

    return result;
  });

  // Compile once per search query change, not per card render
  const _searchRegex = $derived(
    searchQuery.trim()
      ? new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')})`, 'gi')
      : null
  );

  function toggleTagSelection(tagName) {
    if (selectedTagNames.includes(tagName)) {
      selectedTagNames = selectedTagNames.filter(n => n !== tagName);
    } else {
      selectedTagNames = [...selectedTagNames, tagName];
    }
  }

  function filterByTag(tagName, e) {
    if (e) e.stopPropagation();
    toggleTagSelection(tagName);
  }

  function toggleSelectAllTags() {
    selectedTagNames = [];
  }

  function openDetail(task, e) {
    if (e && e.stopPropagation) e.stopPropagation();
    selectedTask = task;
  }

  function closeDetail() {
    if (selectedTask && selectedTask.id) {
      store.setHighlightedTaskId(selectedTask.id);
    }
    selectedTask = null;
    store.loadAllData();
  }

  // Helper for title search highlighting
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

<div class="execution-root">
  
  <!-- ── FULL-WIDTH FILTER BAR ── -->
  <div class="filter-bar">
    <div class="priority-group">
      <button 
        class="pill-btn" 
        class:active={filterPriority === 'ALL'} 
        onclick={() => filterPriority = 'ALL'}
      >
        <span>ALL</span>
        <span class="pill-count-badge">{priorityCounts.ALL}</span>
      </button>

      <button 
        class="pill-btn high" 
        class:active={filterPriority === 'High'} 
        onclick={() => filterPriority = 'High'}
      >
        <span>HIGH</span>
        <span class="pill-count-badge">{priorityCounts.High}</span>
      </button>

      <button 
        class="pill-btn medium" 
        class:active={filterPriority === 'Medium'} 
        onclick={() => filterPriority = 'Medium'}
      >
        <span>MEDIUM</span>
        <span class="pill-count-badge">{priorityCounts.Medium}</span>
      </button>

      <button 
        class="pill-btn low" 
        class:active={filterPriority === 'Low'} 
        onclick={() => filterPriority = 'Low'}
      >
        <span>LOW</span>
        <span class="pill-count-badge">{priorityCounts.Low}</span>
      </button>
    </div>

    <!-- Full-Width Flex Search Bar -->
    <div class="search-wrap">
      <Search size={14} class="search-icon" />
      <input 
        type="text" 
        placeholder="Search active execution campaigns by title or tag..." 
        bind:value={_searchRaw}
        oninput={(e) => handleSearchInput(e.target.value)}
        class="search-input"
      />
    </div>

    <!-- TAG MULTI-SELECT DROPDOWN -->
    <div class="dropdown-wrap">
      <button 
        class="dropdown-btn" 
        onclick={(e) => { e.stopPropagation(); tagDropdownOpen = !tagDropdownOpen; sortDropdownOpen = false; }}
      >
        <TagIcon size={13} />
        <span>TAGS</span>
        {#if selectedTagNames.length > 0}
          <span class="pill-count-badge tag-badge">{selectedTagNames.length}</span>
        {/if}
        <ChevronDown size={13} class="chevron {tagDropdownOpen ? 'open' : ''}" />
      </button>

      {#if tagDropdownOpen}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="dropdown-menu tags-menu" onclick={(e) => e.stopPropagation()}>
          <button 
            type="button" 
            class="dropdown-checkbox-item select-all" 
            onclick={toggleSelectAllTags}
          >
            {#if selectedTagNames.length === 0}
              <CheckSquare size={14} class="cb-icon active" />
            {:else}
              <Square size={14} class="cb-icon" />
            {/if}
            <span class="cb-label">All Tags</span>
          </button>
          <div class="menu-divider"></div>

          {#if availableTags.length === 0}
            <div class="empty-dropdown-msg">No tags available</div>
          {:else}
            {#each availableTags as tagName}
              <button 
                type="button" 
                class="dropdown-checkbox-item" 
                onclick={() => toggleTagSelection(tagName)}
              >
                {#if selectedTagNames.includes(tagName)}
                  <CheckSquare size={14} class="cb-icon active" />
                {:else}
                  <Square size={14} class="cb-icon" />
                {/if}
                <span class="cb-label">{tagName}</span>
              </button>
            {/each}
          {/if}
        </div>
      {/if}
    </div>

    <!-- SORT BY DROPDOWN -->
    <div class="dropdown-wrap">
      <button 
        class="dropdown-btn" 
        onclick={(e) => { e.stopPropagation(); sortDropdownOpen = !sortDropdownOpen; tagDropdownOpen = false; }}
      >
        <span class="btn-label">SORT: {sortBy.toUpperCase()}</span>
        <ChevronDown size={13} class="chevron {sortDropdownOpen ? 'open' : ''}" />
      </button>

      {#if sortDropdownOpen}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="dropdown-menu sort-menu" onclick={(e) => e.stopPropagation()}>
          <div 
            class="dropdown-item {sortBy === 'deadline' ? 'active' : ''}" 
            onclick={() => { sortBy = 'deadline'; sortDropdownOpen = false; }}
          >
            <span>Target Deadline</span>
            {#if sortBy === 'deadline'}
              <span class="active-dot"></span>
            {/if}
          </div>
          <div 
            class="dropdown-item {sortBy === 'date' ? 'active' : ''}" 
            onclick={() => { sortBy = 'date'; sortDropdownOpen = false; }}
          >
            <span>Execution Date</span>
            {#if sortBy === 'date'}
              <span class="active-dot"></span>
            {/if}
          </div>
          <div 
            class="dropdown-item {sortBy === 'name' ? 'active' : ''}" 
            onclick={() => { sortBy = 'name'; sortDropdownOpen = false; }}
          >
            <span>Campaign Title</span>
            {#if sortBy === 'name'}
              <span class="active-dot"></span>
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <!-- Sort Direction Toggle -->
    <button 
      class="sort-dir-btn" 
      onclick={() => sortDir = sortDir === 'asc' ? 'desc' : 'asc'}
      title={sortDir === 'asc' ? 'Ascending Order' : 'Descending Order'}
    >
      {#if sortDir === 'asc'}
        <ArrowUp size={14} />
      {:else}
        <ArrowDown size={14} />
      {/if}
    </button>
  </div>

  <!-- ── MAIN CARDS CONTAINER (Dynamic Height, Zero Overlaps) ── -->
  <div class="execution-cards-container">
    {#if filteredTasks.length === 0}
      <div class="empty-state">
        <Flame size={42} class="empty-flame-icon" />
        <p>No active execution campaigns found.</p>
        <span class="empty-sub">Deploy campaigns from Arsenal to activate them in Execution.</span>
      </div>
    {:else}
      {#each filteredTasks as task (task.id)}
        {@const daysLeft = ChronosMath.daysRemaining(task.deadline)}
        {@const totalSubtasks = task.subtask_total || 0}
        {@const completedSubtasks = task.subtask_completed || 0}
        {@const pct = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0}

        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
          class="task-card" 
          class:just-updated={store.highlightedTaskId === task.id}
          use:scrollIfHighlighted={store.highlightedTaskId === task.id}
          onclick={(e) => openDetail(task, e)}
        >
          <!-- Left priority color bar -->
          <span class="priority-bar {task.priority.toLowerCase() === 'critical' ? 'high' : task.priority.toLowerCase()}"></span>
          
          <!-- Card Content Body -->
          <div class="card-body-left">
            <!-- Header Row: Initiated Date ONLY -->
            <div class="card-header-row">
              <span class="meta-date"><Calendar size={11} /> Initiated: {task.initiated_at || task.origin_date}</span>
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

            <!-- Tags -->
            {#if task.tags && task.tags.length > 0}
              <div class="tags-row">
                {#each task.tags as tag}
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <span 
                    class="tag clickable" 
                    class:active={selectedTagNames.includes(tag.tag_name)}
                    onclick={(e) => filterByTag(tag.tag_name, e)}
                    title="Filter by tag: {tag.tag_name}"
                  >
                    <TagIcon size={10} /> {tag.tag_name}
                  </span>
                {/each}
              </div>
            {/if}
          </div>

          <!-- EXACT SAME HORIZONTAL ROW ALIGNMENT: REMAINING DAYS PILL, SUBTASK PROGRESS BAR, AND PRIORITY BADGE -->
          <div class="card-center-row">
            <!-- Remaining Days Pill -->
            <div class="days-pill" class:urgent={daysLeft <= 2} class:overdue={daysLeft < 0}>
              <Clock size={11} />
              <span>{daysLeft < 0 ? `${Math.abs(daysLeft)} DAYS OVERDUE` : daysLeft === 0 ? 'DUE TODAY' : `${daysLeft} DAYS LEFT`}</span>
              <span class="deadline-text">({task.deadline})</span>
            </div>

            <!-- Subtask Progress Bar & Percentage -->
            <div class="subtask-progress-box">
              <div class="progress-bar-track">
                <div class="progress-bar-fill" style="width: {pct}%"></div>
              </div>
              <span class="progress-pct-label">{pct}% [{completedSubtasks}/{totalSubtasks}]</span>
            </div>

            <!-- Priority Status Badge -->
            <span class="badge-tactical badge-{task.priority.toLowerCase() === 'critical' ? 'high' : task.priority.toLowerCase()}">
              {task.priority === 'Critical' ? 'High' : task.priority.toUpperCase()}
            </span>
          </div>
        </div>
      {/each}
    {/if}
  </div>

</div>

<!-- Task Detail Centered Modal Window -->
{#if selectedTask}
  <ExecutionTaskWindow task={selectedTask} onClose={closeDetail} />
{/if}

<style>
  .execution-root {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 64px);
    width: 100%;
    overflow: hidden;
    background: var(--bg-dark);
  }

  /* Full Width Filter Bar */
  .filter-bar {
    position: relative;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    background: rgba(10, 15, 26, 0.90);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-wrap: nowrap;
    width: 100%;
    box-sizing: border-box;
  }

  .priority-group {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .pill-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    font-size: 11.5px;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 9999px;
    transition: all 0.15s ease;
    cursor: pointer;
  }
  .pill-btn:hover {
    color: var(--text-main);
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.18);
  }
  .pill-btn.active {
    color: #ffffff;
    background: rgba(139, 92, 246, 0.28);
    border-color: rgba(139, 92, 246, 0.65);
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.25);
  }
  .pill-btn.high.active {
    background: rgba(239, 68, 68, 0.28);
    border-color: rgba(239, 68, 68, 0.65);
    color: #fca5a5;
  }
  .pill-btn.medium.active {
    background: rgba(245, 158, 11, 0.28);
    border-color: rgba(245, 158, 11, 0.65);
    color: #fde68a;
  }
  .pill-btn.low.active {
    background: rgba(59, 130, 246, 0.28);
    border-color: rgba(59, 130, 246, 0.65);
    color: #93c5fd;
  }

  .pill-count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 99px;
    font-size: 10px;
    font-weight: 900;
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
    margin-left: 2px;
  }
  .pill-btn.active .pill-count-badge {
    background: rgba(255, 255, 255, 0.25);
  }

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
  .search-input:focus { border-color: rgba(239,68,68,0.55); box-shadow: 0 0 0 3px rgba(239,68,68,0.15); outline: none; }

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
  
  .dropdown-menu {
    position: absolute; top: calc(100% + 8px); right: 0; z-index: 99999;
    min-width: 190px; max-height: 260px; overflow-y: auto;
    background: rgba(12, 17, 30, 0.98);
    backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
    border: 1px solid rgba(239, 68, 68, 0.35);
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
  .dropdown-item.active { color: #fca5a5; background: rgba(239,68,68,0.22); font-weight: 800; }

  .dropdown-checkbox-item {
    display: flex; align-items: center; gap: 9px;
    padding: 8px 16px; font-size: 12px; font-weight: 700;
    color: var(--text-muted); cursor: pointer; transition: background 0.12s ease;
  }
  .dropdown-checkbox-item:hover { background: rgba(255,255,255,0.07); color: var(--text-main); }
  :global(.cb-icon) { color: var(--text-dim); }
  :global(.cb-icon.active) { color: #fca5a5; }
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
  .sort-dir-btn:hover { background: rgba(239,68,68,0.20); border-color: rgba(239,68,68,0.40); color: #fca5a5; }

  /* ── DYNAMIC HEIGHT TASK CARDS (ZERO OVERLAPS) ── */
  .execution-cards-container {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .task-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 100px;
    height: auto;
    padding-right: 24px;
    background: rgba(14, 20, 33, 0.75);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 22px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    width: 100%;
    box-sizing: border-box;
  }
  .task-card:hover {
    border-color: rgba(139, 92, 246, 0.40);
    background: rgba(22, 28, 46, 0.92);
    transform: translateY(-2px);
    box-shadow:
      0 12px 32px rgba(0,0,0,0.50),
      0 0 24px rgba(139, 92, 246, 0.15),
      inset 0 1px 0 rgba(255,255,255,0.06);
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

  .priority-bar { width: 5px; flex-shrink: 0; display: block; align-self: stretch; transition: box-shadow 0.2s ease; }
  .priority-bar.high   { background: linear-gradient(180deg, #ef4444, #dc2626); }
  .priority-bar.medium { background: linear-gradient(180deg, #f59e0b, #d97706); }
  .priority-bar.low    { background: linear-gradient(180deg, #3b82f6, #2563eb); }
  .task-card:hover .priority-bar.high   { box-shadow: 4px 0 16px rgba(239,68,68,0.40); }
  .task-card:hover .priority-bar.medium { box-shadow: 4px 0 16px rgba(245,158,11,0.40); }
  .task-card:hover .priority-bar.low    { box-shadow: 4px 0 16px rgba(59,130,246,0.40); }

  .card-body-left {
    flex: 1;
    padding: 16px 22px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }

  .card-header-row {
    display: flex; align-items: center; gap: 12px;
  }
  .meta-date { display: flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 700; color: #60a5fa; }

  .card-title {
    font-size: 15px; font-weight: 900; line-height: 1.38;
    color: #f3e8ff; letter-spacing: 0.02em; word-spacing: 0.04em;
    word-break: break-word; white-space: normal;
    margin: 0; max-height: 62px; overflow: hidden;
  }

  :global(.search-highlight) {
    background: rgba(245, 158, 11, 0.35);
    color: #fef3c7;
    padding: 0 2px;
    border-radius: 2px;
  }

  .tags-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 4px; max-height: 44px; overflow: hidden; }
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    background: rgba(59, 130, 246, 0.10);
    padding: 3px 9px;
    border-radius: 99px;
    border: 1px solid rgba(59, 130, 246, 0.18);
    transition: all 0.15s ease;
  }
  .tag.clickable { cursor: pointer; }
  .tag.clickable:hover {
    background: rgba(59, 130, 246, 0.25);
    border-color: rgba(59, 130, 246, 0.50);
    color: #bfdbfe;
    transform: translateY(-1px);
  }
  .tag.clickable.active {
    background: rgba(59, 130, 246, 0.40);
    border-color: rgba(59, 130, 246, 0.80);
    color: #ffffff;
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.35);
  }

  /* ── DEDICATED LAYOUT AREA ALLOCATION (PERFECT COLUMNS) ── */
  .card-center-row {
    display: grid;
    grid-template-columns: minmax(185px, 220px) minmax(180px, 220px) 90px;
    gap: 16px;
    align-items: center;
    justify-items: end;
    flex-shrink: 0;
    padding: 12px 0;
  }

  .days-pill {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 7px 16px; border-radius: 14px; font-size: 11.5px; font-weight: 900;
    color: #34d399; background: rgba(52, 211, 153, 0.12); border: 1px solid rgba(52, 211, 153, 0.35);
    width: 100%; box-sizing: border-box; text-align: center; white-space: nowrap;
  }
  .days-pill.urgent { color: #f59e0b; background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.40); }
  .days-pill.overdue { color: #f87171; background: rgba(239, 68, 68, 0.20); border-color: rgba(239, 68, 68, 0.50); }
  .deadline-text { font-size: 10.5px; opacity: 0.85; white-space: nowrap; }

  /* Subtask Progress Bar (Single Row, Expanded Area) */
  .subtask-progress-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    background: rgba(0, 0, 0, 0.35);
    padding: 7px 14px;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.10);
    width: 100%;
    box-sizing: border-box;
    white-space: nowrap;
  }

  .progress-bar-track {
    flex: 1;
    height: 6px;
    background: rgba(255, 255, 255, 0.10);
    border-radius: 99px;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #8b5cf6 0%, #ec4899 50%, #06b6d4 100%);
    border-radius: 99px;
    transition: width 0.3s ease;
  }

  .progress-pct-label {
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.04em;
    color: #a7f3d0;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .empty-state {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 14px; padding: 80px 20px;
    color: var(--text-dim); text-align: center;
  }
  .empty-state p {
    font-size: 16px; font-weight: 800; letter-spacing: 0.02em; color: var(--text-muted);
  }
  .empty-state .empty-sub {
    font-size: 12.5px; font-weight: 600; color: var(--text-dim); max-width: 360px; line-height: 1.5;
  }
  :global(.empty-flame-icon) { color: rgba(239, 68, 68, 0.35); animation: float-icon 3s ease-in-out infinite; }
  @keyframes float-icon {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }</style>
