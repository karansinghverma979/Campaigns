<script>
  import { store } from '../../lib/store.svelte.js';
  import { onDestroy } from 'svelte';
  import { ChronosMath } from '../../lib/ChronosMath.js';
  import { 
    CheckCircle2, XCircle, Search, ChevronDown, ArrowUp, ArrowDown, 
    Tag as TagIcon, Calendar, Clock, CheckSquare, Square, Archive as ArchiveIcon, X, AlertTriangle
  } from 'lucide-svelte';
  import ArchiveTaskWindow from './ArchiveTaskView/ArchiveTaskWindow.svelte';

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
  let sortBy         = $state('date'); // 'date' | 'name'
  let sortDir        = $state('desc'); // 'asc' | 'desc'
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
    ALL:    store.archiveTasks.length,
    High:   store.archiveTasks.filter(t => t.priority === 'High' || t.priority === 'Critical').length,
    Medium: store.archiveTasks.filter(t => t.priority === 'Medium').length,
    Low:    store.archiveTasks.filter(t => t.priority === 'Low').length
  });

  // Extract all unique tag names from Archive tasks
  const availableTags = $derived.by(() => {
    const tagSet = new Set();
    store.archiveTasks.forEach(task => {
      if (task.tags && Array.isArray(task.tags)) {
        task.tags.forEach(t => {
          if (t.tag_name) tagSet.add(t.tag_name);
        });
      }
    });
    return Array.from(tagSet).sort();
  });

  // Dynamic filtered tasks array
  const filteredTasks = $derived.by(() => {
    let result = store.archiveTasks.filter(t => {
      // Priority filter
      if (filterPriority === 'High') {
        if (t.priority !== 'High' && t.priority !== 'Critical') return false;
      } else if (filterPriority !== 'ALL') {
        if (t.priority !== filterPriority) return false;
      }

      // Search query filter (matches title, tags, or debrief end note)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = t.title ? t.title.toLowerCase().includes(q) : false;
        const tagMatch = t.tags && t.tags.some(tg => tg && tg.tag_name && tg.tag_name.toLowerCase().includes(q));
        const endNoteMatch = t.end_note ? t.end_note.toLowerCase().includes(q) : false;
        if (!titleMatch && !tagMatch && !endNoteMatch) return false;
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
      if (sortBy === 'date') {
        const dateA = a.ended_date || a.initiated_at || a.origin_date || '';
        const dateB = b.ended_date || b.initiated_at || b.origin_date || '';
        const parsedA = ChronosMath.parseDate(dateA);
        const parsedB = ChronosMath.parseDate(dateB);
        const timeA = parsedA ? parsedA.getTime() : 0;
        const timeB = parsedB ? parsedB.getTime() : 0;
        comparison = timeA - timeB;
      } else if (sortBy === 'name') {
        const aTitle = (a.title || '');
        const bTitle = (b.title || '');
        comparison = aTitle.localeCompare(bTitle, undefined, { sensitivity: 'base', numeric: true });
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

  // Split into 2 portions: Aborted & Victory
  const abortedTasks = $derived(filteredTasks.filter(t => t.stage === 'Aborted'));
  const victoryTasks = $derived(filteredTasks.filter(t => t.stage === 'Victory'));

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

<div class="archive-root">
  
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
        placeholder="Search archived campaigns by title or tag..." 
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
            class:active={sortBy === 'date'}
            onclick={() => { sortBy = 'date'; sortDropdownOpen = false; }}
          >
            Ended Date
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

  <!-- ── 2 PORTIONS LAYOUT: LEFT SIDE ABORTED | RIGHT SIDE VICTORIES ── -->
  <div class="archive-split-body">
    
    <!-- LEFT PORTION: ABORTED CAMPAIGNS -->
    <div class="archive-panel panel-aborted">
      <div class="archive-panel-header aborted">
        <XCircle size={17} class="panel-icon-aborted" />
        <span class="panel-title">ABORTED CAMPAIGNS</span>
        <span class="panel-badge-count aborted">{abortedTasks.length}</span>
      </div>

      <div class="archive-cards-list">
        {#if abortedTasks.length === 0}
          <div class="empty-state-panel">
            <ArchiveIcon size={36} class="empty-archive-icon" />
            <span>No aborted campaigns logged in history.</span>
          </div>
        {:else}
          {#each abortedTasks as task (task.id)}

            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div 
              class="task-card aborted-card" 
              class:just-updated={store.highlightedTaskId === task.id}
              use:scrollIfHighlighted={store.highlightedTaskId === task.id}
              onclick={(e) => openDetail(task, e)}
            >
              <span class="priority-bar {(task.priority || 'Medium').toLowerCase() === 'critical' ? 'high' : (task.priority || 'Medium').toLowerCase()}"></span>
              
              <div class="card-main-flow">
                <!-- Top Header: Date on left, Priority Badge on right -->
                <div class="card-header-top">
                  <div class="header-left-meta">
                    <span class="meta-date ended"><Calendar size={12} /> Aborted: {task.ended_date || task.origin_date}</span>
                    {#if task.is_breached_extracted === 1 || task.is_breached_extracted === true}
                      <span class="badge-breach-extracted"><AlertTriangle size={11} /> BREACH EXTRACTED</span>
                    {/if}
                  </div>
                  <span class="badge-tactical badge-{(task.priority || 'Medium').toLowerCase() === 'critical' ? 'high' : (task.priority || 'Medium').toLowerCase()}">
                    {task.priority === 'Critical' ? 'High' : (task.priority || 'Medium').toUpperCase()}
                  </span>
                </div>

                <!-- Campaign Title: 100% Full Width, Large, Unrestricted Breathing Room -->
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <h3 
                  class="card-title clickable-title" 
                  ondblclick={(e) => { e.stopPropagation(); store.openStrategiesFile(task); }}
                  title="Double-click to open Markdown strategy note (.md)"
                >
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

                <!-- Debrief Snippet (Visible when search matches or debrief exists) -->
                {#if task.end_note}
                  <div class="debrief-snippet">
                    <span class="debrief-label">DEBRIEF NOTE</span>
                    <p class="debrief-text">
                      {#each getTitleParts(task.end_note) as part}
                        {#if part.highlight}
                          <mark class="search-highlight">{part.text}</mark>
                        {:else}
                          {part.text}
                        {/if}
                      {/each}
                    </p>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <!-- RIGHT PORTION: VICTORY CAMPAIGNS -->
    <div class="archive-panel panel-victory">
      <div class="archive-panel-header victory">
        <CheckCircle2 size={17} class="panel-icon-victory" />
        <span class="panel-title">VICTORY CAMPAIGNS</span>
        <span class="panel-badge-count victory">{victoryTasks.length}</span>
      </div>

      <div class="archive-cards-list">
        {#if victoryTasks.length === 0}
          <div class="empty-state-panel">
            <ArchiveIcon size={36} class="empty-archive-icon" />
            <span>No victory campaigns logged in history.</span>
          </div>
        {:else}
          {#each victoryTasks as task (task.id)}

            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div 
              class="task-card victory-card" 
              class:just-updated={store.highlightedTaskId === task.id}
              use:scrollIfHighlighted={store.highlightedTaskId === task.id}
              onclick={(e) => openDetail(task, e)}
            >
              <span class="priority-bar {(task.priority || 'Medium').toLowerCase() === 'critical' ? 'high' : (task.priority || 'Medium').toLowerCase()}"></span>
              
              <div class="card-main-flow">
                <!-- Top Header: Date on left, Priority Badge on right -->
                <div class="card-header-top">
                  <span class="meta-date victory-date"><Calendar size={12} /> Completed: {task.ended_date || task.origin_date}</span>
                  <span class="badge-tactical badge-{(task.priority || 'Medium').toLowerCase() === 'critical' ? 'high' : (task.priority || 'Medium').toLowerCase()}">
                    {task.priority === 'Critical' ? 'High' : (task.priority || 'Medium').toUpperCase()}
                  </span>
                </div>

                <!-- Campaign Title: 100% Full Width, Large, Unrestricted Breathing Room -->
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <h3 
                  class="card-title clickable-title" 
                  ondblclick={(e) => { e.stopPropagation(); store.openStrategiesFile(task); }}
                  title="Double-click to open Markdown strategy note (.md)"
                >
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

                <!-- Debrief Snippet (Visible when search matches or debrief exists) -->
                {#if task.end_note}
                  <div class="debrief-snippet victory">
                    <span class="debrief-label">DEBRIEF NOTE</span>
                    <p class="debrief-text">
                      {#each getTitleParts(task.end_note) as part}
                        {#if part.highlight}
                          <mark class="search-highlight">{part.text}</mark>
                        {:else}
                          {part.text}
                        {/if}
                      {/each}
                    </p>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>

  </div>

</div>

<!-- Task Detail Centered Modal Window -->
{#if selectedTask}
  <ArchiveTaskWindow task={selectedTask} onClose={() => selectedTask = null} />
{/if}

<style>
  .archive-root {
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

  .priority-group { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

  .pill-btn {
    display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px;
    font-size: 11.5px; font-weight: 800; letter-spacing: 0.04em; color: var(--text-muted);
    background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 9999px; transition: all 0.15s ease; cursor: pointer;
  }
  .pill-btn:hover { color: var(--text-main); background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.18); }
  .pill-btn.active { color: #ffffff; background: rgba(139, 92, 246, 0.22); border-color: rgba(139, 92, 246, 0.55); box-shadow: 0 0 12px rgba(139, 92, 246, 0.25); }
  .pill-btn.high.active { background: rgba(239, 68, 68, 0.28); border-color: rgba(239, 68, 68, 0.65); color: #fca5a5; }
  .pill-btn.medium.active { background: rgba(245, 158, 11, 0.28); border-color: rgba(245, 158, 11, 0.65); color: #fde68a; }
  .pill-btn.low.active { background: rgba(59, 130, 246, 0.28); border-color: rgba(59, 130, 246, 0.65); color: #93c5fd; }

  .pill-count-badge {
    display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px;
    padding: 0 5px; border-radius: 99px; font-size: 10px; font-weight: 900; background: rgba(255, 255, 255, 0.12); color: #ffffff; margin-left: 2px;
  }
  .pill-btn.active .pill-count-badge { background: rgba(255, 255, 255, 0.25); }

  .search-wrap { position: relative; flex: 1; display: flex; align-items: center; min-width: 140px; }
  :global(.search-icon) { position: absolute; left: 14px; color: var(--text-muted); pointer-events: none; }
  .search-input {
    width: 100%; padding: 8px 16px 8px 38px; font-size: 12.5px; font-weight: 700; color: var(--text-main);
    background: rgba(6, 10, 18, 0.85); border: 1px solid rgba(255,255,255,0.10); border-radius: 9999px; transition: all 0.15s ease; box-sizing: border-box;
  }
  .search-input:focus { border-color: rgba(139, 92, 246, 0.55); box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15); outline: none; }

  .dropdown-wrap { position: relative; flex-shrink: 0; }
  .dropdown-btn {
    display: flex; align-items: center; gap: 7px; padding: 8px 14px; font-size: 12px; font-weight: 700;
    color: var(--text-muted); background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.10); border-radius: 9999px; transition: all 0.15s ease; white-space: nowrap; cursor: pointer;
  }
  .dropdown-btn:hover { color: var(--text-main); background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18); }
  :global(.chevron) { transition: transform 0.15s ease; }
  :global(.chevron.open) { transform: rotate(180deg); }

  .dropdown-menu {
    position: absolute; top: calc(100% + 8px); right: 0; z-index: 99999; min-width: 190px; max-height: 260px; overflow-y: auto;
    background: rgba(12, 17, 30, 0.98); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(139, 92, 246, 0.35); border-radius: var(--radius-md); box-shadow: 0 16px 40px rgba(0,0,0,0.85); padding: 6px 0;
  }
  .dropdown-item { display: block; width: 100%; padding: 9px 16px; text-align: left; font-size: 12px; font-weight: 700; color: var(--text-muted); transition: all 0.12s ease; border: none; background: none; cursor: pointer; }
  .dropdown-item:hover { background: rgba(255,255,255,0.07); color: var(--text-main); }
  .dropdown-item.active { color: #ddd6fe; background: rgba(139, 92, 246, 0.22); font-weight: 800; }

  .dropdown-checkbox-item { display: flex; align-items: center; gap: 9px; padding: 8px 16px; font-size: 12px; font-weight: 700; color: var(--text-muted); cursor: pointer; transition: background 0.12s ease; }
  .dropdown-checkbox-item:hover { background: rgba(255,255,255,0.07); color: var(--text-main); }
  :global(.cb-icon) { color: var(--text-dim); }
  :global(.cb-icon.active) { color: #ddd6fe; }
  .cb-label { flex: 1; font-size: 12px; font-weight: 700; }
  .menu-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 4px 0; }

  .sort-dir-btn {
    width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.10); color: var(--text-muted); display: flex; align-items: center; justify-content: center; transition: all 0.15s ease; cursor: pointer; flex-shrink: 0;
  }
  .sort-dir-btn:hover { background: rgba(139, 92, 246, 0.20); border-color: rgba(139, 92, 246, 0.40); color: #ddd6fe; }

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

  .header-left-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .badge-breach-extracted {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.05em;
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.40);
    color: #fca5a5;
  }

  /* ── 2 PORTIONS SPLIT LAYOUT ── */
  .archive-split-body {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    padding: 20px;
    min-height: 0;
    overflow: hidden;
  }

  .archive-panel {
    display: flex;
    flex-direction: column;
    background: rgba(10, 15, 26, 0.65);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    overflow: hidden;
    min-height: 0;
  }

  .archive-panel-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
  }
  .archive-panel-header.aborted { background: rgba(239, 68, 68, 0.08); }
  .archive-panel-header.victory { background: rgba(52, 211, 153, 0.08); }

  :global(.panel-icon-aborted) { color: #f87171; }
  :global(.panel-icon-victory) { color: #34d399; }

  .panel-title {
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.10em;
    color: var(--text-main);
  }

  .panel-badge-count {
    margin-left: auto;
    font-size: 11px;
    font-weight: 900;
    padding: 2px 10px;
    border-radius: 99px;
  }
  .panel-badge-count.aborted { color: #f87171; background: rgba(239, 68, 68, 0.18); border: 1px solid rgba(239, 68, 68, 0.35); }
  .panel-badge-count.victory { color: #34d399; background: rgba(52, 211, 153, 0.18); border: 1px solid rgba(52, 211, 153, 0.35); }

  /* ── AUTO-EXPANDING DYNAMIC TASK CARDS (NATURAL FLOW & ZERO CUTOFF) ── */
  .archive-cards-list {
    flex: 1;
    overflow-y: auto;
    padding: 20px 22px;
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
    background: rgba(10, 16, 30, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.15s ease, background 0.15s ease;
    width: 100%;
    box-sizing: border-box;
  }
  .task-card.aborted-card:hover {
    border-color: rgba(239, 68, 68, 0.55);
    background: rgba(35, 18, 25, 0.98);
    transform: translateY(-2px);
    box-shadow: 0 14px 36px rgba(0,0,0,0.55), 0 0 28px rgba(239, 68, 68, 0.28);
  }
  .task-card.victory-card:hover {
    border-color: rgba(52, 211, 153, 0.55);
    background: rgba(14, 32, 28, 0.98);
    transform: translateY(-2px);
    box-shadow: 0 14px 36px rgba(0,0,0,0.55), 0 0 28px rgba(52, 211, 153, 0.28);
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
  .meta-date.ended { font-size: 11.5px; font-weight: 700; color: #f87171; letter-spacing: 0.02em; flex-shrink: 0; }
  .meta-date.victory-date { font-size: 11.5px; font-weight: 700; color: #34d399; letter-spacing: 0.02em; flex-shrink: 0; }

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

  :global(.search-highlight) { background: rgba(245, 158, 11, 0.35); color: #fef3c7; padding: 0 2px; border-radius: 2px; }

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
    color: #ddd6fe;
    background: rgba(139, 92, 246, 0.12);
    padding: 3px 10px;
    border-radius: 99px;
    border: 1px solid rgba(139, 92, 246, 0.22);
    flex-shrink: 0;
  }
  .archive-stage-stamp.victory { color: rgba(52, 211, 153, 0.75); }
  .archive-stage-stamp.aborted { color: rgba(239, 68, 68, 0.75); }

  /* Debrief note card snippet */
  .debrief-snippet {
    margin-top: 4px;
    padding: 8px 12px;
    border-radius: 12px;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.20);
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .debrief-snippet.victory {
    background: rgba(52, 211, 153, 0.08);
    border-color: rgba(52, 211, 153, 0.20);
  }
  .debrief-label {
    font-size: 9.5px;
    font-weight: 900;
    letter-spacing: 0.08em;
    word-spacing: 0.06em;
    color: var(--text-dim);
  }
  .debrief-text {
    font-size: 11.5px;
    font-weight: 600;
    line-height: 1.45;
    word-spacing: 0.04em;
    color: #cbd5e1;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .empty-state-panel {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 60px 16px; color: var(--text-dim); text-align: center; font-size: 12px; font-weight: 600;
  }
  :global(.empty-archive-icon) { color: rgba(255, 255, 255, 0.20); }
</style>
