<script>
  import { store } from '../../lib/store.svelte.js';
  import { onDestroy } from 'svelte';
  import { ChronosMath } from '../../lib/ChronosMath.js';
  import { 
    AlertTriangle, Search, ChevronDown, ArrowUp, ArrowDown, 
    Tag as TagIcon, Calendar, Clock, CheckSquare, Square, X
  } from 'lucide-svelte';
  import BreachTaskWindow from './BreachTaskView/BreachTaskWindow.svelte';

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

  // Action to smoothly scroll highlighted element into view with timer cleanup
  function scrollIfHighlighted(node, isHighlighted) {
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

  // ── Computed ──
  const priorityCounts = $derived({
    ALL:    store.breachTasks.length,
    High:   store.breachTasks.filter(t => t.priority === 'High' || t.priority === 'Critical').length,
    Medium: store.breachTasks.filter(t => t.priority === 'Medium').length,
    Low:    store.breachTasks.filter(t => t.priority === 'Low').length
  });

  // Extract all unique tag names from Breach tasks
  const availableTags = $derived.by(() => {
    const tagSet = new Set();
    store.breachTasks.forEach(task => {
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
    let result = store.breachTasks.filter(t => {
      // Priority filter
      if (filterPriority === 'High') {
        if (t.priority !== 'High' && t.priority !== 'Critical') return false;
      } else if (filterPriority !== 'ALL') {
        if (t.priority !== filterPriority) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = t.title ? t.title.toLowerCase().includes(q) : false;
        const tagMatch = t.tags && t.tags.some(tg => tg && tg.tag_name && tg.tag_name.toLowerCase().includes(q));
        if (!titleMatch && !tagMatch) return false;
      }

      // Tags multi-select filter
      if (selectedTagNames.length > 0) {
        const taskTagNames = (t.tags || []).map(tg => tg && tg.tag_name ? tg.tag_name : '').filter(Boolean);
        const hasMatchingTag = selectedTagNames.some(name => taskTagNames.includes(name));
        if (!hasMatchingTag) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'deadline') {
        const remainingA = ChronosMath.daysRemaining(a.deadline) || 0;
        const remainingB = ChronosMath.daysRemaining(b.deadline) || 0;
        comparison = remainingA - remainingB;
      } else if (sortBy === 'overdue') {
        const overdueA = ChronosMath.overdueDays(a.deadline);
        const overdueB = ChronosMath.overdueDays(b.deadline);
        comparison = overdueA - overdueB;
      } else if (sortBy === 'date') {
        const parsedA = ChronosMath.parseDate(a.initiated_at || a.origin_date || '');
        const parsedB = ChronosMath.parseDate(b.initiated_at || b.origin_date || '');
        comparison = (parsedA ? parsedA.getTime() : 0) - (parsedB ? parsedB.getTime() : 0);
      } else if (sortBy === 'name') {
        const aTitle = (a.title || '');
        const bTitle = (b.title || '');
        comparison = aTitle.localeCompare(bTitle);
      }

      return sortDir === 'asc' ? comparison : -comparison;
    });

    return result;
  });

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Compile once per search query change, not per card render
  const _searchRegex = $derived.by(() => {
    const q = searchQuery.trim();
    if (!q) return null;
    try {
      return new RegExp(`(${escapeRegExp(q)})`, 'gi');
    } catch (e) {
      return null;
    }
  });

  function toggleTagSelection(tagName) {
    if (selectedTagNames.includes(tagName)) {
      selectedTagNames = selectedTagNames.filter(n => n !== tagName);
    } else {
      selectedTagNames = [...selectedTagNames, tagName];
    }
  }

  function toggleSelectAllTags() {
    selectedTagNames = [];
  }

  function openDetail(task, e) {
    if (e && e.stopPropagation) e.stopPropagation();
    selectedTask = task;
  }

  function closeDetail(wasModified = false) {
    if (wasModified && selectedTask && selectedTask.id) {
      store.setHighlightedTaskId(selectedTask.id);
    }
    selectedTask = null;
  }

  // Helper for title search highlighting without allocating RegExp objects
  function getTitleParts(title) {
    if (!title) return [{ text: '', highlight: false }];
    if (!_searchRegex) return [{ text: title, highlight: false }];
    _searchRegex.lastIndex = 0;
    const parts = [];
    let lastIdx = 0;
    let match;
    while ((match = _searchRegex.exec(title)) !== null) {
      if (match.index > lastIdx) {
        parts.push({ text: title.substring(lastIdx, match.index), highlight: false });
      }
      parts.push({ text: match[0], highlight: true });
      lastIdx = _searchRegex.lastIndex;
      if (!match[0].length) { _searchRegex.lastIndex++; }
    }
    if (lastIdx < title.length) {
      parts.push({ text: title.substring(lastIdx), highlight: false });
    }
    return parts;
  }
</script>

<svelte:window onclick={handleWindowClick} />

<div class="breach-root">
  
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
        placeholder="Search breached campaigns by title or tag..." 
        bind:value={_searchRaw}
        oninput={(e) => handleSearchInput(e.target.value)}
        class="search-input"
      />
      {#if _searchRaw || searchQuery || filterPriority !== 'ALL' || selectedTagNames.length > 0}
        <button 
          type="button" 
          class="btn-search-clear" 
          onclick={() => { _searchRaw = ''; searchQuery = ''; filterPriority = 'ALL'; selectedTagNames = []; }}
          title="Clear search & filters"
          aria-label="Clear search and filters"
        >
          <X size={13} />
        </button>
      {/if}
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
        <span>SORT: {sortBy.toUpperCase()}</span>
        <ChevronDown size={13} class="chevron {sortDropdownOpen ? 'open' : ''}" />
      </button>

      {#if sortDropdownOpen}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="dropdown-menu" onclick={(e) => e.stopPropagation()}>
          <button 
            class="dropdown-item" 
            class:active={sortBy === 'overdue'}
            onclick={() => { sortBy = 'overdue'; sortDropdownOpen = false; }}
          >
            Overdue Days
          </button>
          <button 
            class="dropdown-item" 
            class:active={sortBy === 'deadline'}
            onclick={() => { sortBy = 'deadline'; sortDropdownOpen = false; }}
          >
            Target Deadline
          </button>
          <button 
            class="dropdown-item" 
            class:active={sortBy === 'date'}
            onclick={() => { sortBy = 'date'; sortDropdownOpen = false; }}
          >
            Initiated Date
          </button>
          <button 
            class="dropdown-item" 
            class:active={sortBy === 'name'}
            onclick={() => { sortBy = 'name'; sortDropdownOpen = false; }}
          >
            Campaign Title
          </button>
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
  <div class="breach-cards-container">
    {#if filteredTasks.length === 0}
      <div class="empty-state">
        <AlertTriangle size={42} class="empty-breach-icon" />
        <p>No breached campaigns found.</p>
        <span class="empty-sub">All operational deadlines are currently intact and on schedule.</span>
      </div>
    {:else}
      {#each filteredTasks as task (task.id)}
        {@const daysLeft = ChronosMath.daysRemaining(task.deadline)}
        {@const overdueDays = daysLeft < 0 ? Math.abs(daysLeft) : 0}
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
          <span class="priority-bar {(task.priority || 'Medium').toLowerCase() === 'critical' ? 'high' : (task.priority || 'Medium').toLowerCase()}"></span>
          
          <div class="card-main-flow">
            <!-- Top Header: Initiated / Origin on left, Overdue Days & Priority Pill on right -->
            <div class="card-header-top">
              <span class="meta-date"><Calendar size={12} /> {task.initiated_at ? `Initiated: ${task.initiated_at}` : task.origin_date ? `Origin: ${task.origin_date}` : 'BREACH'}</span>
              
              <div class="header-pills-right">
                <!-- Overdue Days Pill with Prominent Deadline Date -->
                <div class="days-pill overdue" class:breach-amber={overdueDays >= 1 && overdueDays <= 3} class:breach-orange={overdueDays >= 4 && overdueDays <= 7} class:breach-red={overdueDays > 7}>
                  <AlertTriangle size={13} />
                  <span class="pill-status">{overdueDays} DAYS OVERDUE</span>
                  {#if task.deadline}
                    <span class="pill-divider">•</span>
                    <span class="deadline-text">DEADLINE: {task.deadline}</span>
                  {/if}
                </div>

                <!-- Priority Status Badge -->
                <span class="badge-tactical badge-{(task.priority || 'Medium').toLowerCase() === 'critical' ? 'high' : (task.priority || 'Medium').toLowerCase()}">
                  {task.priority === 'Critical' ? 'High' : (task.priority || 'Medium').toUpperCase()}
                </span>
              </div>
            </div>

            <!-- Campaign Title: 100% Full Width, Large, Unrestricted Breathing Room -->
            <h3 class="card-title">
              {#each getTitleParts(task.title) as part}
                {#if part.highlight}
                  <mark class="search-highlight">{part.text}</mark>
                {:else}
                  {part.text}
                {/if}
              {/each}
            </h3>

            <!-- Tags: Fluid Dynamic Wrap across Multiple Rows -->
            {#if task.tags && task.tags.length > 0}
              <div class="tags-row">
                {#each task.tags as tag}
                  <span class="tag"><TagIcon size={11} /> {tag.tag_name}</span>
                {/each}
              </div>
            {/if}

            <!-- Bottom Progress Track: Full Width, Non-Congested -->
            <div class="card-progress-footer">
              <div class="progress-bar-track">
                <div class="progress-bar-fill" style="width: {pct}%"></div>
              </div>
              <span class="progress-pct-label">{pct}% • {completedSubtasks} of {totalSubtasks} subtasks</span>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>

</div>

<!-- Task Detail Centered Modal Window -->
{#if selectedTask}
  <BreachTaskWindow task={selectedTask} onClose={closeDetail} />
{/if}

<style>
  .breach-root {
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
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
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
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
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
  .sort-dir-btn:hover { background: rgba(239, 68, 68, 0.20); border-color: rgba(239, 68, 68, 0.40); color: #fca5a5; }

  .btn-search-clear {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.10);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: #fca5a5;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
    padding: 0;
  }
  .btn-search-clear:hover {
    background: rgba(239, 68, 68, 0.25);
    border-color: rgba(239, 68, 68, 0.60);
    color: #fee2e2;
    transform: translateY(-50%) scale(1.1);
  }

  .breach-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: transparent;
    overflow: hidden;
    position: relative;
    user-select: none;
  }

  /* ── AUTO-EXPANDING DYNAMIC TASK CARDS (NATURAL FLOW & ZERO CUTOFF) ── */
  .breach-cards-container {
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .task-card {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    flex-shrink: 0;
    height: auto;
    min-height: 110px;
    background: rgba(18, 12, 22, 0.95);
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: 18px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.15s ease, background 0.15s ease;
    width: 100%;
    box-sizing: border-box;
  }
  .task-card:hover {
    border-color: rgba(239, 68, 68, 0.75);
    background: rgba(32, 16, 26, 0.98);
    transform: translateY(-2px);
    box-shadow: 0 14px 36px rgba(0,0,0,0.55), 0 0 28px rgba(239, 68, 68, 0.35);
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

  .priority-bar { width: 5px; flex-shrink: 0; display: block; align-self: stretch; }
  .priority-bar.high   { background: linear-gradient(180deg, #ef4444, #dc2626); }
  .priority-bar.medium { background: linear-gradient(180deg, #f59e0b, #d97706); }
  .priority-bar.low    { background: linear-gradient(180deg, #3b82f6, #2563eb); }

  .card-main-flow {
    flex: 1 1 auto;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    height: auto;
    box-sizing: border-box;
  }

  .card-header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    flex-shrink: 0;
  }
  .meta-date { display: flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 700; color: #f87171; letter-spacing: 0.02em; flex-shrink: 0; }

  .header-pills-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .days-pill.overdue {
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    padding: 5px 13px; border-radius: 99px; font-size: 11.5px; font-weight: 800;
    color: #f87171; background: rgba(239, 68, 68, 0.22); border: 1px solid rgba(239, 68, 68, 0.55);
    white-space: nowrap; flex-shrink: 0;
  }
  .days-pill.breach-amber {
    background: rgba(245, 158, 11, 0.15);
    border-color: rgba(245, 158, 11, 0.50);
    color: #fde68a;
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.20);
  }
  .days-pill.breach-orange {
    background: rgba(249, 115, 22, 0.18);
    border-color: rgba(249, 115, 22, 0.55);
    color: #fed7aa;
    box-shadow: 0 0 12px rgba(249, 115, 22, 0.25);
  }
  .days-pill.breach-red {
    background: rgba(239, 68, 68, 0.22);
    border-color: rgba(239, 68, 68, 0.65);
    color: #fecaca;
    box-shadow: 0 0 14px rgba(239, 68, 68, 0.30);
    animation: breach-pulse 2.5s ease-in-out infinite;
  }
  @keyframes breach-pulse {
    0%, 100% { box-shadow: 0 0 14px rgba(239, 68, 68, 0.30); }
    50% { box-shadow: 0 0 22px rgba(239, 68, 68, 0.55); }
  }
  .pill-status { font-weight: 900; letter-spacing: 0.04em; }
  .pill-divider { opacity: 0.5; font-size: 10px; }
  .deadline-text { font-size: 11.5px; font-weight: 800; opacity: 0.95; letter-spacing: 0.03em; }

  .card-title {
    font-size: 16.5px;
    font-weight: 800;
    line-height: 1.65;
    color: #f8fafc;
    letter-spacing: 0.015em;
    word-spacing: 0.04em;
    word-break: break-word;
    white-space: normal;
    margin: 2px 0;
    flex-shrink: 0;
  }

  :global(.search-highlight) {
    background: rgba(245, 158, 11, 0.35);
    color: #fef3c7;
    padding: 0 2px;
    border-radius: 2px;
  }

  .tags-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 2px;
    flex-shrink: 0;
  }
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.03em;
    color: #fca5a5;
    background: rgba(239,68,68,0.12);
    padding: 3px 10px;
    border-radius: 99px;
    border: 1px solid rgba(239,68,68,0.22);
    transition: all 0.15s ease;
    flex-shrink: 0;
  }

  /* ── BOTTOM PROGRESS TRACK (FULL WIDTH & CLEAN) ── */
  .card-progress-footer {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 4px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
    width: 100%;
    box-sizing: border-box;
    flex-shrink: 0;
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
    background: linear-gradient(90deg, #ef4444 0%, #ec4899 50%, #f59e0b 100%);
    border-radius: 99px;
    transition: width 0.3s ease;
  }

  .progress-pct-label {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.03em;
    color: #fca5a5;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .empty-state {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 10px; padding: 80px 20px;
    color: var(--text-dim); text-align: center;
  }
  :global(.empty-breach-icon) { color: rgba(239, 68, 68, 0.45); }
</style>
