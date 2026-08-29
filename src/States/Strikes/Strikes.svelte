<script>
  import { store } from '../../lib/store.svelte.js';
  import { ChronosMath, getFormattedDate } from '../../lib/ChronosMath.js';
  import { onDestroy, onMount } from 'svelte';
  import Calendar2X from '../../components/Calendar2X.svelte';
  import { 
    Zap, Calendar, Clock, Plus, Trash2, CheckCircle2, 
    AlertCircle, ChevronLeft, ChevronRight, Filter, 
    ListFilter, Layers, CheckSquare, Square, Edit3, X, Sparkles, ChevronDown, Check, AlertOctagon, Ban, RotateCw, Flame, Repeat,
    Star, BookOpen, Search, Package, Inbox, ArrowRight
  } from 'lucide-svelte';

  // Active View Mode: 'Day', '3 Days', 'Week', 'Schedule'
  let activeViewMode = $state('Day');
  
  // Temporal constants
  const past6MonthsDateStr = ChronosMath.formatDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000));
  let scheduleDaysCount = $state(15);

  // Date navigation state
  let selectedDateObj = $state(new Date());
  let newStrikeTitle = $state('');
  let newStrikePriority = $state('Medium');
  let newStrikeExecutionDate = $state(getFormattedDate());
  let isDatePickerOpen = $state(false);
  let isNavDatePickerOpen = $state(false);

  // Custom Dropdown Open States
  let openDropdown = $state(null); // 'mode', 'priority', 'status', 'conn', null

  // Search & Filter State
  let _searchRaw = $state('');
  let _searchTimer = null;
  let searchQuery = $state('');
  function handleSearchInput(v) {
    _searchRaw = v;
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => { searchQuery = v; }, 180);
  }
  onDestroy(() => {
    if (_searchTimer) clearTimeout(_searchTimer);
  });
  let filterPriority = $state('ALL');     // ALL, High, Medium, Low
  let filterStatuses = $state(['ALL']);   // Multi-select array: ['ALL'] or ['STANDBY', 'ENGAGED', etc.]
  let filterConnection = $state('ALL');   // ALL, INDEPENDENT, SUBTASK_LINKED

  // Multi-select status filter toggle logic
  function toggleStatusFilter(val) {
    if (val === 'ALL') {
      filterStatuses = ['ALL'];
      return;
    }
    let current = filterStatuses.filter(s => s !== 'ALL');
    if (current.includes(val)) {
      current = current.filter(s => s !== val);
    } else {
      current.push(val);
    }
    if (current.length === 0 || current.length === 5) {
      filterStatuses = ['ALL'];
    } else {
      filterStatuses = current;
    }
  }

  // Subtask Title Map for live card rendering
  let subtaskMap = $state({});

  async function loadSubtasksMap() {
    if (!window.electronAPI) return;
    if (window.electronAPI.getAllSubtasks) {
      try {
        const res = await window.electronAPI.getAllSubtasks();
        if (res && res.success && res.subtasks) {
          const newMap = {};
          for (const st of res.subtasks) {
            newMap[st.id] = st;
            newMap[String(st.id)] = st;
          }
          subtaskMap = newMap;
        }
      } catch (e) {
        console.error('Failed to load all subtasks:', e);
      }
    }
  }

  onMount(() => {
    loadSubtasksMap();
  });

  // Fetch subtask titles and campaign titles in a single bulk IPC query
  $effect(() => {
    if (store.tasks || store.strikes) {
      loadSubtasksMap();
    }
  });

  // Handle cross-tab navigation when redirected to a specific strike directive
  $effect(() => {
    const targetId = store.highlightedStrikeId;
    if (targetId && store.strikes && store.strikes.length > 0) {
      const targetStrike = store.strikes.find(s => s.id === targetId || Number(s.id) === Number(targetId));
      if (targetStrike) {
        // 1. Switch to Day view to show the complete directive in detail
        activeViewMode = 'Day';

        // 2. Parse execution_date and navigate selectedDateObj
        if (targetStrike.execution_date) {
          const parsed = ChronosMath.parseDate(targetStrike.execution_date);
          if (parsed && !isNaN(parsed.getTime())) {
            selectedDateObj = parsed;
          }
        }

        // 3. Clear any conflicting filters so the target strike is guaranteed to render
        if (filterPriority !== 'ALL' && targetStrike.priority !== filterPriority) {
          filterPriority = 'ALL';
        }
        if (filterStatuses.length > 0 && !filterStatuses.includes('ALL') && !filterStatuses.includes(targetStrike.status)) {
          filterStatuses = ['ALL'];
        }
        if (filterConnection === 'INDEPENDENT' && targetStrike.subtask_id) {
          filterConnection = 'ALL';
        }

        // 4. Smooth scroll to the strike card and highlight it
        setTimeout(() => {
          const cardEl = document.querySelector(`[data-strike-id="${targetId}"]`);
          if (cardEl) {
            cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 160);
      }
    }
  });

  // Edit Strike Modal State
  let editingStrike = $state(null);
  let editTitle = $state('');
  let editPriority = $state('Medium');
  let editExecutionDate = $state('');
  let editNotes = $state('');
  let editCampaignId = $state(null);
  let editSubtaskId = $state(null);
  let editAvailableSubtasks = $state([]);

  // Pending Resolution Modal State
  let isPendingModalOpen = $state(false);
  let activeRescheduleStrikeId = $state(null);
  let rescheduleDateInput = $state(getFormattedDate());
  let isReschedulePickerOpen = $state(false);

  // Custom Recurrence Modal State
  let recurrenceTargetStrike = $state(null);
  let recurrenceFreq = $state('Day'); // 'Day', 'Week', 'Month'
  let recurrenceInterval = $state(1);
  let recurrenceWeekDays = $state([0, 1, 2, 3, 4, 5, 6]); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  let recurrenceEndMode = $state('occurrences'); // 'occurrences' or 'date'
  let recurrenceOccurrences = $state(5);
  let recurrenceEndDate = $state(getFormattedDate());
  let isRecurrenceEndDatePickerOpen = $state(false);
  let recurrenceNumbering = $state(false); // When true: base→(0), copies→(1)(2)(3)...

  const weekDayOptions = [
    { day: 0, label: 'S' },
    { day: 1, label: 'M' },
    { day: 2, label: 'T' },
    { day: 3, label: 'W' },
    { day: 4, label: 'T' },
    { day: 5, label: 'F' },
    { day: 6, label: 'S' }
  ];

  function toggleRecurrenceWeekDay(dayNum) {
    if (recurrenceWeekDays.includes(dayNum)) {
      if (recurrenceWeekDays.length > 1) {
        recurrenceWeekDays = recurrenceWeekDays.filter(d => d !== dayNum);
      } else {
        store.showToast('At least one day must be selected for weekly recurrence.', 'warning');
      }
    } else {
      recurrenceWeekDays = [...recurrenceWeekDays, dayNum];
    }
  }
  // ── TACTICAL BLUEPRINTS (Strike Templates) ──
  let isBlueprintsOpen = $state(false);

  // All saved blueprints — filtered from the main strikes array by TEMPLATE status
  const allBlueprints = $derived(store.strikes.filter(s => s.status === 'TEMPLATE'));

  async function saveAsBlueprint(strike) {
    if (!strike || !strike.title) return;
    if (strike.recurrence_id) {
      store.showToast('Tactical Block: Recurring strikes cannot be saved as Blueprints.', 'warning');
      return;
    }
    const cleanTitle = strike.title.trim();
    const alreadyExists = allBlueprints.some(bp => (bp.title || '').toLowerCase().trim() === cleanTitle.toLowerCase());
    if (alreadyExists) {
      store.showToast(`Tactical Block: Blueprint "${cleanTitle}" already exists.`, 'warning');
      return;
    }
    const result = await store.createStrike({
      title: cleanTitle,
      execution_date: getFormattedDate(),
      priority: 'Low',
      status: 'TEMPLATE',
      notes: strike.notes || '',
      subtask_id: null,
      recurrence_id: null
    });
    if (result) {
      store.showToast(`📑 Blueprint saved: "${cleanTitle}"`, 'info');
    }
  }

  async function instantiateBlueprint(blueprint) {
    if (!blueprint) return;
    const result = await store.createStrike({
      title: blueprint.title,
      execution_date: getFormattedDate(),
      priority: 'Low',
      status: 'STANDBY',
      notes: blueprint.notes || '',
      subtask_id: null,
      recurrence_id: null
    });
    if (result) {
      store.showToast(`⚡ Blueprint instantiated as today's strike: "${blueprint.title}"`, 'info');
    }
  }

  async function deleteBlueprint(blueprintId) {
    const success = await store.deleteStrike(blueprintId);
    if (success) {
      store.showToast('🗑️ Blueprint removed.', 'info');
    }
  }

  // ── TACTICAL UNDATED DIRECTIVES HOLDING BAY ──
  let isUndatedModalOpen = $state(false);
  let activeDeployUndatedId = $state(null);
  let deployUndatedDateInput = $state(getFormattedDate());
  let isDeployUndatedPickerOpen = $state(false);
  let undatedSearchQuery = $state('');
  let undatedFilterPriority = $state('ALL');
  let isUndatedModeNew = $state(false);
  let isUndatedModeEdit = $state(false);

  // All undated strikes — filtered from the main strikes array by UNDATED status
  const allUndatedStrikes = $derived.by(() => {
    const list = store.strikes.filter(s => s.status === 'UNDATED');
    return [...list].sort((a, b) => getPriorityWeight(a.priority) - getPriorityWeight(b.priority));
  });

  const filteredUndatedStrikes = $derived.by(() => {
    let list = allUndatedStrikes;
    if (undatedFilterPriority !== 'ALL') {
      list = list.filter(s => s.priority === undatedFilterPriority);
    }
    if (undatedSearchQuery.trim()) {
      const q = undatedSearchQuery.toLowerCase().trim();
      list = list.filter(s => 
        (s.title || '').toLowerCase().includes(q) || 
        (s.notes || '').toLowerCase().includes(q)
      );
    }
    return list;
  });

  async function deployUndatedToToday(strikeId) {
    if (!strikeId) return;
    await store.deployUndatedStrike(strikeId, todayFormatted);
  }

  async function deployUndatedToDate(strikeId, targetDate) {
    if (!strikeId || !targetDate) return;
    const parsed = ChronosMath.parseDate(targetDate);
    if (!parsed) {
      store.showToast('Invalid target date for strike deployment.', 'warning');
      return;
    }
    const success = await store.deployUndatedStrike(strikeId, targetDate);
    if (success) {
      activeDeployUndatedId = null;
      isDeployUndatedPickerOpen = false;
    }
  }

  async function deleteUndatedStrike(strikeId) {
    if (!strikeId) return;
    const success = await store.deleteStrike(strikeId);
    if (success) {
      store.showToast('🗑️ Undated directive deleted from holding bay.', 'info');
    }
  }

  // Custom Recurrence Generator
  async function generateRecurrentStrikes() {
    if (!recurrenceTargetStrike) return;

    const baseStrike = recurrenceTargetStrike;

    // ── GUARD: strike already belongs to a recurrence group ──
    if (baseStrike.recurrence_id) {
      store.showToast(`Tactical Block: This strike is already part of recurrence group ${baseStrike.recurrence_id}.`, 'warning');
      recurrenceTargetStrike = null;
      return;
    }

    const baseDate = ChronosMath.parseDate(baseStrike.execution_date);
    if (!baseDate) {
      store.showToast('Invalid base execution date for recurrence.', 'warning');
      return;
    }

    // Strip any existing trailing " (N)" suffix from base title so numbering is always clean
    const cleanBaseName = recurrenceNumbering
      ? baseStrike.title.replace(/\s*\(\d+\)$/, '').trim()
      : baseStrike.title;

    const interval = Math.max(1, parseInt(recurrenceInterval, 10) || 1);
    const generatedDates = [];

    if (recurrenceEndMode === 'occurrences') {
      const targetCount = Math.max(1, parseInt(recurrenceOccurrences, 10) || 1);
      let curr = new Date(baseDate);
      let safetyCounter = 0;

      if (recurrenceFreq === 'Week') {
        curr.setDate(curr.getDate() + 1);
        while (generatedDates.length < targetCount && safetyCounter < 500) {
          const dayOfWeek = curr.getDay();
          if (recurrenceWeekDays.includes(dayOfWeek)) {
            generatedDates.push(ChronosMath.formatDate(curr));
          }
          curr.setDate(curr.getDate() + 1);
          safetyCounter++;
        }
      } else {
        for (let i = 1; i <= targetCount; i++) {
          const d = new Date(baseDate);
          if (recurrenceFreq === 'Day') {
            d.setDate(baseDate.getDate() + i * interval);
          } else if (recurrenceFreq === 'Month') {
            d.setMonth(baseDate.getMonth() + i * interval);
          }
          generatedDates.push(ChronosMath.formatDate(d));
        }
      }
    } else {
      const limitDate = ChronosMath.parseDate(recurrenceEndDate);
      if (!limitDate) {
        store.showToast('Invalid end date for recurrence.', 'warning');
        return;
      }
      let curr = new Date(baseDate);
      let safetyCounter = 0;

      if (recurrenceFreq === 'Week') {
        curr.setDate(curr.getDate() + 1);
        while (curr.getTime() <= limitDate.getTime() && safetyCounter < 500) {
          const dayOfWeek = curr.getDay();
          if (recurrenceWeekDays.includes(dayOfWeek)) {
            generatedDates.push(ChronosMath.formatDate(curr));
          }
          curr.setDate(curr.getDate() + 1);
          safetyCounter++;
        }
      } else {
        let step = 1;
        while (safetyCounter < 200) {
          const d = new Date(baseDate);
          if (recurrenceFreq === 'Day') {
            d.setDate(baseDate.getDate() + step * interval);
          } else if (recurrenceFreq === 'Month') {
            d.setMonth(baseDate.getMonth() + step * interval);
          }
          if (d.getTime() > limitDate.getTime()) break;
          generatedDates.push(ChronosMath.formatDate(d));
          step++;
          safetyCounter++;
        }
      }
    }

    // ── Pre-calculate how many copies will actually be created (non-duplicate) ──
    // We need this BEFORE creating anything so we can fetch the RC id with the correct total count
    const validDates = generatedDates.filter(dStr => {
      if (dStr === baseStrike.execution_date) return false;
      const copyTitle = recurrenceNumbering ? `${cleanBaseName} (1)` : baseStrike.title; // approximate for dup check
      return !store.strikes.some(s =>
        s.execution_date === dStr &&
        s.title.toLowerCase().trim() === (recurrenceNumbering ? `${cleanBaseName} (1)` : baseStrike.title).toLowerCase().trim()
      );
    });
    const totalCount = 1 + validDates.length; // base (1) + all non-duplicate copies

    // ── Fetch the next RC id from main process ──
    let rcId = null;
    if (window.electronAPI && window.electronAPI.getNextRcId) {
      const rcRes = await window.electronAPI.getNextRcId({ totalCount });
      if (rcRes && rcRes.success) rcId = rcRes.rcId;
    }

    // ── NUMBERING MODE: rename base strike to "Title (0)" + assign rcId ──
    if (recurrenceNumbering || rcId) {
      await store.updateStrike({
        id: baseStrike.id,
        title: recurrenceNumbering ? `${cleanBaseName} (0)` : baseStrike.title,
        execution_date: baseStrike.execution_date,
        priority: baseStrike.priority,
        status: baseStrike.status,
        notes: baseStrike.notes || '',
        subtask_id: baseStrike.subtask_id || null,
        recurrence_id: rcId
      });
    }

    // ── CREATE RECURRENCE COPIES ──
    let createdCount = 0;
    let duplicateCount = 0;
    let copyIndex = 1;

    for (const dStr of generatedDates) {
      if (dStr === baseStrike.execution_date) continue;

      const copyTitle = recurrenceNumbering
        ? `${cleanBaseName} (${copyIndex})`
        : baseStrike.title;

      const exists = store.strikes.some(s =>
        s.execution_date === dStr &&
        s.title.toLowerCase().trim() === copyTitle.toLowerCase().trim()
      );

      if (exists) {
        duplicateCount++;
        if (recurrenceNumbering) copyIndex++;
        continue;
      }

      const created = await store.createStrike({
        title: copyTitle,
        execution_date: dStr,
        priority: baseStrike.priority || 'Medium',
        status: 'STANDBY',
        notes: baseStrike.notes || null,
        subtask_id: baseStrike.subtask_id || null,
        recurrence_id: rcId
      });
      if (created) createdCount++;
      if (recurrenceNumbering) copyIndex++;
    }

    recurrenceTargetStrike = null;
    recurrenceNumbering = false;
    store.showToast(`⚡ Recurrence Engine: ${createdCount} strikes initialized · Group ${rcId || 'N/A'}${duplicateCount > 0 ? ` (${duplicateCount} duplicates skipped)` : ''}.`, 'info');
  }


  // ── Priority Sorting Hierarchy: High (1) -> Medium (2) -> Low (3) ──
  const PRIORITY_ORDER = { high: 1, medium: 2, low: 3 };
  function getPriorityWeight(priority) {
    if (!priority) return 2;
    const key = String(priority).toLowerCase().trim();
    return PRIORITY_ORDER[key] ?? 2;
  }

  // All Past Pending Strikes Across Entire System (Sorted: High -> Med -> Low)
  const allPendingStrikes = $derived.by(() => {
    const list = store.strikes.filter(s => s.status === 'PENDING');
    return [...list].sort((a, b) => getPriorityWeight(a.priority) - getPriorityWeight(b.priority));
  });

  const todayFormatted = getFormattedDate();

  // Mode Options (Day, 3 Days, Week, Schedule)
  const modeOptions = [
    { value: 'Day', label: 'Day' },
    { value: '3 Days', label: '3 Days' },
    { value: 'Week', label: 'Week' },
    { value: 'Schedule', label: 'Schedule' }
  ];

  // Priority Options
  const priorityOptions = [
    { value: 'ALL', label: 'All Priorities', color: '#94a3b8' },
    { value: 'High', label: 'High', color: '#fca5a5', icon: '🔴' },
    { value: 'Medium', label: 'Medium', color: '#fde047', icon: '🟡' },
    { value: 'Low', label: 'Low', color: '#93c5fd', icon: '🔵' }
  ];

  // Status Options
  const statusOptions = [
    { value: 'ALL', label: 'All Statuses', color: '#94a3b8' },
    { value: 'STANDBY', label: 'Standby', color: '#f59e0b', icon: '⚡' },
    { value: 'ENGAGED', label: 'Engaged', color: '#60a5fa', icon: '🔷' },
    { value: 'PENDING', label: 'Pending', color: '#ef4444', icon: '🛑' },
    { value: 'NEUTRALIZED', label: 'Neutralized', color: '#34d399', icon: '✅' },
    { value: 'ABORTED', label: 'Aborted', color: '#64748b', icon: '🚫' }
  ];

  // Connection Options
  const connOptions = [
    { value: 'ALL', label: 'All Connections', color: '#94a3b8' },
    { value: 'INDEPENDENT', label: 'Solo', color: '#7dd3fc', icon: '📌' },
    { value: 'SUBTASK_LINKED', label: 'Subtasks', color: '#c4b5fd', icon: '🔗' }
  ];

  // Derived selected option objects for dropdown triggers
  const currentPri = $derived(priorityOptions.find(p => p.value === filterPriority) || priorityOptions[0]);
  const currentStatusLabel = $derived.by(() => {
    if (filterStatuses.includes('ALL')) return 'All Statuses';
    if (filterStatuses.length === 1) {
      const match = statusOptions.find(s => s.value === filterStatuses[0]);
      return match ? `${match.icon ? match.icon + ' ' : ''}${match.label}` : '1 Status';
    }
    return `${filterStatuses.length} Statuses`;
  });
  const currentConn = $derived(connOptions.find(c => c.value === filterConnection) || connOptions[0]);

  // Helper view-mode-aware date navigation
  function changeDateOffset(direction) {
    const d = new Date(selectedDateObj);
    if (activeViewMode === 'Day') {
      d.setDate(d.getDate() + direction * 1);
    } else if (activeViewMode === '3 Days') {
      d.setDate(d.getDate() + direction * 3);
    } else if (activeViewMode === 'Week') {
      d.setDate(d.getDate() + direction * 7);
    } else if (activeViewMode === 'Schedule') {
      d.setMonth(d.getMonth() + direction * 1);
    } else {
      d.setDate(d.getDate() + direction * 7);
    }
    selectedDateObj = d;

    if (activeViewMode === 'Schedule') {
      setTimeout(() => {
        const targetDateStr = ChronosMath.formatDate(d);
        const targetCard = document.querySelector(`.schedule-group-card[data-date="${targetDateStr}"]`) || document.querySelector('.schedule-group-card.is-today');
        if (targetCard) {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  }

  function resetToToday() {
    selectedDateObj = new Date();
    newStrikeExecutionDate = todayFormatted;
    if (activeViewMode === 'Schedule') {
      setTimeout(() => {
        const targetCard = document.querySelector('.schedule-group-card.is-today');
        if (targetCard) {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  }

  const currentDateStr = $derived(ChronosMath.formatDate(selectedDateObj));

  // Dynamic View-Mode-Aware Navigation Display Label
  const navDisplayLabel = $derived.by(() => {
    const d = selectedDateObj;
    if (activeViewMode === 'Day') {
      return currentDateStr; // Full date e.g. "15-08-2026"
    } else if (activeViewMode === '3 Days') {
      const d1 = new Date(d);
      const d3 = new Date(d);
      d3.setDate(d.getDate() + 2);
      const start = ChronosMath.formatDate(d1).substring(0, 5);
      const end = ChronosMath.formatDate(d3);
      return `${start} → ${end}`;
    } else if (activeViewMode === 'Week') {
      // Calculate week number of the current month
      const dayOfMonth = d.getDate();
      const firstDayOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const firstDayWeekday = firstDayOfMonth.getDay(); // 0 = Sun
      const weekNum = Math.ceil((dayOfMonth + firstDayWeekday) / 7);
      const monthShort = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      return `Week ${weekNum} • ${monthShort}`;
    } else if (activeViewMode === 'Schedule') {
      const monthName = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      return `${monthName} ${d.getFullYear()}`;
    }
    return currentDateStr;
  });

  // Compute 7 Days of Current Week (Sunday to Saturday)
  const weekDays = $derived.by(() => {
    const current = new Date(selectedDateObj);
    const dayOfWeek = current.getDay(); // 0 = Sun
    const startOfWeek = new Date(current);
    startOfWeek.setDate(current.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = ChronosMath.formatDate(d);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      const dayNum = d.getDate();
      days.push({
        dateObj: d,
        dateStr,
        dayName,
        dayNum,
        isToday: dateStr === todayFormatted,
        isSelected: dateStr === currentDateStr,
        isSunday: i === 0,
        isSaturday: i === 6
      });
    }
    return days;
  });

  // Compute 3 Days (Selected Day, Next Day, Next-Next Day) relative to selectedDateObj
  const threeDays = $derived.by(() => {
    const current = new Date(selectedDateObj);
    const days = [];
    for (let i = 0; i <= 2; i++) {
      const d = new Date(current);
      d.setDate(current.getDate() + i);
      const dateStr = ChronosMath.formatDate(d);
      const label = i === 0 ? 'TARGET DAY' : i === 1 ? 'NEXT DAY' : 'DAY 3';
      days.push({
        dateObj: d,
        dateStr,
        label,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        dayNum: d.getDate(),
        isToday: dateStr === todayFormatted
      });
    }
    return days;
  });

  // Filtered Strikes derived (Search + Priority + Status + Subtask Connection + Exclude Past)
  const filteredStrikes = $derived.by(() => {
    // Exclude TEMPLATE blueprints & UNDATED directives from operational views — they live in their dedicated panels
    let list = store.strikes.filter(s => s.status !== 'TEMPLATE' && s.status !== 'UNDATED');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s => 
        s.title.toLowerCase().includes(q) || 
        (s.notes && s.notes.toLowerCase().includes(q)) ||
        (s.execution_date && s.execution_date.includes(q))
      );
    }

    if (filterPriority !== 'ALL') {
      list = list.filter(s => s.priority === filterPriority);
    }

    if (!filterStatuses.includes('ALL')) {
      list = list.filter(s => filterStatuses.includes(s.status));
    }

    if (filterConnection === 'INDEPENDENT') {
      list = list.filter(s => !s.subtask_id);
    } else if (filterConnection === 'SUBTASK_LINKED') {
      list = list.filter(s => !!s.subtask_id);
    }

    // Sort by Priority: High (top) -> Medium (middle) -> Low (bottom)
    return [...list].sort((a, b) => getPriorityWeight(a.priority) - getPriorityWeight(b.priority));
  });

  // View-Mode-Aware Filtered Strikes Count for Filter Bar Pill
  const activeFilteredStrikesCount = $derived.by(() => {
    if (activeViewMode === 'Day') {
      return (strikesByDate[currentDateStr] || []).length;
    } else if (activeViewMode === '3 Days') {
      let count = 0;
      threeDays.forEach(d => {
        count += (strikesByDate[d.dateStr] || []).length;
      });
      return count;
    } else if (activeViewMode === 'Week') {
      let count = 0;
      weekDays.forEach(d => {
        count += (strikesByDate[d.dateStr] || []).length;
      });
      return count;
    }
    return filteredStrikes.length;
  });

  // View-Mode-Aware Neutralized Directives Count
  const activeNeutralizedStrikesCount = $derived.by(() => {
    let visibleList = [];
    if (activeViewMode === 'Day') {
      visibleList = strikesByDate[currentDateStr] || [];
    } else if (activeViewMode === '3 Days') {
      threeDays.forEach(d => {
        visibleList = visibleList.concat(strikesByDate[d.dateStr] || []);
      });
    } else if (activeViewMode === 'Week') {
      weekDays.forEach(d => {
        visibleList = visibleList.concat(strikesByDate[d.dateStr] || []);
      });
    } else {
      visibleList = filteredStrikes;
    }
    return visibleList.filter(s => s.status === 'NEUTRALIZED').length;
  });

  // Dynamic Combat Velocity Ratio (Percentage)
  const activeCompletionRate = $derived(
    activeFilteredStrikesCount > 0 
      ? Math.round((activeNeutralizedStrikesCount / activeFilteredStrikesCount) * 100) 
      : 0
  );

  // ── Search Highlight Helpers ──
  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  const _searchRegex = $derived.by(() => {
    const q = searchQuery.trim();
    if (!q) return null;
    try { return new RegExp(`(${escapeRegExp(q)})`, 'gi'); } catch { return null; }
  });
  function getStrikeTitleParts(title) {
    if (!title) return [{ text: '', highlight: false }];
    if (!_searchRegex) return [{ text: title, highlight: false }];
    _searchRegex.lastIndex = 0;
    const parts = [];
    let lastIdx = 0;
    let match;
    while ((match = _searchRegex.exec(title)) !== null) {
      if (match.index > lastIdx) parts.push({ text: title.substring(lastIdx, match.index), highlight: false });
      parts.push({ text: match[0], highlight: true });
      lastIdx = _searchRegex.lastIndex;
      if (!match[0].length) { _searchRegex.lastIndex++; }
    }
    if (lastIdx < title.length) parts.push({ text: title.substring(lastIdx), highlight: false });
    return parts;
  }

  // Group Strikes by Execution Date
  const strikesByDate = $derived.by(() => {
    const map = {};
    filteredStrikes.forEach(s => {
      const dateKey = s.execution_date || 'NO DATE';
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(s);
    });
    return map;
  });

  // Dynamic Timeline for Schedule View starting from selectedDateObj (defaults to Today) for scheduleDaysCount days
  const scheduleTimeline = $derived.by(() => {
    if (activeViewMode !== 'Schedule') return [];

    const start = new Date(selectedDateObj);
    start.setHours(0, 0, 0, 0);

    const keys = [];
    for (let offset = 0; offset < scheduleDaysCount; offset++) {
      const d = new Date(start);
      d.setDate(start.getDate() + offset);
      keys.push(ChronosMath.formatDate(d));
    }

    return keys.map(dateStr => {
      const strikeList = strikesByDate[dateStr] || [];
      const parsed = ChronosMath.parseSubtaskDate('@' + dateStr);
      const isToday = dateStr === todayFormatted;
      const isPast = parsed ? parsed.isPast : false;

      let relativeLabel = '';
      if (isToday) relativeLabel = '★ TODAY';
      else if (isPast) relativeLabel = 'PAST DIRECTIVE';
      else {
        // Calculate days remaining
        const target = ChronosMath.parseDate(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (target) {
          const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          relativeLabel = diffDays === 1 ? 'TOMORROW' : `IN ${diffDays} DAYS`;
        }
      }

      return {
        dateStr,
        strikeList,
        isToday,
        isPast,
        relativeLabel
      };
    });
  });

  // Keyboard Shortcuts (Google Calendar style: D, W, M, Y, S, T + Arrow Left/Right)
  // --- Strike Card Keyboard Navigation ---
  let focusedStrikeId = $state(null);

  function getFocusableCards() {
    return Array.from(document.querySelectorAll('.day-strike-card'));
  }

  function clearStrikeFocus() {
    document.querySelectorAll('.day-strike-card.kb-focused').forEach(el => el.classList.remove('kb-focused'));
    focusedStrikeId = null;
  }

  function navigateStrikeCards(direction) {
    const cards = getFocusableCards();
    if (!cards.length) return;
    const currentIdx = cards.findIndex(c => c.classList.contains('kb-focused'));
    cards.forEach(c => c.classList.remove('kb-focused'));
    let nextIdx;
    if (currentIdx === -1) {
      nextIdx = direction > 0 ? 0 : cards.length - 1;
    } else {
      nextIdx = currentIdx + direction;
      if (nextIdx < 0) nextIdx = cards.length - 1;
      if (nextIdx >= cards.length) nextIdx = 0;
    }
    const target = cards[nextIdx];
    if (target) {
      target.classList.add('kb-focused');
      focusedStrikeId = target.dataset.strikeId ? parseInt(target.dataset.strikeId) : null;
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function getStrikeFromFocusedCard() {
    const card = document.querySelector('.day-strike-card.kb-focused');
    if (!card || !card.dataset.strikeId) return null;
    const id = parseInt(card.dataset.strikeId);
    return store.strikes.find(s => s.id === id) || null;
  }

  function handleKeyDown(e) {
    const active = document.activeElement;
    const isInputFocused = active && (
      active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable
    );
    if (isInputFocused) return;

    // Escape: close any open modal first, else clear card focus
    if (e.key === 'Escape') {
      if (editingStrike) { editingStrike = null; return; }
      if (store.isStrikeModalOpen) { store.isStrikeModalOpen = false; return; }
      if (isUndatedModalOpen) { isUndatedModalOpen = false; return; }
      if (isBlueprintsOpen) { isBlueprintsOpen = false; return; }
      if (isPendingModalOpen) { isPendingModalOpen = false; return; }
      if (recurrenceTargetStrike) { recurrenceTargetStrike = null; return; }
      clearStrikeFocus();
      return;
    }

    if (editingStrike || store.isStrikeModalOpen || isUndatedModalOpen || isBlueprintsOpen || isPendingModalOpen || recurrenceTargetStrike) return;

    // Arrow Left / Right: navigate dates (not when a card is focused to avoid conflict)
    if (e.key === 'ArrowLeft' && !focusedStrikeId) {
      changeDateOffset(-1);
      return;
    }
    if (e.key === 'ArrowRight' && !focusedStrikeId) {
      changeDateOffset(1);
      return;
    }

    const key = e.key.toLowerCase();

    // View mode switching
    if (key === 'd' && !e.ctrlKey && !e.metaKey) { activeViewMode = 'Day'; clearStrikeFocus(); return; }
    if (key === 'w' && !e.ctrlKey && !e.metaKey) { activeViewMode = 'Week'; clearStrikeFocus(); return; }
    if (key === '3') { activeViewMode = '3 Days'; clearStrikeFocus(); return; }
    if (key === 's' && !e.ctrlKey && !e.metaKey && !e.shiftKey) { activeViewMode = 'Schedule'; clearStrikeFocus(); return; }
    if (key === 't' && !e.ctrlKey && !e.metaKey) { resetToToday(); return; }

    // N — open new strike directive creation modal
    if (key === 'n' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      store.isStrikeModalOpen = true;
      return;
    }

    // Card navigation: J / K / Arrow keys (in Day view)
    if (activeViewMode === 'Day') {
      if (key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); navigateStrikeCards(1); return; }
      if (key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); navigateStrikeCards(-1); return; }

      const focused = getStrikeFromFocusedCard();

      // Space — toggle status of focused card
      if (e.key === ' ' && focused) {
        e.preventDefault();
        toggleStatus(focused, null);
        return;
      }

      // Enter or E — open edit modal for focused card
      if ((e.key === 'Enter' || key === 'e') && focused) {
        e.preventDefault();
        openEditModal(focused, null);
        return;
      }

      // Delete or X — delete focused card if STANDBY, or abort if ENGAGED/PENDING
      if ((e.key === 'Delete' || key === 'x') && focused) {
        e.preventDefault();
        if (focused.status === 'STANDBY') {
          const confirmed = window.confirm(`Delete strike "${focused.title}"? This cannot be undone.`);
          if (confirmed) {
            handleDelete(focused.id, null);
            clearStrikeFocus();
          }
        } else if (focused.status === 'ENGAGED' || focused.status === 'PENDING') {
          const confirmed = window.confirm(`Abort active strike "${focused.title}"?`);
          if (confirmed) {
            handleAbortStrike(focused.id, null);
            clearStrikeFocus();
          }
        } else if (focused.status === 'NEUTRALIZED') {
          store.showToast('Tactical Lock: Completed/Neutralized strike is finished and cannot be deleted or aborted.', 'warning');
        } else {
          store.showToast('Tactical Lock: Strike directive is already ABORTED.', 'warning');
        }
        return;
      }
    }
  }

  // Global click & focus listener to auto-collapse custom dropdowns
  function handleWindowClick(e) {
    const target = e.target;
    if (!target.closest('.custom-dd-wrap') && !target.closest('.nav-calendar-wrap') && !target.closest('.date-picker-wrap')) {
      openDropdown = null;
      isNavDatePickerOpen = false;
      isDatePickerOpen = false;
    }
  }

  function toggleDropdown(name, e) {
    if (e) e.stopPropagation();
    if (openDropdown === name) {
      openDropdown = null;
    } else {
      openDropdown = name;
      isNavDatePickerOpen = false;
      isDatePickerOpen = false;
    }
  }

  function focusTitleInput(node) {
    setTimeout(() => {
      node.focus();
      node.select?.();
    }, 50);
  }

  let liveStrikeFeedbackNew = $state({ priority: null, date: null, isPast: false, isUndated: false });
  let liveStrikeFeedbackEdit = $state({ priority: null, date: null, isPast: false, isUndated: false });

  let ghostSuggestionNew = $state({ suffix: '', full: '', partial: '' });
  let ghostSuggestionEdit = $state({ suffix: '', full: '', partial: '' });

  const SMART_SUGGESTION_CATALOG = [
    '#High', '#Med', '#Low',
    '@floating', '@undated', '@today', '@tom', '@nextmon', '@nextfri', '@unplanned'
  ];

  function computeGhostSuggestion(text) {
    if (!text) return { suffix: '', full: '', partial: '' };
    const match = text.match(/(?:^|\s)([@#][a-zA-Z0-9]*)$/);
    if (!match) return { suffix: '', full: '', partial: '' };
    
    const partial = match[1];
    if (partial.length < 1) return { suffix: '', full: '', partial: '' };

    const found = SMART_SUGGESTION_CATALOG.find(cand => 
      cand.toLowerCase().startsWith(partial.toLowerCase()) && cand.toLowerCase() !== partial.toLowerCase()
    );

    if (found) {
      const suffix = found.slice(partial.length);
      return { suffix, full: found, partial };
    }
    return { suffix: '', full: '', partial: '' };
  }

  function acceptGhostSuggestion(isEdit = false) {
    const ghost = isEdit ? ghostSuggestionEdit : ghostSuggestionNew;
    if (!ghost.suffix || !ghost.full) return false;
    
    if (isEdit) {
      const lastIndex = (editTitle || '').lastIndexOf(ghost.partial);
      if (lastIndex !== -1) {
        editTitle = editTitle.slice(0, lastIndex) + ghost.full + ' ';
        ghostSuggestionEdit = { suffix: '', full: '', partial: '' };
        handleStrikeTitleInput(editTitle, true);
        return true;
      }
    } else {
      const lastIndex = (newStrikeTitle || '').lastIndexOf(ghost.partial);
      if (lastIndex !== -1) {
        newStrikeTitle = newStrikeTitle.slice(0, lastIndex) + ghost.full + ' ';
        ghostSuggestionNew = { suffix: '', full: '', partial: '' };
        handleStrikeTitleInput(newStrikeTitle, false);
        return true;
      }
    }
    return false;
  }

  function cleanStrikeTitle(rawTitle, parsedDate) {
    let cleaned = rawTitle || '';
    if (parsedDate && parsedDate.allMatchedTexts && parsedDate.allMatchedTexts.length > 0) {
      for (const m of parsedDate.allMatchedTexts) {
        cleaned = cleaned.replaceAll(m, '');
      }
    } else if (parsedDate && parsedDate.matchedText) {
      cleaned = cleaned.replaceAll(parsedDate.matchedText, '');
    }
    // Remove all remaining @date tokens that resolve to valid date tokens
    cleaned = cleaned.replace(/@([a-zA-Z0-9+]+(?:[-/.][a-zA-Z0-9]+)*)\b/g, (match) => {
      return ChronosMath.parseSingleDateToken(match) ? '' : match;
    });
    // Strip @undated / @unplanned / @floating / @float / @later / @none tags
    cleaned = cleaned.replace(/@(?:undated|unplanned|floating|float|later|none)\b/gi, '');
    cleaned = cleaned.replace(/#(?:high|med|medium|low)\b/gi, '');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
  }

  function handleStrikeTitleInput(val, isEdit = false) {
    const isUndatedTag = /@(?:undated|unplanned|floating|float|later|none)\b/i.test(val);

    if (isEdit) {
      editTitle = val;
      const priMatches = Array.from(val.matchAll(/#(high|med|medium|low)\b/gi));
      if (priMatches.length > 0) {
        const lastPri = priMatches[priMatches.length - 1][1].toLowerCase();
        if (lastPri === 'high') { editPriority = 'High'; liveStrikeFeedbackEdit.priority = 'High'; }
        else if (lastPri === 'med' || lastPri === 'medium') { editPriority = 'Medium'; liveStrikeFeedbackEdit.priority = 'Medium'; }
        else if (lastPri === 'low') { editPriority = 'Low'; liveStrikeFeedbackEdit.priority = 'Low'; }
      } else {
        liveStrikeFeedbackEdit.priority = null;
      }

      if (isUndatedTag) {
        isUndatedModeEdit = true;
        liveStrikeFeedbackEdit.isUndated = true;
        liveStrikeFeedbackEdit.date = null;
        liveStrikeFeedbackEdit.isPast = false;
      } else {
        liveStrikeFeedbackEdit.isUndated = isUndatedModeEdit;
        const parsed = ChronosMath.parseSubtaskDate(val);
        if (parsed) {
          liveStrikeFeedbackEdit.date = parsed.dateStr;
          liveStrikeFeedbackEdit.isPast = Boolean(parsed.isPast);
          if (!parsed.isPast && !isUndatedModeEdit) {
            editExecutionDate = parsed.dateStr;
          }
        } else {
          liveStrikeFeedbackEdit.date = null;
          liveStrikeFeedbackEdit.isPast = false;
        }
      }
      ghostSuggestionEdit = computeGhostSuggestion(val);
    } else {
      newStrikeTitle = val;
      const priMatches = Array.from(val.matchAll(/#(high|med|medium|low)\b/gi));
      if (priMatches.length > 0) {
        const lastPri = priMatches[priMatches.length - 1][1].toLowerCase();
        if (lastPri === 'high') { newStrikePriority = 'High'; liveStrikeFeedbackNew.priority = 'High'; }
        else if (lastPri === 'med' || lastPri === 'medium') { newStrikePriority = 'Medium'; liveStrikeFeedbackNew.priority = 'Medium'; }
        else if (lastPri === 'low') { newStrikePriority = 'Low'; liveStrikeFeedbackNew.priority = 'Low'; }
      } else {
        liveStrikeFeedbackNew.priority = null;
      }

      if (isUndatedTag) {
        isUndatedModeNew = true;
        liveStrikeFeedbackNew.isUndated = true;
        liveStrikeFeedbackNew.date = null;
        liveStrikeFeedbackNew.isPast = false;
      } else {
        liveStrikeFeedbackNew.isUndated = isUndatedModeNew;
        const parsed = ChronosMath.parseSubtaskDate(val);
        if (parsed) {
          liveStrikeFeedbackNew.date = parsed.dateStr;
          liveStrikeFeedbackNew.isPast = Boolean(parsed.isPast);
          if (!parsed.isPast && !isUndatedModeNew) {
            newStrikeExecutionDate = parsed.dateStr;
          }
        } else {
          liveStrikeFeedbackNew.date = null;
          liveStrikeFeedbackNew.isPast = false;
        }
      }
      ghostSuggestionNew = computeGhostSuggestion(val);
    }
  }

  async function handleAddStrike(e) {
    if (e) e.preventDefault();
    if (!newStrikeTitle.trim()) return;

    const priMatches = Array.from(newStrikeTitle.matchAll(/#(high|med|medium|low)\b/gi));
    if (priMatches.length > 0) {
      const lastPri = priMatches[priMatches.length - 1][1].toLowerCase();
      if (lastPri === 'high') newStrikePriority = 'High';
      else if (lastPri === 'med' || lastPri === 'medium') newStrikePriority = 'Medium';
      else if (lastPri === 'low') newStrikePriority = 'Low';
    }

    const isUndatedTag = /@(?:undated|unplanned|floating|float|later|none)\b/i.test(newStrikeTitle);
    const effectiveIsUndated = isUndatedModeNew || isUndatedTag;

    const parsedDate = effectiveIsUndated ? null : ChronosMath.parseSubtaskDate(newStrikeTitle);
    if (parsedDate && parsedDate.isPast) {
      store.showToast('Tactical Block: Cannot schedule a Strike on a past date.', 'warning');
      return;
    }

    const targetExecutionDate = effectiveIsUndated ? '' : ((parsedDate && !parsedDate.isPast) ? parsedDate.dateStr : (newStrikeExecutionDate || todayFormatted));
    const cleaned = cleanStrikeTitle(newStrikeTitle, parsedDate);
    const finalTitle = cleaned || newStrikeTitle.trim();

    // Title Uniqueness Lock
    if (effectiveIsUndated) {
      const duplicate = store.strikes.find(s => 
        s.status === 'UNDATED' && 
        s.title.toLowerCase().trim() === finalTitle.toLowerCase().trim()
      );
      if (duplicate) {
        store.showToast(`Tactical Block: An Undated Strike named "${finalTitle}" already exists in the holding bay.`, 'warning');
        return;
      }
    } else {
      const duplicate = store.strikes.find(s => 
        s.execution_date === targetExecutionDate && 
        s.status !== 'UNDATED' &&
        s.title.toLowerCase().trim() === finalTitle.toLowerCase().trim()
      );
      if (duplicate) {
        store.showToast(`Tactical Block: A Strike named "${finalTitle}" already exists on ${targetExecutionDate}.`, 'warning');
        return;
      }
    }

    // Campaign-without-subtask guard: if a campaign is selected, a subtask must also be selected
    if (editCampaignId && !editSubtaskId) {
      store.showToast('Tactical Block: Selecting a Campaign requires choosing a specific Subtask.', 'warning');
      return;
    }

    const targetSubtaskId = editSubtaskId ? parseInt(editSubtaskId, 10) : null;
    const targetNotes = editNotes ? editNotes.trim() : '';

    const created = await store.createStrike({
      title: finalTitle,
      execution_date: targetExecutionDate,
      priority: newStrikePriority,
      status: effectiveIsUndated ? 'UNDATED' : 'STANDBY',
      notes: targetNotes,
      subtask_id: targetSubtaskId
    });

    if (created) {
      newStrikeTitle = '';
      editNotes = '';
      editCampaignId = null;
      editSubtaskId = null;
      isUndatedModeNew = false;
      liveStrikeFeedbackNew = { priority: null, date: null, isPast: false, isUndated: false };
      await loadSubtasksMap();
      if (effectiveIsUndated) {
        store.showToast(`📦 Directive saved to Undated Holding Bay: "${finalTitle}"`, 'info');
      }
    }
  }


  async function toggleStatus(strike, e) {
    if (e) e.stopPropagation();

    // Once NEUTRALIZED or ABORTED or TEMPLATE or UNDATED, handle accordingly
    if (strike.status === 'NEUTRALIZED' || strike.status === 'ABORTED' || strike.status === 'TEMPLATE') {
      store.showToast(`Tactical Lock: Strike directive is ${strike.status} and cannot be altered.`, 'warning');
      return;
    }

    if (strike.status === 'UNDATED') {
      store.showToast('Tactical Block: Undated Strikes must be scheduled to Today or a target date first.', 'warning');
      isUndatedModalOpen = true;
      return;
    }

    // PENDING Strike Lock: Pending strikes can ONLY be resolved in the Pending Reschedule Window
    if (strike.status === 'PENDING') {
      store.showToast('Tactical Block: Pending Strikes can only be resolved via the Pending Directives window.', 'warning');
      isPendingModalOpen = true;
      return;
    }

    const parsed = ChronosMath.parseSubtaskDate('@' + strike.execution_date);
    if (!parsed) {
      store.showToast('Tactical Block: Invalid execution date.', 'warning');
      return;
    }
    
    // Future date lock rule: Cannot change status of future strikes (must remain STANDBY)
    if (parsed.dateStr !== todayFormatted && !parsed.isPast) {
      store.showToast('Tactical Block: Future Strikes are locked in STANDBY until execution date.', 'warning');
      return;
    }

    // Disallow editing past strikes
    if (parsed.isPast) {
      store.showToast('Tactical Block: Past Strikes are locked & cannot be modified.', 'warning');
      return;
    }

    let nextStatus = 'STANDBY';
    if (strike.status === 'STANDBY') nextStatus = 'ENGAGED';
    else if (strike.status === 'ENGAGED') nextStatus = 'NEUTRALIZED';

    await store.updateStrikeStatus(strike.id, nextStatus);
  }

  async function openEditModal(strike, e) {
    if (e) e.stopPropagation();

    if (strike.status === 'NEUTRALIZED' || strike.status === 'ABORTED') {
      store.showToast(`Tactical Lock: Strike directive is ${strike.status} and cannot be modified.`, 'warning');
      return;
    }

    // S-02: Snapshot a plain copy — prevents live reactive mutations
    editingStrike = { ...strike };
    editTitle = strike.title;
    editPriority = strike.priority || 'Medium';
    editExecutionDate = strike.execution_date || todayFormatted;
    editNotes = strike.notes || '';
    editSubtaskId = strike.subtask_id || null;
    editCampaignId = null;
    editAvailableSubtasks = [];
    isUndatedModeEdit = strike.status === 'UNDATED';
    liveStrikeFeedbackEdit = { priority: null, date: null, isPast: false, isUndated: isUndatedModeEdit };

    // S-08: Resolve linked campaign and available subtasks reliably
    if (strike.subtask_id) {
      const subIdNum = Number(strike.subtask_id);
      const linkedSubtask = subtaskMap[strike.subtask_id] || subtaskMap[subIdNum] || subtaskMap[String(strike.subtask_id)];
      let ownerTaskId = linkedSubtask ? linkedSubtask.task_id : null;

      // Fallback: if not in subtaskMap yet, look for task matching campaign_title
      if (!ownerTaskId && strike.campaign_title) {
        const matchingTask = store.tasks.find(t => t.title === strike.campaign_title);
        if (matchingTask) ownerTaskId = matchingTask.id;
      }

      if (ownerTaskId) {
        editCampaignId = ownerTaskId;
        if (window.electronAPI && window.electronAPI.getSubtasks) {
          try {
            const subRes = await window.electronAPI.getSubtasks(ownerTaskId);
            if (subRes && subRes.success && subRes.subtasks) {
              editAvailableSubtasks = subRes.subtasks.filter(st => st.status === 'Doing' || Number(st.id) === subIdNum);
            }
          } catch (err) {
            console.error('Failed to load campaign subtasks in edit modal:', err);
          }
        }
      }
    }
  }

  async function handleCampaignChange(e) {
    const rawVal = e && e.target ? e.target.value : e;
    const cid = rawVal ? parseInt(rawVal, 10) : null;
    editCampaignId = cid;
    editSubtaskId = null;
    editAvailableSubtasks = [];
    if (cid && window.electronAPI && window.electronAPI.getSubtasks) {
      try {
        const res = await window.electronAPI.getSubtasks(cid);
        if (res && res.success && res.subtasks) {
          editAvailableSubtasks = res.subtasks.filter(st => st.status === 'Doing');
        }
      } catch (err) {
        console.error('Failed to load subtasks on campaign change:', err);
      }
    }
  }

  async function handleSaveEdit() {
    if (!editTitle.trim()) {
      store.showToast('Strike directive title cannot be empty.', 'warning');
      return;
    }
    // PENDING strikes are locked — only the Pending Resolution popup can reschedule or abort them
    if (editingStrike && editingStrike.status === 'PENDING') {
      store.showToast('Tactical Block: PENDING Strikes can only be resolved via the Pending Directives window.', 'warning');
      editingStrike = null;
      isPendingModalOpen = true;
      return;
    }
    if (editCampaignId && !editSubtaskId) {
      store.showToast('Tactical Block: Selecting a Campaign requires choosing a specific Subtask.', 'warning');
      return;
    }

    const priMatches = Array.from(editTitle.matchAll(/#(high|med|medium|low)\b/gi));
    if (priMatches.length > 0) {
      const lastPri = priMatches[priMatches.length - 1][1].toLowerCase();
      if (lastPri === 'high') editPriority = 'High';
      else if (lastPri === 'med' || lastPri === 'medium') editPriority = 'Medium';
      else if (lastPri === 'low') editPriority = 'Low';
    }

    const isUndatedTag = /@(?:undated|unplanned|floating|float|later|none)\b/i.test(editTitle);
    const effectiveIsUndated = isUndatedModeEdit || isUndatedTag;

    const parsedDate = effectiveIsUndated ? null : ChronosMath.parseSubtaskDate(editTitle);
    if (parsedDate) {
      if (parsedDate.isPast && parsedDate.dateStr !== editingStrike.execution_date) {
        store.showToast('Tactical Block: Cannot schedule a Strike on a past date.', 'warning');
        return;
      }
      editExecutionDate = parsedDate.dateStr;
    }

    if (!effectiveIsUndated) {
      const parsed = ChronosMath.parseSubtaskDate('@' + editExecutionDate);
      if (parsed && parsed.isPast && editExecutionDate !== editingStrike.execution_date) {
        store.showToast('Tactical Block: New execution date cannot be set to the past.', 'warning');
        return;
      }
    }

    const cleaned = cleanStrikeTitle(editTitle, parsedDate);
    const finalTitle = cleaned || editTitle.trim();

    let nextStatus = editingStrike.status;
    if (effectiveIsUndated) {
      nextStatus = 'UNDATED';
    } else if (editingStrike.status === 'UNDATED') {
      nextStatus = 'STANDBY';
    }

    const targetSubtaskId = editSubtaskId ? parseInt(editSubtaskId, 10) : null;
    const targetNotes = editNotes ? editNotes.trim() : '';

    const success = await store.updateStrike({
      id: editingStrike.id,
      title: finalTitle,
      execution_date: effectiveIsUndated ? '' : editExecutionDate,
      priority: editPriority,
      status: nextStatus,
      notes: editNotes,
      subtask_id: editSubtaskId ? parseInt(editSubtaskId, 10) : null,
      recurrence_id: editingStrike.recurrence_id || null
    });

    if (success) {
      editingStrike = null;
      editCampaignId = null;
      editSubtaskId = null;
      editAvailableSubtasks = [];
      editNotes = '';
      liveStrikeFeedbackEdit = { priority: null, date: null, isPast: false };
      await loadSubtasksMap();
    }
  }

  async function handleAbortPending(strikeId) {
    // Aborting a pending strike sets its status to ABORTED on its original past execution date
    await store.updateStrikeStatus(strikeId, 'ABORTED');
    store.showToast('Strike marked ABORTED on its execution date.', 'info');
  }

  async function handleReschedulePending(strikeId, newDateStr) {
    if (!newDateStr) {
      store.showToast('Valid new execution date required.', 'warning');
      return;
    }
    const parsed = ChronosMath.parseSubtaskDate('@' + newDateStr);
    if (parsed && parsed.isPast) {
      store.showToast('Tactical Block: New execution date cannot be in the past.', 'warning');
      return;
    }
    const success = await store.rescheduleStrike(strikeId, newDateStr);
    if (success) {
      activeRescheduleStrikeId = null;
    }
  }

  async function handleAbortStrike(strikeId, e) {
    if (e) e.stopPropagation();
    const strike = store.strikes.find(s => s.id === strikeId);
    if (!strike) return;
    if (strike.status === 'NEUTRALIZED') {
      store.showToast('Tactical Lock: Completed/Neutralized strike is finished and cannot be aborted.', 'warning');
      return;
    }
    if (strike.status === 'ABORTED') {
      store.showToast('Tactical Lock: Strike directive is already ABORTED.', 'warning');
      return;
    }
    await store.updateStrikeStatus(strikeId, 'ABORTED');
    store.showToast('⛔ Strike directive marked ABORTED.', 'info');
  }

  async function handleDelete(id, e) {
    if (e) e.stopPropagation();
    const strike = store.strikes.find(s => s.id === id);
    if (strike && strike.status !== 'STANDBY') {
      store.showToast('Tactical Lock: Only STANDBY strikes can be deleted. Non-STANDBY strikes can only be Aborted.', 'warning');
      return;
    }
    await store.deleteStrike(id);
    store.showToast('🗑️ Strike deleted.', 'info');
  }

  function selectGridDate(dateStr) {
    const parsed = ChronosMath.parseDate(dateStr);
    if (parsed) {
      selectedDateObj = parsed;
      newStrikeExecutionDate = dateStr;
    }
  }

  function jumpToDayView(strike, e) {
    if (e) e.stopPropagation();
    if (!strike || !strike.execution_date) return;
    selectGridDate(strike.execution_date);
    activeViewMode = 'Day';
    store.setHighlightedStrikeId(strike.id);
  }
</script>

<svelte:window onkeydown={handleKeyDown} onclick={handleWindowClick} />

<div class="strikes-container">
  <!-- Ultra-Premium Custom Animated Glassmorphic Filter Bar -->
  <div class="strikes-header">
    
    <!-- 1. CUSTOM DROPDOWN: Temporal Mode Selector -->
    <div class="custom-dd-wrap">
      <button 
        type="button" 
        class="custom-dd-trigger mode-trigger"
        class:active={openDropdown === 'mode'}
        onclick={(e) => toggleDropdown('mode', e)}
      >
        <span>{activeViewMode}</span>
        <ChevronDown size={14} class="dd-chevron {openDropdown === 'mode' ? 'rotated' : ''}" />
      </button>

      {#if openDropdown === 'mode'}
        <div class="custom-dd-menu">
          {#each modeOptions as opt}
            <button 
              type="button"
              class="custom-dd-item" 
              class:selected={activeViewMode === opt.value}
              onclick={() => { activeViewMode = opt.value; openDropdown = null; }}
            >
              <span>{opt.label}</span>
              {#if activeViewMode === opt.value}<Check size={14} class="check-icon" />{/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- 2. Center Popover Date Navigator -->
    <div class="date-navigator-center">
      <button type="button" class="glass-nav-btn" onclick={() => changeDateOffset(-1)} title="Previous Target (Left Arrow)">
        <ChevronLeft size={18} />
      </button>

      <button type="button" class="glass-today-btn" onclick={resetToToday} title="Jump to Today (T)">
        TODAY
      </button>

      <!-- Popover Calendar Trigger -->
      <div class="nav-calendar-wrap">
        <button 
          type="button" 
          class="glass-date-trigger" 
          onclick={(e) => { e.stopPropagation(); isNavDatePickerOpen = !isNavDatePickerOpen; openDropdown = null; }}
          title="Click to open smooth navigation calendar"
        >
          <Calendar size={16} class="cal-icon" />
          <span>{navDisplayLabel}</span>
        </button>

        {#if isNavDatePickerOpen}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="date-picker-dropdown nav-popover" onclick={(e) => e.stopPropagation()}>
            <Calendar2X 
              value={currentDateStr} 
              onselect={(d) => { selectGridDate(d); isNavDatePickerOpen = false; }} 
              minDateStr="01-01-2020"
            />
          </div>
        {/if}
      </div>

      <button type="button" class="glass-nav-btn" onclick={() => changeDateOffset(1)} title="Next Target (Right Arrow)">
        <ChevronRight size={18} />
      </button>
    </div>

    <!-- 3. DYNAMIC SEARCH BAR — HIGH VISIBILITY AMBER CARET & GLOW -->
    <div class="glass-search-box">
      <input 
        type="text" 
        placeholder="Filter & search strikes..." 
        bind:value={_searchRaw}
        oninput={(e) => handleSearchInput(e.target.value)}
        class="glass-search-input"
      />
      {#if _searchRaw || searchQuery || filterPriority !== 'ALL' || !filterStatuses.includes('ALL') || filterConnection !== 'ALL'}
        <button
          type="button"
          class="btn-search-clear-strikes"
          onclick={() => { _searchRaw = ''; searchQuery = ''; filterPriority = 'ALL'; filterStatuses = ['ALL']; filterConnection = 'ALL'; }}
          title="Clear search & all filters"
        >
          <X size={13} />
        </button>
      {/if}
    </div>

    <!-- 4. CUSTOM DROPDOWN: Priority Filter -->
    <div class="custom-dd-wrap">
      <button 
        type="button" 
        class="custom-dd-trigger pri-trigger"
        class:active={openDropdown === 'priority'}
        class:is-high={filterPriority === 'High'}
        class:is-med={filterPriority === 'Medium'}
        class:is-low={filterPriority === 'Low'}
        onclick={(e) => toggleDropdown('priority', e)}
      >
        <span style="color: {currentPri.color}">{currentPri.icon ? currentPri.icon + ' ' : ''}{currentPri.label}</span>
        <ChevronDown size={14} class="dd-chevron {openDropdown === 'priority' ? 'rotated' : ''}" />
      </button>

      {#if openDropdown === 'priority'}
        <div class="custom-dd-menu">
          {#each priorityOptions as opt}
            <button 
              type="button"
              class="custom-dd-item" 
              class:selected={filterPriority === opt.value}
              onclick={() => { filterPriority = opt.value; openDropdown = null; }}
            >
              <span style="color: {opt.color}">{opt.icon ? opt.icon + ' ' : ''}{opt.label}</span>
              {#if filterPriority === opt.value}<Check size={14} class="check-icon" />{/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- 5. CUSTOM DROPDOWN: Multi-Select Status Filter -->
    <div class="custom-dd-wrap">
      <button 
        type="button" 
        class="custom-dd-trigger status-trigger"
        class:active={openDropdown === 'status'}
        class:is-active-filter={!filterStatuses.includes('ALL')}
        onclick={(e) => toggleDropdown('status', e)}
      >
        <span style="color: #e2e8f0">{currentStatusLabel}</span>
        <ChevronDown size={14} class="dd-chevron {openDropdown === 'status' ? 'rotated' : ''}" />
      </button>

      {#if openDropdown === 'status'}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="custom-dd-menu" onclick={(e) => e.stopPropagation()}>
          {#each statusOptions as opt}
            {@const isSelected = filterStatuses.includes(opt.value)}
            <button 
              type="button"
              class="custom-dd-item multi-select-item" 
              class:selected={isSelected}
              onclick={() => toggleStatusFilter(opt.value)}
            >
              <div class="checkbox-box" class:checked={isSelected}>
                {#if isSelected}<Check size={12} class="cb-check" />{/if}
              </div>
              <span style="color: {opt.color}">{opt.icon ? opt.icon + ' ' : ''}{opt.label}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- 6. CUSTOM DROPDOWN: Subtask Connection Filter -->
    <div class="custom-dd-wrap">
      <button 
        type="button" 
        class="custom-dd-trigger conn-trigger"
        class:active={openDropdown === 'conn'}
        class:is-linked={filterConnection === 'SUBTASK_LINKED'}
        class:is-indep={filterConnection === 'INDEPENDENT'}
        onclick={(e) => toggleDropdown('conn', e)}
      >
        <span style="color: {currentConn.color}">{currentConn.icon ? currentConn.icon + ' ' : ''}{currentConn.label}</span>
        <ChevronDown size={14} class="dd-chevron {openDropdown === 'conn' ? 'rotated' : ''}" />
      </button>

      {#if openDropdown === 'conn'}
        <div class="custom-dd-menu">
          {#each connOptions as opt}
            <button 
              type="button"
              class="custom-dd-item" 
              class:selected={filterConnection === opt.value}
              onclick={() => { filterConnection = opt.value; openDropdown = null; }}
            >
              <span style="color: {opt.color}">{opt.icon ? opt.icon + ' ' : ''}{opt.label}</span>
              {#if filterConnection === opt.value}<Check size={14} class="check-icon" />{/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- 7. Dynamic Tactical Strikes Counter Badge (Right Corner) -->
    <div 
      class="glass-counter-badge" 
      title="Total Active Strikes: {activeFilteredStrikesCount}"
    >
      <Zap size={14} class="counter-zap" />
      <span>{activeFilteredStrikesCount} {activeFilteredStrikesCount === 1 ? 'STRIKE' : 'STRIKES'}</span>
    </div>

    <!-- 8. Dedicated + Add Strike Directive Modal Launcher Button -->
    <button 
      type="button" 
      class="btn-launch-strike-modal" 
      onclick={() => store.isStrikeModalOpen = true}
      title="Dispatch New Strike Directive (N or Ctrl+Shift+K)"
    >
      <Plus size={17} strokeWidth={2.5} />
    </button>

  </div>

  <!-- Main Temporal Calendar View Area -->
  <div class="strikes-content-area">

    <!-- 1. WEEK VIEW (7-Column Tactical Grid) -->
    {#if activeViewMode === 'Week'}
      <div class="week-calendar-grid">
        {#each weekDays as day}
          {@const dayStrikes = strikesByDate[day.dateStr] || []}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div 
            class="week-column" 
            class:is-today={day.isToday} 
            class:is-selected={day.isSelected}
            class:is-sunday={day.isSunday}
            class:is-saturday={day.isSaturday}
            onclick={() => selectGridDate(day.dateStr)}
          >
            <div class="col-header">
              <span class="col-day-name">{day.dayName}</span>
              <span class="col-day-num">{day.dayNum}</span>
              {#if day.isToday}<span class="col-today-badge">TODAY</span>{/if}
            </div>

            <div class="col-body">
              {#each dayStrikes as s (s.id)}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div 
                  class="grid-strike-card {s.status.toLowerCase()}" 
                  onclick={(e) => jumpToDayView(s, e)}
                  title="Click to jump to Day View for this strike"
                >
                  <span class="status-dot {s.status.toLowerCase()}"></span>
                  <span class="grid-strike-title">{#each getStrikeTitleParts(s.title) as part}{#if part.highlight}<mark class="strike-search-highlight">{part.text}</mark>{:else}{part.text}{/if}{/each}</span>
                  <span class="grid-priority-dot {s.priority.toLowerCase()}"></span>
                </div>
              {/each}
              <button 
                type="button" 
                class="col-empty-add-btn" 
                onclick={(e) => { e.stopPropagation(); newStrikeExecutionDate = day.dateStr; store.isStrikeModalOpen = true; }}
              >
                <Plus size={14} />
                <span>Add Strike</span>
              </button>
            </div>
          </div>
        {/each}
      </div>

    <!-- 2. 3 DAYS VIEW (Selected Day, Next Day, Day 3) -->
    {:else if activeViewMode === '3 Days'}
      <div class="three-days-grid">
        {#each threeDays as day}
          {@const dayStrikes = strikesByDate[day.dateStr] || []}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div 
            class="three-day-col" 
            class:is-today={day.isToday}
            onclick={() => selectGridDate(day.dateStr)}
          >
            <div class="col-header">
              <span class="col-label">{day.label} ({day.dateStr})</span>
            </div>
            <div class="col-body">
              {#each dayStrikes as s (s.id)}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div 
                  class="compact-three-day-card {s.status.toLowerCase()}"
                  onclick={(e) => jumpToDayView(s, e)}
                  title="Click to jump to Day View for this strike"
                >
                  <div class="card-left">
                    <span class="status-dot {s.status.toLowerCase()}"></span>
                    <span class="compact-strike-title">{#each getStrikeTitleParts(s.title) as part}{#if part.highlight}<mark class="strike-search-highlight">{part.text}</mark>{:else}{part.text}{/if}{/each}</span>
                  </div>
                  <span class="status-pill-mini {s.status.toLowerCase()}">{s.status}</span>
                </div>
              {/each}
              <button 
                type="button" 
                class="col-empty-add-btn" 
                onclick={(e) => { e.stopPropagation(); newStrikeExecutionDate = day.dateStr; store.isStrikeModalOpen = true; }}
              >
                <Plus size={14} />
                <span>Add Strike</span>
              </button>
            </div>
          </div>
        {/each}
      </div>

    <!-- 3. DAY VIEW (Ultra-Tactical Single Day Focus) -->
    {:else if activeViewMode === 'Day'}
      {@const dayStrikes = strikesByDate[currentDateStr] || []}
      {@const standbyCount = dayStrikes.filter(s => s.status === 'STANDBY').length}
      {@const engagedCount = dayStrikes.filter(s => s.status === 'ENGAGED').length}
      {@const pendingCount = dayStrikes.filter(s => s.status === 'PENDING').length}
      {@const neutralizedCount = dayStrikes.filter(s => s.status === 'NEUTRALIZED').length}
      {@const abortedCount = dayStrikes.filter(s => s.status === 'ABORTED').length}
      
      {@const isSelectedPastDate = ChronosMath.parseDate(currentDateStr) ? (ChronosMath.parseDate(currentDateStr).getTime() < ChronosMath.parseDate(todayFormatted).getTime()) : false}

      <div class="day-view-container">
        <!-- Day View Tactical Metrics Header -->
        <div class="day-view-banner">
          <div class="day-banner-info">
            <div class="banner-title-row">
              <Zap size={22} class="banner-zap" />
              <h2>TACTICAL TARGET DIRECTIVES</h2>
              {#if currentDateStr === todayFormatted}
                <span class="day-badge-today">★ TODAY'S RADAR</span>
              {/if}
            </div>
            <span class="banner-date-sub">{currentDateStr} • {dayStrikes.length} Total Directives Scheduled</span>
          </div>

          <!-- Quick Metrics Stat Cards -->
          <div class="day-banner-stats">
            <div class="stat-pill standby">
              <Square size={13} />
              <span>{standbyCount} STANDBY</span>
            </div>
            <div class="stat-pill engaged">
              <Zap size={13} />
              <span>{engagedCount} ENGAGED</span>
            </div>
            <div class="stat-pill neutralized">
              <CheckSquare size={13} />
              <span>{neutralizedCount} NEUTRALIZED</span>
            </div>

            {#if isSelectedPastDate}
              <!-- On past dates: Show ABORTED pill count for that day -->
              <div class="stat-pill aborted">
                <Ban size={13} />
                <span>{abortedCount} ABORTED</span>
              </div>
            {:else if allPendingStrikes.length > 0}
              <!-- On present / future dates: Show PENDING pill button on the far right -->
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <button 
                type="button"
                class="stat-pill pending clickable-pending-pill" 
                onclick={() => isPendingModalOpen = true}
                title="Click to resolve {allPendingStrikes.length} overdue pending directives"
              >
                <AlertOctagon size={13} />
                <span>{allPendingStrikes.length} PENDING</span>
              </button>
            {/if}

            <!-- TACTICAL UNDATED HOLDING BAY Button -->
            <button
              type="button"
              class="stat-pill undated-pill"
              onclick={() => isUndatedModalOpen = true}
              title="Open Undated Strikes Holding Bay ({allUndatedStrikes.length} holding)"
            >
              <Package size={13} />
              <span>{allUndatedStrikes.length} UNDATED</span>
            </button>

            <!-- TACTICAL BLUEPRINTS Button (Extreme Right) -->
            <button
              type="button"
              class="stat-pill blueprint-pill"
              onclick={() => isBlueprintsOpen = true}
              title="Open Tactical Blueprints ({allBlueprints.length} saved)"
            >
              <BookOpen size={13} />
              <span>{allBlueprints.length} BLUEPRINTS</span>
            </button>
          </div>
        </div>

        <!-- Directive List Container -->
        <div class="day-directives-scroll">
          {#if dayStrikes.length === 0}
            <div class="day-empty-state">
              <div class="empty-icon-ring">
                <Sparkles size={38} class="empty-sparkle" />
              </div>
              <h4>NO DIRECTIVES SCHEDULED FOR {currentDateStr}</h4>
              <p>Your tactical radar is clear for this target date. Initialize a new Strike using the dispatch bar above.</p>
            </div>
          {:else}
            <div class="day-directives-list">
              {#each dayStrikes as s (s.id)}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div 
                  class="day-strike-card {s.status.toLowerCase()}" 
                  class:neutralized={s.status === 'NEUTRALIZED'} 
                  class:engaged={s.status === 'ENGAGED'}
                  class:pending={s.status === 'PENDING'}
                  class:aborted={s.status === 'ABORTED'}
                  class:auto-highlight={store.highlightedStrikeId === s.id}
                  data-strike-id={s.id}
                  onclick={(e) => { clearStrikeFocus(); openEditModal(s, e); }}
                >
                  <!-- Status Interactive Checkbox Toggle -->
                  <button type="button" class="day-status-toggle" onclick={(e) => toggleStatus(s, e)} title="Toggle Status (Standby -> Engaged -> Neutralized)">
                    {#if s.status === 'NEUTRALIZED'}
                      <CheckSquare size={22} class="status-icon done" />
                    {:else if s.status === 'ENGAGED'}
                      <Zap size={22} class="status-icon active" />
                    {:else if s.status === 'PENDING'}
                      <AlertOctagon size={22} class="status-icon pending" />
                    {:else if s.status === 'ABORTED'}
                      <Ban size={22} class="status-icon aborted" />
                    {:else}
                      <Square size={22} class="status-icon standby" />
                    {/if}
                  </button>

                  <!-- Fixed-Width Column 1: Status Pill (Placed DIRECTLY next to Checkbox) -->
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <div class="col-status-wrap" onclick={(e) => toggleStatus(s, e)} title="Click to toggle status">
                    <span class="status-pill-lg {s.status.toLowerCase()}">{s.status}</span>
                  </div>

                  <!-- Directive Main Details (Clicking title/body opens edit modal) -->
                  <div class="day-strike-body">
                    <span class="day-strike-title">{#each getStrikeTitleParts(s.title) as part}{#if part.highlight}<mark class="strike-search-highlight">{part.text}</mark>{:else}{part.text}{/if}{/each}</span>
                    {#if s.notes}
                      <p class="day-strike-notes">{#each getStrikeTitleParts(s.notes) as part}{#if part.highlight}<mark class="strike-search-highlight">{part.text}</mark>{:else}{part.text}{/if}{/each}</p>
                    {/if}
                    {#if s.subtask_id || s.campaign_title || s.subtask_title || (s.subtask_id && (subtaskMap[s.subtask_id] || subtaskMap[String(s.subtask_id)]))}
                      {@const matchedSubtask = s.subtask_id ? (subtaskMap[s.subtask_id] || subtaskMap[String(s.subtask_id)]) : null}
                      {@const matchedTaskId = matchedSubtask?.task_id || (s.campaign_title ? store.tasks.find(t => t.title === s.campaign_title)?.id : null)}
                      {@const campaignName = s.campaign_title || matchedSubtask?.campaignTitle || (matchedTaskId ? store.tasks.find(t => t.id === matchedTaskId)?.title : null)}
                      {@const subtaskName = s.subtask_title || matchedSubtask?.title}
                      {#if campaignName || subtaskName || s.subtask_id}
                        <div class="day-strike-meta">
                          {#if campaignName}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <span 
                              class="meta-item campaign-link" 
                              title="Jump to Campaign: {campaignName}"
                              onclick={(e) => {
                                if (matchedTaskId) {
                                  e.stopPropagation();
                                  store.navigateToTask(matchedTaskId);
                                }
                              }}
                            >
                              <Flame size={13} /> {campaignName}
                            </span>
                          {/if}
                          {#if subtaskName}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <span 
                              class="meta-item subtask-link" 
                              title="Jump to Campaign Subtask"
                              onclick={(e) => {
                                if (matchedTaskId) {
                                  e.stopPropagation();
                                  store.navigateToTask(matchedTaskId);
                                }
                              }}
                            >
                              <Layers size={13} /> Subtask: {subtaskName}
                            </span>
                          {:else if s.subtask_id}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <span 
                              class="meta-item subtask-link" 
                              title="Jump to Campaign Subtask #{s.subtask_id}"
                              onclick={(e) => {
                                if (matchedTaskId) {
                                  e.stopPropagation();
                                  store.navigateToTask(matchedTaskId);
                                }
                              }}
                            >
                              <Layers size={13} /> Subtask #{s.subtask_id}
                            </span>
                          {/if}
                        </div>
                      {/if}
                    {/if}
                  </div>

                  <!-- Fixed-Width Column 2: Priority Tag -->
                  <div class="col-priority-wrap">
                    <span class="priority-tag {s.priority.toLowerCase()}">{s.priority.toUpperCase()}</span>
                  </div>

                  <!-- Action Buttons: Custom Recurrence & Purge -->
                  <div class="col-action-wrap">
                    <button 
                      type="button" 
                      class="action-icon-btn repeat" 
                      class:rc-locked={!!s.recurrence_id}
                      disabled={!!s.recurrence_id}
                      onclick={(e) => { 
                        e.stopPropagation(); 
                        recurrenceTargetStrike = s;
                        // S-13: reset all recurrence config — prevent bleed from previous strike
                        recurrenceFreq = 'Day';
                        recurrenceInterval = 1;
                        recurrenceWeekDays = [0, 1, 2, 3, 4, 5, 6];
                        recurrenceEndMode = 'occurrences';
                        recurrenceOccurrences = 5;
                        recurrenceEndDate = ChronosMath.addDays(s.execution_date, 30);
                        isRecurrenceEndDatePickerOpen = false;
                      }} 
                      title={s.recurrence_id ? `Recurrence Locked · Group ${s.recurrence_id}` : 'Set Custom Recurrence Rule'}
                    >
                      <Repeat size={15} />
                    </button>

                    {#if s.status === 'STANDBY'}
                      <button 
                        type="button" 
                        class="action-icon-btn delete" 
                        onclick={(e) => handleDelete(s.id, e)} 
                        title="Delete Strike Directive"
                      >
                        <Trash2 size={15} />
                      </button>
                    {:else if s.status === 'ENGAGED' || s.status === 'PENDING'}
                      <button 
                        type="button" 
                        class="action-icon-btn abort" 
                        onclick={(e) => handleAbortStrike(s.id, e)} 
                        title="Abort Strike Directive (A)"
                      >
                        <span class="btn-abort-symbol">A</span>
                      </button>
                    {:else if s.status === 'ABORTED'}
                      <button 
                        type="button" 
                        class="action-icon-btn abort is-aborted" 
                        disabled
                        title="Strike Already Aborted"
                      >
                        <span class="btn-abort-symbol">A</span>
                      </button>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

    <!-- 4. SCHEDULE / AGENDA VIEW (Unlimited Planned Timeline Stream) -->
    {:else}
      <div class="schedule-view-container">
        <!-- Schedule Header Banner -->
        <div class="schedule-banner">
          <div class="schedule-banner-title">
            <ListFilter size={22} class="banner-zap" />
            <div class="banner-title-group">
              <h2>PLANNED AGENDA TIMELINE</h2>
              <span class="banner-subtitle">{navDisplayLabel} Horizon • {scheduleTimeline.length} Scheduled Target Dates</span>
            </div>
          </div>

          <div class="schedule-banner-pills">
            <div class="stat-pill standby">
              <Calendar size={13} />
              <span>{navDisplayLabel}</span>
            </div>
          </div>
        </div>

        <!-- Schedule Timeline Stream -->
        <div class="schedule-stream-scroll">
          {#if scheduleTimeline.length === 0}
            <div class="day-empty-state">
              <div class="empty-icon-ring">
                <Sparkles size={38} class="empty-sparkle" />
              </div>
              <h4>NO PLANNED STRIKE DIRECTIVES ON RADAR</h4>
              <p>Your tactical agenda stream is currently clear. Use the quick dispatch bar above to initialize directives.</p>
            </div>
          {:else}
            <div class="schedule-timeline-list">
              {#each scheduleTimeline as group (group.dateStr)}
                <div class="schedule-group-card" data-date={group.dateStr} class:is-today={group.isToday} class:is-past={group.isPast}>
                  <!-- Group Header Date Divider -->
                  <div class="schedule-group-header">
                    <div class="header-date-badge">
                      <Calendar size={14} class="grp-cal-icon" />
                      <span class="grp-date-text">{group.dateStr}</span>
                      {#if group.relativeLabel}
                        <span class="grp-relative-tag" class:today={group.isToday} class:past={group.isPast}>
                          {group.relativeLabel}
                        </span>
                      {/if}
                    </div>

                    <span class="grp-strike-count">{group.strikeList.length} Directive{group.strikeList.length > 1 ? 's' : ''}</span>
                  </div>

                  <!-- Group Items List -->
                  <div class="schedule-group-items">
                    {#each group.strikeList as s (s.id)}
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <div 
                        class="compact-three-day-card {s.status.toLowerCase()}" 
                        class:neutralized={s.status === 'NEUTRALIZED'} 
                        class:engaged={s.status === 'ENGAGED'}
                        class:pending={s.status === 'PENDING'}
                        class:aborted={s.status === 'ABORTED'}
                        onclick={(e) => jumpToDayView(s, e)}
                        title="Click to jump to Day View for this strike"
                      >
                        <div class="card-left">
                          <span class="status-dot {s.status.toLowerCase()}"></span>
                          <span class="compact-strike-title">{#each getStrikeTitleParts(s.title) as part}{#if part.highlight}<mark class="strike-search-highlight">{part.text}</mark>{:else}{part.text}{/if}{/each}</span>
                          <span class="grid-priority-dot {s.priority.toLowerCase()}"></span>
                        </div>
                        <span class="status-pill-mini {s.status.toLowerCase()}">{s.status}</span>
                      </div>
                    {/each}
                    {#if !group.isPast}
                      <button 
                        type="button" 
                        class="col-empty-add-btn schedule-add-btn" 
                        onclick={(e) => { e.stopPropagation(); newStrikeExecutionDate = group.dateStr; store.isStrikeModalOpen = true; }}
                      >
                        <Plus size={14} />
                        <span>Add Strike</span>
                      </button>
                    {/if}
                  </div>
                </div>
              {/each}
              <div class="schedule-pagination-bar">
                <button 
                  type="button" 
                  class="btn-load-more-schedule"
                  onclick={() => scheduleDaysCount += 15}
                >
                  <Plus size={15} /> <span>LOAD NEXT 15 DAYS HORIZON</span>
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- UNIFIED STRIKE DIRECTIVE MODAL DIALOG (CREATE & EDIT SHARE SAME LAYOUT) -->
{#if editingStrike || store.isStrikeModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay">
    <div class="modal-dialog strike-modal-dialog" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <div class="header-left">
          <Zap size={20} class="counter-zap" />
          <span>{editingStrike ? 'EDIT STRIKE DIRECTIVE' : 'DISPATCH NEW STRIKE DIRECTIVE'}</span>
        </div>
        <div class="header-actions">
          {#if editingStrike}
            {@const isAlreadyBlueprint = allBlueprints.some(bp => (bp.title || '').toLowerCase().trim() === (editTitle || editingStrike.title || '').toLowerCase().trim())}
            <button
              type="button"
              class="btn-save-blueprint {editingStrike.recurrence_id ? 'blueprint-locked' : ''} {isAlreadyBlueprint ? 'blueprint-saved' : ''}"
              title={editingStrike.recurrence_id 
                ? 'Blueprints not available for recurring strikes' 
                : isAlreadyBlueprint 
                  ? 'Blueprint already saved for this directive' 
                  : 'Save as Blueprint Template'}
              onclick={() => {
                if (editingStrike.recurrence_id) {
                  store.showToast('Tactical Block: Blueprints cannot be created from recurring strike instances.', 'warning');
                } else if (isAlreadyBlueprint) {
                  store.showToast(`Tactical Block: Blueprint "${editTitle || editingStrike.title}" already exists.`, 'warning');
                } else {
                  saveAsBlueprint(editingStrike);
                }
              }}
            >
              {#if isAlreadyBlueprint}
                <Check size={14} strokeWidth={3} />
                <span>SAVED AS BLUEPRINT</span>
              {:else}
                <Star size={15} />
                <span>BLUEPRINT</span>
              {/if}
            </button>
          {/if}
          <button type="button" class="close-modal-btn" onclick={() => { editingStrike = null; store.isStrikeModalOpen = false; editCampaignId = null; editSubtaskId = null; editAvailableSubtasks = []; editNotes = ''; }}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div class="modal-body strike-modal-body">
        <!-- Row 1: Title -->
        <div class="form-group">
          <div class="field-label-row">
            <label for="strike-modal-title">DIRECTIVE TITLE</label>
            {#if (editingStrike ? ghostSuggestionEdit.suffix : ghostSuggestionNew.suffix)}
              <span class="ghost-hint-pill">Press <strong>Tab ⇥</strong> to complete {(editingStrike ? ghostSuggestionEdit.full : ghostSuggestionNew.full)}</span>
            {/if}
          </div>
          <div class="smart-input-wrap">
            {#if editingStrike}
              <input 
                id="strike-modal-title"
                type="text" 
                bind:value={editTitle}
                oninput={(e) => handleStrikeTitleInput(e.target.value, true)}
                use:focusTitleInput
                placeholder="Enter directive title (e.g. Audit TLS Logs #High @floating or @tom)..."
                class="modal-input modal-input-lg smart-input-field"
                onkeydown={(e) => {
                  if (e.key === 'Tab') {
                    if (acceptGhostSuggestion(true)) {
                      e.preventDefault();
                      return;
                    }
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveEdit();
                  }
                }}
              />
              {#if ghostSuggestionEdit.suffix}
                <div class="ghost-overlay" aria-hidden="true">
                  <span class="ghost-echo">{editTitle}</span><span class="ghost-completion">{ghostSuggestionEdit.suffix}</span>
                  <span class="ghost-tab-badge">Tab ⇥</span>
                </div>
              {/if}
            {:else}
              <input 
                id="strike-modal-title"
                type="text" 
                bind:value={newStrikeTitle}
                oninput={(e) => handleStrikeTitleInput(e.target.value, false)}
                use:focusTitleInput
                placeholder="Enter directive title (e.g. Audit TLS Logs #High @floating or @tom)..."
                class="modal-input modal-input-lg smart-input-field"
                onkeydown={async (e) => {
                  if (e.key === 'Tab') {
                    if (acceptGhostSuggestion(false)) {
                      e.preventDefault();
                      return;
                    }
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newStrikeTitle.trim()) {
                      await handleAddStrike();
                      store.isStrikeModalOpen = false;
                    }
                  }
                }}
              />
              {#if ghostSuggestionNew.suffix}
                <div class="ghost-overlay" aria-hidden="true">
                  <span class="ghost-echo">{newStrikeTitle}</span><span class="ghost-completion">{ghostSuggestionNew.suffix}</span>
                  <span class="ghost-tab-badge">Tab ⇥</span>
                </div>
              {/if}
            {/if}
          </div>
          {#if (editingStrike ? (liveStrikeFeedbackEdit.priority || liveStrikeFeedbackEdit.date || liveStrikeFeedbackEdit.isUndated) : (liveStrikeFeedbackNew.priority || liveStrikeFeedbackNew.date || liveStrikeFeedbackNew.isUndated))}
            {@const feedback = editingStrike ? liveStrikeFeedbackEdit : liveStrikeFeedbackNew}
            <div class="strike-inline-feedback-bar">
              {#if feedback.priority}
                <span class="syntax-pill priority-{feedback.priority.toLowerCase()}">
                  ⚡ PRIORITY: {feedback.priority.toUpperCase()}
                </span>
              {/if}
              {#if feedback.isUndated}
                <span class="syntax-pill undated-detected">
                  📦 UNDATED DIRECTIVE
                </span>
              {:else if feedback.date}
                <span class="syntax-pill date-detected" class:is-past={feedback.isPast}>
                  {#if feedback.isPast}
                    ⚠️ PAST DATE BLOCKED: {feedback.date}
                  {:else}
                    📅 TARGET: {feedback.date}
                  {/if}
                </span>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Row 2: Target Execution Date & Priority Level -->
        <div class="form-row">
          <div class="form-group flex-1">
            <div class="field-label-row">
              <span class="field-label">{(editingStrike ? isUndatedModeEdit : isUndatedModeNew) ? 'DIRECTIVE TIMELINE' : 'TARGET EXECUTION DATE'}</span>
              <button
                type="button"
                class="btn-toggle-undated-mode"
                class:is-active={editingStrike ? isUndatedModeEdit : isUndatedModeNew}
                onclick={() => {
                  if (editingStrike) {
                    isUndatedModeEdit = !isUndatedModeEdit;
                    liveStrikeFeedbackEdit.isUndated = isUndatedModeEdit;
                  } else {
                    isUndatedModeNew = !isUndatedModeNew;
                    liveStrikeFeedbackNew.isUndated = isUndatedModeNew;
                  }
                }}
                title="Toggle between Scheduled Date and Undated Holding Bay"
              >
                <Package size={12} />
                <span>{(editingStrike ? isUndatedModeEdit : isUndatedModeNew) ? 'UNDATED: ACTIVE' : 'MAKE UNDATED'}</span>
              </button>
            </div>
            
            {#if (editingStrike ? isUndatedModeEdit : isUndatedModeNew)}
              <div class="undated-mode-box">
                <Package size={15} class="undated-box-icon" />
                <span class="undated-box-label">UNDATED (Holding Bay)</span>
              </div>
            {:else}
              <div class="date-picker-wrap">
                <button 
                  type="button" 
                  class="date-picker-btn modal-trigger-full" 
                  onclick={(e) => { e.stopPropagation(); isDatePickerOpen = !isDatePickerOpen; openDropdown = null; }}
                >
                  <div class="trigger-label-group">
                    <Calendar size={15} />
                    <span>{editingStrike ? editExecutionDate : newStrikeExecutionDate}</span>
                  </div>
                  <ChevronDown size={14} />
                </button>
                {#if isDatePickerOpen}
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <div class="date-picker-dropdown modal-popover" onclick={(e) => e.stopPropagation()}>
                    <Calendar2X 
                      value={editingStrike ? editExecutionDate : newStrikeExecutionDate} 
                      onselect={(d) => {
                        if (editingStrike) editExecutionDate = d;
                        else newStrikeExecutionDate = d;
                        isDatePickerOpen = false;
                      }} 
                      minDateStr={past6MonthsDateStr}
                    />
                  </div>
                {/if}
              </div>
            {/if}
          </div>

          <div class="form-group flex-1">
            <span class="field-label">PRIORITY LEVEL</span>
            <div class="custom-dd-wrap modal-dd-wrap">
              <button 
                type="button" 
                class="custom-dd-trigger modal-trigger-full pri-trigger"
                class:is-high={(editingStrike ? editPriority : newStrikePriority) === 'High'}
                class:is-med={(editingStrike ? editPriority : newStrikePriority) === 'Medium'}
                class:is-low={(editingStrike ? editPriority : newStrikePriority) === 'Low'}
                onclick={(e) => toggleDropdown('modalStrikePriority', e)}
              >
                <span>{(editingStrike ? editPriority : newStrikePriority) === 'High' ? '🔴 High' : (editingStrike ? editPriority : newStrikePriority) === 'Medium' ? '🟡 Medium' : '🔵 Low'}</span>
                <ChevronDown size={14} />
              </button>

              {#if openDropdown === 'modalStrikePriority'}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="custom-dd-menu modal-pop-menu" onclick={(e) => e.stopPropagation()}>
                  <button 
                    type="button" 
                    class="custom-dd-item" 
                    class:selected={(editingStrike ? editPriority : newStrikePriority) === 'High'}
                    onclick={() => {
                      if (editingStrike) editPriority = 'High';
                      else newStrikePriority = 'High';
                      openDropdown = null;
                    }}
                  >
                    <span>🔴 High Priority</span>
                    {#if (editingStrike ? editPriority : newStrikePriority) === 'High'}<Check size={14} class="check-icon" />{/if}
                  </button>
                  <button 
                    type="button" 
                    class="custom-dd-item" 
                    class:selected={(editingStrike ? editPriority : newStrikePriority) === 'Medium'}
                    onclick={() => {
                      if (editingStrike) editPriority = 'Medium';
                      else newStrikePriority = 'Medium';
                      openDropdown = null;
                    }}
                  >
                    <span>🟡 Medium Priority</span>
                    {#if (editingStrike ? editPriority : newStrikePriority) === 'Medium'}<Check size={14} class="check-icon" />{/if}
                  </button>
                  <button 
                    type="button" 
                    class="custom-dd-item" 
                    class:selected={(editingStrike ? editPriority : newStrikePriority) === 'Low'}
                    onclick={() => {
                      if (editingStrike) editPriority = 'Low';
                      else newStrikePriority = 'Low';
                      openDropdown = null;
                    }}
                  >
                    <span>🔵 Low Priority</span>
                    {#if (editingStrike ? editPriority : newStrikePriority) === 'Low'}<Check size={14} class="check-icon" />{/if}
                  </button>
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Row 3: Campaign & Linked Subtask Selection -->
        <div class="form-row">
          <div class="form-group flex-1">
            <span class="field-label">CAMPAIGN (EXECUTION)</span>
            <div class="custom-dd-wrap modal-dd-wrap">
              <button 
                type="button" 
                class="custom-dd-trigger modal-trigger-full"
                onclick={(e) => toggleDropdown('modalCampaign', e)}
              >
                <span>
                  {#if !editCampaignId}
                    Independent (No Campaign)
                  {:else}
                    {store.executionTasks.find(t => t.id === editCampaignId)?.title || `Campaign #${editCampaignId}`}
                  {/if}
                </span>
                <ChevronDown size={14} />
              </button>
              {#if openDropdown === 'modalCampaign'}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="custom-dd-menu modal-pop-menu" onclick={(e) => e.stopPropagation()}>
                  <button 
                    type="button" 
                    class="custom-dd-item"
                    class:selected={!editCampaignId}
                    onclick={() => { handleCampaignChange({ target: { value: '' } }); openDropdown = null; }}
                  >
                    <span>Independent (No Campaign)</span>
                    {#if !editCampaignId}<Check size={14} class="check-icon" />{/if}
                  </button>
                  {#each store.executionTasks as t (t.id)}
                    <button 
                      type="button" 
                      class="custom-dd-item"
                      class:selected={editCampaignId === t.id}
                      onclick={() => { handleCampaignChange({ target: { value: t.id } }); openDropdown = null; }}
                    >
                      <span>🔥 {t.title}</span>
                      {#if editCampaignId === t.id}<Check size={14} class="check-icon" />{/if}
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          </div>

          <div class="form-group flex-1">
            <span class="field-label">LINKED SUBTASK</span>
            <div class="custom-dd-wrap modal-dd-wrap">
              <button 
                type="button" 
                class="custom-dd-trigger modal-trigger-full"
                disabled={!editCampaignId}
                onclick={(e) => toggleDropdown('modalSubtask', e)}
              >
                <span>
                  {#if !editCampaignId}
                    -- Select Campaign First --
                  {:else if !editSubtaskId}
                    -- Select Subtask --
                  {:else}
                    {editAvailableSubtasks.find(st => st.id === editSubtaskId)?.title || `Subtask #${editSubtaskId}`}
                  {/if}
                </span>
                <ChevronDown size={14} />
              </button>

              {#if openDropdown === 'modalSubtask' && editCampaignId}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="custom-dd-menu modal-pop-menu" onclick={(e) => e.stopPropagation()}>
                  <button 
                    type="button" 
                    class="custom-dd-item"
                    class:selected={!editSubtaskId}
                    onclick={() => { editSubtaskId = null; openDropdown = null; }}
                  >
                    <span>None (Campaign Level)</span>
                    {#if !editSubtaskId}<Check size={14} class="check-icon" />{/if}
                  </button>
                  {#each editAvailableSubtasks as st (st.id)}
                    <button 
                      type="button" 
                      class="custom-dd-item"
                      class:selected={editSubtaskId === st.id}
                      onclick={() => { editSubtaskId = st.id; openDropdown = null; }}
                    >
                      <span>🔗 #{st.id} - {st.title} [{st.status}]</span>
                      {#if editSubtaskId === st.id}<Check size={14} class="check-icon" />{/if}
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Row 4: Notes -->
        <div class="form-group">
          <label for="modal-strike-notes">NOTES / OPERATIONAL CONTEXT</label>
          <textarea 
            id="modal-strike-notes"
            bind:value={editNotes}
            rows="3"
            class="modal-textarea"
            placeholder="Add operational notes or instructions..."
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-cancel" onclick={() => { editingStrike = null; store.isStrikeModalOpen = false; editCampaignId = null; editSubtaskId = null; editAvailableSubtasks = []; editNotes = ''; }}>CANCEL</button>
        {#if editingStrike}
          <button type="button" class="btn-save" onclick={handleSaveEdit}>SAVE DIRECTIVE</button>
        {:else}
          <button 
            type="button" 
            class="btn-save" 
            disabled={!newStrikeTitle.trim()}
            onclick={async () => {
              await handleAddStrike();
              store.isStrikeModalOpen = false;
            }}
          >
            INITIALIZE DIRECTIVE
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- PENDING DIRECTIVES RESOLUTION PANEL MODAL DIALOG -->
{#if isPendingModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay">
    <div class="modal-dialog pending-modal-dialog" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header pending-header">
        <div class="header-left">
          <AlertOctagon size={20} class="pending-modal-icon" />
          <span>TACTICAL PENDING DIRECTIVES RESOLUTION</span>
          <span class="pending-live-badge">{allPendingStrikes.length} PENDING</span>
        </div>
        <button type="button" class="close-modal-btn" onclick={() => { isPendingModalOpen = false; activeRescheduleStrikeId = null; }}>
          <X size={18} />
        </button>
      </div>

      <div class="modal-body pending-modal-body">
        <p class="pending-instruction">
          The following Strike directives crossed their execution dates without being neutralized. Choose a fast action: 
          <strong>Reschedule</strong> (up to 2 permits allowed) or <strong>Mark Aborted</strong> on its execution date.
        </p>

        <div class="pending-items-list">
          {#each allPendingStrikes as ps (ps.id)}
            <div class="pending-row-card" class:is-editing={activeRescheduleStrikeId === ps.id}>
              <div class="pending-row-main">
                <div class="pending-row-info">
                  <span class="pending-row-title">{ps.title}</span>
                  <div class="pending-row-meta">
                    <span class="meta-item date"><Calendar size={13} /> Original Date: {ps.execution_date}</span>
                    <span class="meta-item permits"><RotateCw size={13} /> Reschedules Used: {ps.reschedule_count || 0}/2</span>
                  </div>
                </div>

                <div class="pending-row-actions">
                  <button 
                    type="button" 
                    class="btn-pending-action reschedule" 
                    disabled={ps.reschedule_count >= 2}
                    onclick={() => { 
                      activeRescheduleStrikeId = activeRescheduleStrikeId === ps.id ? null : ps.id; 
                      rescheduleDateInput = todayFormatted;
                      isReschedulePickerOpen = false;
                    }}
                  >
                    <RotateCw size={14} />
                    <span>{activeRescheduleStrikeId === ps.id ? 'CLOSE PICKER' : 'RESCHEDULE'}</span>
                  </button>

                  <button 
                    type="button" 
                    class="btn-pending-action abort"
                    onclick={() => handleAbortPending(ps.id)}
                  >
                    <Ban size={14} />
                    <span>MARK ABORTED</span>
                  </button>
                </div>
              </div>

              {#if activeRescheduleStrikeId === ps.id}
                <!-- Full-Width Reschedule Picker Drawer -->
                <div class="reschedule-drawer">
                  <div class="drawer-left">
                    <span class="drawer-label">SELECT NEW TARGET DATE:</span>
                    <div class="date-picker-wrap">
                      <button 
                        type="button" 
                        class="date-picker-btn mini-btn drawer-btn" 
                        onclick={(e) => { e.stopPropagation(); isReschedulePickerOpen = !isReschedulePickerOpen; }}
                      >
                        <Calendar size={15} />
                        <span>{rescheduleDateInput}</span>
                        <ChevronDown size={14} />
                      </button>
                      {#if isReschedulePickerOpen}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div class="date-picker-dropdown reschedule-popover" onclick={(e) => e.stopPropagation()}>
                          <Calendar2X 
                            value={rescheduleDateInput} 
                            onselect={(d) => { rescheduleDateInput = d; isReschedulePickerOpen = false; }} 
                            minDateStr={todayFormatted}
                          />
                        </div>
                      {/if}
                    </div>
                  </div>

                  <div class="drawer-right">
                    <button 
                      type="button" 
                      class="btn-confirm-reschedule"
                      onclick={() => handleReschedulePending(ps.id, rescheduleDateInput)}
                    >
                      CONFIRM RESCHEDULE
                    </button>
                    <button 
                      type="button" 
                      class="btn-cancel-drawer"
                      onclick={() => { activeRescheduleStrikeId = null; isReschedulePickerOpen = false; }}
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <div class="modal-footer">
        <button 
          type="button" 
          class="btn-save" 
          onclick={() => { isPendingModalOpen = false; activeRescheduleStrikeId = null; }}
        >
          CLOSE PANEL
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- CUSTOM RECURRENCE CONFIGURATION MODAL DIALOG -->
{#if recurrenceTargetStrike}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay">
    <div class="modal-dialog recurrence-modal-dialog" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header recurrence-header">
        <div class="header-left">
          <Repeat size={20} class="recurrence-modal-icon" />
          <span>CUSTOM RECURRENCE CONFIGURATION</span>
        </div>
        <button type="button" class="close-modal-btn" onclick={() => recurrenceTargetStrike = null}>
          <X size={18} />
        </button>
      </div>

      <div class="modal-body recurrence-modal-body">
        <div class="recurrence-base-card">
          <span class="base-label">TARGET DIRECTIVE:</span>
          <span class="base-title">{recurrenceTargetStrike.title}</span>
          <span class="base-date">Base Execution: <strong>{recurrenceTargetStrike.execution_date}</strong></span>
        </div>

        <!-- Sequential Numbering Toggle -->
        <div class="form-group numbering-toggle-row">
          <div class="numbering-toggle-left">
            <span class="field-label">SEQUENTIAL NUMBERING</span>
            <span class="field-hint numbering-hint">
              {#if recurrenceNumbering}
                Base → <strong>"{recurrenceTargetStrike.title.replace(/\s*\(\d+\)$/, '').trim()} (0)"</strong> &nbsp;·&nbsp; Copies → <strong>"… (1)"</strong>, <strong>"… (2)"</strong>…
              {:else}
                All copies use exact title: <strong>"{recurrenceTargetStrike.title}"</strong>
              {/if}
            </span>
          </div>
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="numbering-toggle-switch"
            class:on={recurrenceNumbering}
            onclick={() => { recurrenceNumbering = !recurrenceNumbering; }}
            role="switch"
            aria-checked={recurrenceNumbering}
            tabindex="0"
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); recurrenceNumbering = !recurrenceNumbering; } }}
          >
            <div class="toggle-knob"></div>
          </div>
        </div>

        <!-- Frequency & Interval Row -->

        <div class="form-row">
          <div class="form-group flex-1">
            <label for="recurrence-interval">REPEAT FREQUENCY</label>
            <div class="recurrence-interval-input-wrap">
              <input 
                id="recurrence-interval"
                type="number" 
                min="1"
                max="99"
                bind:value={recurrenceInterval}
                class="modal-input num-input"
              />
              <select bind:value={recurrenceFreq} class="modal-input freq-select">
                <option value="Day">{recurrenceInterval > 1 ? 'Days' : 'Day'}</option>
                <option value="Week">{recurrenceInterval > 1 ? 'Weeks' : 'Week'}</option>
                <option value="Month">{recurrenceInterval > 1 ? 'Months' : 'Month'}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Weekly Repeat Days Button Bar (Visible when Frequency is Week) -->
        {#if recurrenceFreq === 'Week'}
          <div class="form-group sub-panel">
            <span class="field-label">REPEAT ON</span>
            <div class="weekdays-btn-row">
              {#each weekDayOptions as opt}
                <button 
                  type="button" 
                  class="weekday-circle-btn" 
                  class:active={recurrenceWeekDays.includes(opt.day)}
                  onclick={() => toggleRecurrenceWeekDay(opt.day)}
                >
                  {opt.label}
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- End Options (Occurrences vs Particular Date) -->
        <div class="form-group">
          <span class="field-label">ENDS</span>
          <div class="recurrence-end-options">
            <label class="recurrence-radio-label" class:selected={recurrenceEndMode === 'occurrences'}>
              <input type="radio" name="recEnd" value="occurrences" bind:group={recurrenceEndMode} />
              <span>After Occurrences</span>
            </label>

            <label class="recurrence-radio-label" class:selected={recurrenceEndMode === 'date'}>
              <input type="radio" name="recEnd" value="date" bind:group={recurrenceEndMode} />
              <span>On Specific Date</span>
            </label>
          </div>
        </div>

        <!-- Dynamic End Option Sub-Panel -->
        {#if recurrenceEndMode === 'occurrences'}
          <div class="form-group sub-panel">
            <label for="rec-occurrences-count">NUMBER OF OCCURRENCES</label>
            <div class="occurrences-field">
              <input 
                id="rec-occurrences-count"
                type="number" 
                min="1" 
                max="50" 
                bind:value={recurrenceOccurrences}
                class="modal-input num-input"
              />
              <span class="field-hint">Generates {recurrenceOccurrences || 1} recurrent directive copies</span>
            </div>
          </div>
        {:else}
          <div class="form-group sub-panel">
            <label for="rec-end-date">UNTIL DATE</label>
            <div class="date-picker-wrap">
              <button 
                type="button" 
                class="date-picker-btn modal-input-btn" 
                onclick={(e) => { e.stopPropagation(); isRecurrenceEndDatePickerOpen = !isRecurrenceEndDatePickerOpen; }}
              >
                <Calendar size={15} />
                <span>{recurrenceEndDate}</span>
              </button>

              {#if isRecurrenceEndDatePickerOpen}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="date-picker-dropdown modal-popover" onclick={(e) => e.stopPropagation()}>
                  <Calendar2X 
                    value={recurrenceEndDate} 
                    onselect={(d) => { recurrenceEndDate = d; isRecurrenceEndDatePickerOpen = false; }} 
                    minDateStr={recurrenceTargetStrike.execution_date}
                  />
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-cancel" onclick={() => recurrenceTargetStrike = null}>CANCEL</button>
        <button type="button" class="btn-save recurrence-save" onclick={generateRecurrentStrikes}>
          <Repeat size={15} />
          <span>GENERATE RECURRENCE</span>
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ═══ TACTICAL BLUEPRINTS WINDOW (COMPACT HEADER & SINGLE-ROW CARDS) ═══ -->
{#if isBlueprintsOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={() => isBlueprintsOpen = false}>
    <div class="modal-dialog blueprints-drawer" onclick={(e) => e.stopPropagation()}>
      
      <!-- Compact 1-2 Line Header -->
      <div class="modal-header blueprints-header">
        <div class="header-left">
          <BookOpen size={20} class="blueprint-header-icon" />
          <span>TACTICAL BLUEPRINTS</span>
          <span class="blueprint-count-badge">{allBlueprints.length}</span>
        </div>
        <button type="button" class="close-modal-btn" onclick={() => isBlueprintsOpen = false}>
          <X size={18} />
        </button>
      </div>

      <!-- Blueprints Body Content (Single Row Cards List) -->
      <div class="blueprints-body">
        {#if allBlueprints.length === 0}
          <div class="blueprints-empty">
            <div class="empty-icon-ring purple-glow">
              <Star size={36} class="empty-sparkle" />
            </div>
            <h4>NO BLUEPRINTS SAVED YET</h4>
            <p>Save any strike as a reusable blueprint by opening it in Edit mode and clicking the <strong>⭐ BLUEPRINT</strong> button.</p>
          </div>
        {:else}
          <div class="blueprints-list">
            {#each allBlueprints as bp (bp.id)}
              <div class="blueprint-row-card">
                <div class="bp-row-left">
                  <div class="bp-star-icon">
                    <Star size={15} />
                  </div>
                  <div class="bp-info-col">
                    <div class="bp-title-line">
                      <span class="bp-title">{bp.title}</span>
                      <span class="bp-tag priority-low">LOW</span>
                      <span class="bp-tag standby">STANDBY</span>
                    </div>
                    {#if bp.notes}
                      <span class="bp-notes-text" title={bp.notes}>{bp.notes}</span>
                    {/if}
                  </div>
                </div>

                <div class="bp-row-right">
                  <span class="bp-date-meta">Created {bp.created_at}</span>
                  <button
                    type="button"
                    class="btn-instantiate"
                    title="Instantly dispatch as today's STANDBY strike"
                    onclick={() => instantiateBlueprint(bp)}
                  >
                    <Zap size={14} strokeWidth={2.5} />
                    <span>INSTANTIATE TODAY</span>
                  </button>
                  <button
                    type="button"
                    class="btn-delete-blueprint"
                    title="Delete blueprint permanently"
                    onclick={() => deleteBlueprint(bp.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- ═══ TACTICAL UNDATED DIRECTIVES HOLDING BAY WINDOW ═══ -->
{#if isUndatedModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={() => { isUndatedModalOpen = false; activeDeployUndatedId = null; }}>
    <div class="modal-dialog undated-modal-dialog" onclick={(e) => e.stopPropagation()}>
      
      <!-- Modal Header -->
      <div class="modal-header undated-header">
        <div class="header-left">
          <Package size={20} class="undated-header-icon" />
          <span>TACTICAL UNDATED DIRECTIVES HOLDING BAY</span>
          <span class="undated-count-badge">{allUndatedStrikes.length} UNDATED</span>
        </div>
        <button type="button" class="close-modal-btn" onclick={() => { isUndatedModalOpen = false; activeDeployUndatedId = null; }}>
          <X size={18} />
        </button>
      </div>

      <!-- In-Modal Quick Search & Priority Filter Bar -->
      <div class="undated-modal-toolbar">
        <div class="undated-search-wrap">
          <Search size={14} class="undated-search-icon" />
          <input 
            type="text" 
            placeholder="Search undated directives or notes..." 
            bind:value={undatedSearchQuery} 
            class="undated-search-input"
          />
          {#if undatedSearchQuery}
            <button type="button" class="btn-clear-undated-search" onclick={() => undatedSearchQuery = ''}>
              <X size={12} />
            </button>
          {/if}
        </div>

        <div class="undated-pri-filters">
          <button 
            type="button" 
            class="undated-pri-btn" 
            class:active={undatedFilterPriority === 'ALL'}
            onclick={() => undatedFilterPriority = 'ALL'}
          >
            ALL ({allUndatedStrikes.length})
          </button>
          <button 
            type="button" 
            class="undated-pri-btn pri-high" 
            class:active={undatedFilterPriority === 'High'}
            onclick={() => undatedFilterPriority = 'High'}
          >
            🔴 HIGH ({allUndatedStrikes.filter(s => s.priority === 'High').length})
          </button>
          <button 
            type="button" 
            class="undated-pri-btn pri-med" 
            class:active={undatedFilterPriority === 'Medium'}
            onclick={() => undatedFilterPriority = 'Medium'}
          >
            🟡 MED ({allUndatedStrikes.filter(s => s.priority === 'Medium').length})
          </button>
          <button 
            type="button" 
            class="undated-pri-btn pri-low" 
            class:active={undatedFilterPriority === 'Low'}
            onclick={() => undatedFilterPriority = 'Low'}
          >
            🔵 LOW ({allUndatedStrikes.filter(s => s.priority === 'Low').length})
          </button>
        </div>
      </div>

      <!-- Undated Directives Body Content -->
      <div class="undated-body">
        {#if allUndatedStrikes.length === 0}
          <div class="undated-empty">
            <div class="empty-icon-ring indigo-glow">
              <Package size={36} class="empty-sparkle" />
            </div>
            <h4>NO UNDATED DIRECTIVES IN HOLDING BAY</h4>
            <p>Capture spontaneous ideas without a fixed date by typing <strong>@undated</strong> (or <strong>@unplanned</strong>) in directive titles, or by clicking <strong>MAKE UNDATED</strong> in the dispatch window.</p>
          </div>
        {:else if filteredUndatedStrikes.length === 0}
          <div class="undated-empty">
            <p class="no-filter-match">No undated directives match your search query or priority filter.</p>
          </div>
        {:else}
          <div class="undated-list">
            {#each filteredUndatedStrikes as us (us.id)}
              <div class="undated-row-card" class:is-deploying={activeDeployUndatedId === us.id}>
                <div class="undated-row-main">
                  <div class="undated-row-left">
                    <div class="undated-box-badge">
                      <Package size={15} />
                    </div>
                    <div class="undated-info-col">
                      <div class="undated-title-line">
                        <span class="undated-title">{us.title}</span>
                        <span class="undated-pri-tag priority-{(us.priority || 'medium').toLowerCase()}">
                          {(us.priority || 'Medium').toUpperCase()}
                        </span>
                        <span class="undated-holding-tag">HOLDING BAY</span>
                        {#if us.subtask_id}
                          <span class="undated-subtask-tag">🔗 SUBTASK LINKED</span>
                        {/if}
                      </div>
                      {#if us.notes}
                        <span class="undated-notes-text" title={us.notes}>{us.notes}</span>
                      {/if}
                    </div>
                  </div>

                  <div class="undated-row-right">
                    <span class="undated-date-meta">Captured {us.created_at || 'Recently'}</span>

                    <div class="undated-action-btns">
                      <!-- 1-Click Deploy to Today -->
                      <button
                        type="button"
                        class="btn-deploy-today"
                        title="Instantly deploy to Today's radar (STANDBY)"
                        onclick={() => deployUndatedToToday(us.id)}
                      >
                        <Zap size={14} strokeWidth={2.5} />
                        <span>TODAY</span>
                      </button>

                      <!-- Open Custom Date Schedule Drawer -->
                      <button
                        type="button"
                        class="btn-schedule-undated"
                        title="Choose custom date to deploy directive"
                        onclick={() => {
                          activeDeployUndatedId = activeDeployUndatedId === us.id ? null : us.id;
                          deployUndatedDateInput = todayFormatted;
                          isDeployUndatedPickerOpen = false;
                        }}
                      >
                        <Calendar size={14} />
                        <span>{activeDeployUndatedId === us.id ? 'CLOSE' : 'SCHEDULE'}</span>
                      </button>

                      <!-- Quick Edit -->
                      <button
                        type="button"
                        class="btn-edit-undated"
                        title="Edit undated directive"
                        onclick={(e) => {
                          openEditModal(us, e);
                        }}
                      >
                        <Edit3 size={14} />
                      </button>

                      <!-- Delete Permanently -->
                      <button
                        type="button"
                        class="btn-delete-undated"
                        title="Delete from holding bay permanently"
                        onclick={() => deleteUndatedStrike(us.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Expandable Date Picker Drawer for Custom Scheduling -->
                {#if activeDeployUndatedId === us.id}
                  <div class="deploy-drawer">
                    <div class="drawer-left">
                      <span class="drawer-label">SELECT TARGET EXECUTION DATE:</span>
                      <div class="date-picker-wrap">
                        <button 
                          type="button" 
                          class="date-picker-btn mini-btn drawer-btn" 
                          onclick={(e) => { e.stopPropagation(); isDeployUndatedPickerOpen = !isDeployUndatedPickerOpen; }}
                        >
                          <Calendar size={14} />
                          <span>{deployUndatedDateInput}</span>
                          <ChevronDown size={13} />
                        </button>

                        {#if isDeployUndatedPickerOpen}
                          <!-- svelte-ignore a11y_click_events_have_key_events -->
                          <!-- svelte-ignore a11y_no_static_element_interactions -->
                          <div class="date-picker-dropdown modal-popover drawer-popover" onclick={(e) => e.stopPropagation()}>
                            <Calendar2X 
                              value={deployUndatedDateInput} 
                              onselect={(d) => { deployUndatedDateInput = d; isDeployUndatedPickerOpen = false; }} 
                              minDateStr={todayFormatted}
                            />
                          </div>
                        {/if}
                      </div>
                    </div>

                    <div class="drawer-right">
                      <button 
                        type="button" 
                        class="btn-confirm-deploy"
                        onclick={() => deployUndatedToDate(us.id, deployUndatedDateInput)}
                      >
                        <ArrowRight size={14} />
                        <span>CONFIRM DEPLOYMENT</span>
                      </button>
                      <button 
                        type="button" 
                        class="btn-cancel-drawer"
                        onclick={() => { activeDeployUndatedId = null; isDeployUndatedPickerOpen = false; }}
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                {/if}

              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .strikes-container {
    display: flex; flex-direction: column; height: calc(100vh - 64px);
    background: #04070e; color: #f3e8ff; padding: 16px 20px; gap: 14px; box-sizing: border-box;
  }

  /* HIGH-ELEVATION LAYERED FILTER BAR (z-index: 500) */
  .strikes-header {
    position: relative; z-index: 500;
    display: flex; align-items: center; gap: 10px;
    background: rgba(12, 19, 34, 0.92); backdrop-filter: blur(8px);
    border: 1.5px solid rgba(245, 158, 11, 0.35);
    padding: 10px 16px; border-radius: 20px; box-shadow: 0 12px 35px rgba(0, 0, 0, 0.6), 0 0 25px rgba(245, 158, 11, 0.1);
    width: 100%; box-sizing: border-box;
  }

  /* CUSTOM ANIMATED GLASSMORPHIC DROPDOWN COMPONENT */
  .custom-dd-wrap {
    position: relative; display: flex; align-items: center; flex-shrink: 0;
  }

  .custom-dd-trigger {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 9px 12px; font-size: 13px; font-weight: 800; word-spacing: 0.12em;
    background: #0b1322; border: 1.5px solid rgba(255, 255, 255, 0.18);
    border-radius: 14px; color: #e2e8f0; cursor: pointer; white-space: nowrap;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4); transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
    box-sizing: border-box; flex-shrink: 0;
  }

  /* ABSOLUTELY RIGID FIXED WIDTHS (WIDTH = MIN-WIDTH = MAX-WIDTH) — ZERO SIZE MUTATION */
  .custom-dd-wrap:has(.mode-trigger), .custom-dd-trigger.mode-trigger { width: 110px !important; min-width: 110px !important; max-width: 110px !important; }
  .custom-dd-wrap:has(.pri-trigger), .custom-dd-trigger.pri-trigger { width: 135px !important; min-width: 135px !important; max-width: 135px !important; }
  .custom-dd-wrap:has(.status-trigger), .custom-dd-trigger.status-trigger { width: 140px !important; min-width: 140px !important; max-width: 140px !important; }
  .custom-dd-wrap:has(.conn-trigger), .custom-dd-trigger.conn-trigger { width: 155px !important; min-width: 155px !important; max-width: 155px !important; }

  /* OVERRIDE FOR MODAL FULL-WIDTH PRIORITY DROPDOWN */
  .modal-dd-wrap, .modal-trigger-full { width: 100% !important; min-width: 100% !important; max-width: 100% !important; }

  .custom-dd-trigger span {
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; text-align: left;
  }

  .custom-dd-trigger:hover, .custom-dd-trigger.active {
    border-color: rgba(245, 158, 11, 0.8);
    box-shadow: 0 0 16px rgba(245, 158, 11, 0.3);
    transform: translateY(-1px);
  }

  .custom-dd-trigger.mode-trigger {
    color: #f59e0b; border-color: rgba(245, 158, 11, 0.6); font-weight: 900;
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(10, 16, 28, 0.98));
  }

  .custom-dd-trigger.is-high { border-color: rgba(239, 68, 68, 0.7); background: rgba(239, 68, 68, 0.2); }
  .custom-dd-trigger.is-med { border-color: rgba(245, 158, 11, 0.7); background: rgba(245, 158, 11, 0.2); }
  .custom-dd-trigger.is-low { border-color: rgba(59, 130, 246, 0.7); background: rgba(59, 130, 246, 0.2); }

  .custom-dd-trigger.is-standby { border-color: rgba(245, 158, 11, 0.7); background: rgba(245, 158, 11, 0.2); }
  .custom-dd-trigger.is-engaged { border-color: rgba(59, 130, 246, 0.7); background: rgba(59, 130, 246, 0.2); }
  .custom-dd-trigger.is-neutralized { border-color: rgba(16, 185, 129, 0.7); background: rgba(16, 185, 129, 0.2); }

  .custom-dd-trigger.is-linked { border-color: rgba(168, 85, 247, 0.7); background: rgba(168, 85, 247, 0.2); }
  .custom-dd-trigger.is-indep { border-color: rgba(56, 189, 248, 0.7); background: rgba(56, 189, 248, 0.2); }

  :global(.dd-chevron) { color: #f59e0b; transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
  :global(.dd-chevron.rotated) { transform: rotate(180deg); }

  /* CUSTOM DROPDOWN POPUP MENU */
  .custom-dd-menu {
    position: absolute; top: calc(100% + 8px); left: 0; min-width: 100%; width: max-content; z-index: 1000;
    background: rgba(8, 14, 26, 0.98); backdrop-filter: blur(10px);
    border: 1.5px solid rgba(245, 158, 11, 0.45); border-radius: 16px; padding: 6px;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85), 0 0 25px rgba(245, 158, 11, 0.15);
    display: flex; flex-direction: column; gap: 4px; animation: ddSlideIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes ddSlideIn {
    from { opacity: 0; transform: translateY(-6px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .custom-dd-item {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 9px 14px; border-radius: 10px; font-size: 13px; font-weight: 800;
    background: transparent; border: none; color: #e2e8f0; cursor: pointer; text-align: left;
    transition: all 0.15s ease;
  }

  .custom-dd-item:hover {
    background: rgba(245, 158, 11, 0.18); color: #ffffff; transform: translateX(2px);
  }

  .custom-dd-item.selected {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(217, 119, 6, 0.2));
    color: #f59e0b; font-weight: 900;
  }
  :global(.check-icon) { color: #f59e0b; }

  /* MULTI-SELECT CHECKBOX STYLES */
  .multi-select-item {
    display: flex; align-items: center; justify-content: flex-start; gap: 10px;
  }
  .checkbox-box {
    width: 16px; height: 16px; border-radius: 4px;
    border: 1.5px solid rgba(255, 255, 255, 0.3); background: rgba(6, 10, 18, 0.8);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    transition: all 0.15s ease;
  }
  .checkbox-box.checked {
    background: #f59e0b; border-color: #f59e0b;
    box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
  }
  :global(.cb-check) { color: #000000; stroke-width: 3; }
  .custom-dd-trigger.is-active-filter {
    border-color: rgba(245, 158, 11, 0.7); background: rgba(245, 158, 11, 0.2);
  }

  /* CENTER DATE NAVIGATOR */
  .date-navigator-center { display: flex; align-items: center; gap: 6px; }
  .glass-nav-btn, .glass-today-btn {
    display: flex; align-items: center; justify-content: center;
    padding: 8px 12px; font-size: 12px; font-weight: 900; letter-spacing: 0.06em;
    color: #ffffff; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 12px; cursor: pointer; transition: all 0.15s ease;
  }
  .glass-nav-btn:hover { background: rgba(255, 255, 255, 0.14); border-color: rgba(255, 255, 255, 0.3); }
  .glass-today-btn {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.35), rgba(217, 119, 6, 0.25));
    border-color: rgba(245, 158, 11, 0.65); color: #f59e0b;
  }
  .glass-today-btn:hover { background: rgba(245, 158, 11, 0.5); }

  .nav-calendar-wrap { position: relative; }
  .glass-date-trigger {
    display: flex; align-items: center; gap: 8px; padding: 8px 14px;
    font-size: 13.5px; font-weight: 800; color: #c4b5fd; word-spacing: 0.12em;
    background: rgba(8, 14, 26, 0.95); border: 1.5px solid rgba(245, 158, 11, 0.45);
    border-radius: 12px; cursor: pointer; transition: all 0.2s ease;
  }
  .glass-date-trigger:hover { border-color: rgba(245, 158, 11, 0.8); box-shadow: 0 0 14px rgba(245, 158, 11, 0.3); }
  :global(.cal-icon) { color: #f59e0b; }
  .nav-popover { position: absolute; top: calc(100% + 10px); left: 50%; transform: translateX(-50%); z-index: 1000; }

  /* DYNAMIC FLEXIBLE SEARCH BOX — PROMINENT GLOWING AMBER CURSOR */
  .glass-search-box {
    flex: 1; min-width: 140px; display: flex; align-items: center; position: relative;
    background: rgba(8, 14, 26, 0.98); border: 1.5px solid rgba(255, 255, 255, 0.2);
    border-radius: 14px; padding: 0 34px 0 14px; height: 38px;
    box-shadow: inset 0 2px 6px rgba(0,0,0,0.5); transition: all 0.2s ease;
  }
  .glass-search-box:focus-within {
    border-color: #f59e0b;
    box-shadow: 0 0 16px rgba(245, 158, 11, 0.4), inset 0 2px 6px rgba(0,0,0,0.6);
  }

  .glass-search-input {
    width: 100%; background: transparent; border: none; outline: none; outline-style: none;
    color: #ffffff; font-size: 13.5px; font-weight: 700; word-spacing: 0.12em;
    caret-color: #f59e0b !important;
  }
  .glass-search-input:focus { outline: none !important; box-shadow: none !important; }

  .btn-search-clear-strikes {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #fca5a5;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
    padding: 0;
  }
  .btn-search-clear-strikes:hover {
    background: rgba(239, 68, 68, 0.3);
    border-color: rgba(239, 68, 68, 0.7);
    color: #fee2e2;
    transform: translateY(-50%) scale(1.1);
  }

  .pending-nav-trigger-btn {
    display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 12px; height: 38px;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(185, 28, 28, 0.2));
    border: 1.5px solid rgba(239, 68, 68, 0.65); border-radius: 14px;
    font-size: 12px; font-weight: 900; color: #fca5a5; letter-spacing: 0.05em;
    cursor: pointer; transition: all 0.2s ease; flex-shrink: 0;
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.3);
  }
  .pending-nav-trigger-btn:hover {
    background: #ef4444; color: #ffffff; border-color: #ef4444;
    box-shadow: 0 0 18px rgba(239, 68, 68, 0.6); transform: translateY(-1px);
  }
  :global(.pending-nav-icon) { color: #fca5a5; }
  .pending-nav-trigger-btn:hover :global(.pending-nav-icon) { color: #ffffff; }

  /* DYNAMIC ACTIVE STRIKES COUNTER BADGE (TACTICAL PILL) */
  .glass-counter-badge {
    display: flex; align-items: center; justify-content: center; gap: 8px; padding: 0 16px; height: 38px;
    width: auto !important; min-width: 140px !important; flex-shrink: 0 !important;
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(217, 119, 6, 0.14));
    border: 1.5px solid rgba(245, 158, 11, 0.55); border-radius: 9999px;
    font-size: 12.5px; font-weight: 900; color: #f59e0b; letter-spacing: 0.05em; word-spacing: 0.08em;
    white-space: nowrap; box-sizing: border-box; transition: all 0.2s ease;
  }
  .glass-counter-badge.is-complete {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.28), rgba(5, 150, 105, 0.18));
    border-color: rgba(52, 211, 153, 0.7); color: #34d399;
    box-shadow: 0 0 16px rgba(16, 185, 129, 0.35);
  }
  .glass-counter-badge.is-complete :global(.counter-zap) { color: #34d399; }
  :global(.counter-zap) { color: #f59e0b; }

  /* + LAUNCH STRIKE MODAL BUTTON IN FILTER BAR */
  .btn-launch-strike-modal {
    display: flex; align-items: center; justify-content: center; width: 38px; height: 38px;
    background: linear-gradient(135deg, #f59e0b, #d97706); border: none; border-radius: 50%;
    color: #000000; cursor: pointer; flex-shrink: 0; transition: all 0.18s ease;
    box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);
  }
  .btn-launch-strike-modal:hover { transform: scale(1.1); box-shadow: 0 6px 20px rgba(245, 158, 11, 0.65); }

  /* 3-DAYS COMPACT STRIKE CARD & ADD PLACEHOLDER BUTTON */
  .compact-three-day-card {
    display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px;
    background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px; cursor: pointer; transition: all 0.15s ease;
  }
  .compact-three-day-card:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(245, 158, 11, 0.5); transform: translateY(-1px); }
  .compact-three-day-card.neutralized { opacity: 0.5; background: rgba(0,0,0,0.3); }
  .compact-three-day-card.neutralized .compact-strike-title { text-decoration: line-through; color: #64748b; }
  .card-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
  .compact-strike-title { font-size: 13px; font-weight: 800; color: #f3e8ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .status-dot.standby { background: #f59e0b; box-shadow: 0 0 8px rgba(245, 158, 11, 0.6); }
  .status-dot.engaged { background: #60a5fa; box-shadow: 0 0 8px rgba(96, 165, 250, 0.6); }
  .status-dot.neutralized { background: #34d399; box-shadow: 0 0 8px rgba(52, 211, 153, 0.6); }
  .status-dot.pending { background: #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.6); }
  .status-dot.aborted { background: #64748b; }

  .status-pill-mini {
    font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 6px; letter-spacing: 0.04em; flex-shrink: 0;
  }
  .status-pill-mini.standby { color: #fde047; background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.4); }
  .status-pill-mini.engaged { color: #93c5fd; background: rgba(96, 165, 250, 0.2); border: 1px solid rgba(96, 165, 250, 0.4); }
  .status-pill-mini.neutralized { color: #a7f3d0; background: rgba(52, 211, 153, 0.2); border: 1px solid rgba(52, 211, 153, 0.4); }
  .status-pill-mini.pending { color: #fca5a5; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); }
  .status-pill-mini.aborted { color: #cbd5e1; background: rgba(100, 116, 139, 0.2); border: 1px solid rgba(100, 116, 139, 0.4); }

  .col-empty-add-btn {
    display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 12px;
    background: rgba(15, 23, 42, 0.4); border: 1px dashed rgba(255, 255, 255, 0.15); border-radius: 12px;
    color: #94a3b8; font-size: 12px; font-weight: 800; cursor: pointer; transition: all 0.15s ease;
  }
  .col-empty-add-btn:hover { background: rgba(245, 158, 11, 0.12); border-color: rgba(245, 158, 11, 0.5); color: #f59e0b; }

  /* QUICK DISPATCH BAR & CARDS */
  .quick-add-bar {
    background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 12px 18px; border-radius: 16px; position: relative; z-index: 10;
  }
  .add-form { display: flex; gap: 12px; align-items: center; }

  .strike-input {
    flex: 1; padding: 12px 18px; font-size: 15px; font-weight: 800; word-spacing: 0.12em;
    background: rgba(6, 10, 18, 0.95); border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 14px; color: #ffffff; outline: none; caret-color: #f59e0b;
  }
  .date-picker-wrap { position: relative; }
  .date-picker-btn {
    display: flex; align-items: center; gap: 8px; padding: 12px 16px;
    font-size: 13px; font-weight: 800; background: rgba(6, 10, 18, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 14px; color: #c4b5fd; cursor: pointer;
  }
  .date-picker-dropdown {
    position: absolute; top: calc(100% + 8px); left: 0; z-index: 1000;
  }

  .priority-select {
    appearance: none; padding: 12px 32px 12px 16px; font-size: 12px; font-weight: 900;
    background: rgba(6, 10, 18, 0.95); border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 14px; color: #ffffff; outline: none;
  }

  .btn-dispatch-strike {
    display: flex; align-items: center; gap: 8px; padding: 12px 22px;
    font-size: 13px; font-weight: 900; letter-spacing: 0.06em; color: #ffffff;
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.5), rgba(217, 119, 6, 0.4));
    border: 1px solid rgba(245, 158, 11, 0.6); border-radius: 14px; cursor: pointer;
  }

  /* TOP PENDING DIRECTIVES ACTION CARD BANNER */
  .pending-action-card {
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    background: linear-gradient(135deg, rgba(30, 12, 16, 0.95), rgba(18, 8, 12, 0.98));
    border: 1.5px solid rgba(239, 68, 68, 0.65); border-radius: 18px; padding: 14px 20px;
    box-shadow: 0 8px 25px rgba(239, 68, 68, 0.25), inset 0 0 15px rgba(239, 68, 68, 0.15);
    cursor: pointer; transition: all 0.2s ease;
  }
  .pending-action-card:hover {
    border-color: #ef4444; transform: translateY(-2px);
    box-shadow: 0 12px 30px rgba(239, 68, 68, 0.4);
  }

  .pending-card-left { display: flex; align-items: center; gap: 14px; }
  .pending-pulse-ring {
    width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    background: rgba(239, 68, 68, 0.2); border: 1.5px solid rgba(239, 68, 68, 0.6);
    animation: pendingIconPulse 1.2s ease-in-out infinite alternate;
  }
  @keyframes pendingIconPulse {
    0% { transform: scale(0.96); box-shadow: 0 0 6px rgba(239, 68, 68, 0.4); }
    100% { transform: scale(1.06); box-shadow: 0 0 18px rgba(239, 68, 68, 0.8); }
  }
  :global(.pending-pulse-icon) { color: #fca5a5; }

  .pending-card-text { display: flex; flex-direction: column; gap: 2px; }
  .pending-title-row { display: flex; align-items: center; gap: 10px; }
  .pending-card-title { font-size: 14px; font-weight: 900; color: #fca5a5; letter-spacing: 0.06em; }
  .pending-badge-count {
    font-size: 10px; font-weight: 900; padding: 2px 7px; border-radius: 6px;
    background: #ef4444; color: #ffffff; letter-spacing: 0.06em;
  }
  .pending-card-sub { font-size: 12px; font-weight: 600; color: #cbd5e1; }

  .btn-resolve-pending {
    display: flex; align-items: center; gap: 6px; padding: 10px 18px;
    background: linear-gradient(135deg, #ef4444, #dc2626); border: none; border-radius: 12px;
    color: #ffffff; font-size: 12px; font-weight: 900; letter-spacing: 0.06em; cursor: pointer;
    box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4); transition: all 0.15s ease;
  }
  .btn-resolve-pending:hover { transform: scale(1.03); background: #f87171; }

  /* PENDING RESOLUTION MODAL STYLES */
  .pending-modal-dialog { width: 620px !important; max-width: 90vw; }
  .pending-header { color: #fca5a5 !important; border-bottom: 1px solid rgba(239, 68, 68, 0.3); }
  :global(.pending-modal-icon) { color: #ef4444; }

  .pending-modal-body { display: flex; flex-direction: column; gap: 14px; max-height: 60vh; overflow-y: auto; }
  .pending-instruction { font-size: 13px; font-weight: 600; color: #cbd5e1; line-height: 1.5; margin: 0; }

  .pending-items-list { display: flex; flex-direction: column; gap: 10px; }
  .pending-row-card {
    display: flex; align-items: center; justify-content: space-between; gap: 14px;
    padding: 12px 16px; background: rgba(15, 23, 42, 0.8); border: 1.5px solid rgba(239, 68, 68, 0.35);
    border-radius: 14px; transition: all 0.2s ease;
  }
  .pending-row-card:hover { border-color: rgba(239, 68, 68, 0.7); }

  .pending-row-info { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
  .pending-row-title { font-size: 14.5px; font-weight: 800; color: #ffffff; word-spacing: 0.1em; }
  .pending-row-meta { display: flex; align-items: center; gap: 12px; }
  .meta-item.permits { color: #fde047; }

  .pending-row-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .btn-pending-action {
    display: flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 11.5px; font-weight: 900;
    border-radius: 10px; cursor: pointer; transition: all 0.15s ease; border: 1px solid transparent;
  }
  .btn-pending-action.reschedule {
    background: rgba(245, 158, 11, 0.2); color: #f59e0b; border-color: rgba(245, 158, 11, 0.4);
  }
  .btn-pending-action.reschedule:hover:not(:disabled) { background: rgba(245, 158, 11, 0.35); }
  .btn-pending-action.reschedule:disabled { opacity: 0.4; cursor: not-allowed; }

  .btn-pending-action.abort {
    background: rgba(100, 116, 139, 0.2); color: #94a3b8; border-color: rgba(100, 116, 139, 0.4);
  }
  .btn-pending-action.abort:hover { background: rgba(239, 68, 68, 0.2); color: #fca5a5; border-color: rgba(239, 68, 68, 0.4); }

  .inline-reschedule-wrap { display: flex; align-items: center; gap: 6px; }
  .date-picker-btn.mini-btn { padding: 6px 10px; font-size: 12px; }
  .btn-confirm-reschedule {
    padding: 7px 12px; font-size: 11px; font-weight: 900; background: #f59e0b; color: #000; border: none; border-radius: 8px; cursor: pointer;
  }
  .btn-cancel-mini { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; }
  .modal-input-btn { width: 100%; justify-content: space-between; }

  .strikes-content-area {
    flex: 1; overflow-y: auto; background: rgba(6, 10, 18, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 18px;
  }

  /* WEEK GRID (Horizontal Scrollable with Center Today) */
  .week-calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(220px, 1fr));
    gap: 12px;
    height: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 8px;
  }
  .week-calendar-grid::-webkit-scrollbar { height: 6px; }
  .week-calendar-grid::-webkit-scrollbar-thumb { background: rgba(245, 158, 11, 0.4); border-radius: 99px; }

  .schedule-pagination-bar {
    display: flex;
    justify-content: center;
    padding: 20px 0 10px;
    width: 100%;
  }
  .btn-load-more-schedule {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 24px;
    background: rgba(245, 158, 11, 0.12);
    border: 1.5px solid rgba(245, 158, 11, 0.4);
    border-radius: 9999px;
    color: #fde68a;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.08em;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .btn-load-more-schedule:hover {
    background: rgba(245, 158, 11, 0.25);
    border-color: rgba(245, 158, 11, 0.8);
    box-shadow: 0 0 18px rgba(245, 158, 11, 0.35);
    transform: translateY(-1px);
  }
  .week-column {
    background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; cursor: pointer;
  }
  .week-column.is-today { border-color: rgba(245, 158, 11, 0.7); background: rgba(245, 158, 11, 0.05); }
  .week-column.is-sunday { border-top: 3px solid #ef4444; }
  .week-column.is-saturday { border-top: 3px solid #38bdf8; }

  .col-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px; background: rgba(0, 0, 0, 0.3); border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .col-day-name { font-size: 11px; font-weight: 900; color: #94a3b8; }
  .week-column.is-sunday .col-day-name { color: #f87171; }
  .week-column.is-saturday .col-day-name { color: #38bdf8; }

  .col-day-num { font-size: 15px; font-weight: 900; color: #ffffff; }
  .col-today-badge { font-size: 9px; font-weight: 900; padding: 2px 5px; background: #f59e0b; color: #000; border-radius: 4px; }

  .col-body { flex: 1; padding: 10px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
  .col-empty { font-size: 11.5px; color: #64748b; font-weight: 700; text-align: center; padding-top: 20px; }

  .grid-strike-card {
    display: flex; align-items: center; gap: 8px; padding: 8px 10px;
    background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px; font-size: 12.5px; font-weight: 800; cursor: pointer;
  }
  .grid-strike-card.neutralized { opacity: 0.5; text-decoration: line-through; }
  .grid-strike-card.engaged { border-color: rgba(59, 130, 246, 0.6); }
  .grid-strike-title { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .grid-priority-dot { width: 6px; height: 6px; border-radius: 50%; }
  .grid-priority-dot.high { background: #ef4444; }
  .grid-priority-dot.medium { background: #f59e0b; }
  .grid-priority-dot.low { background: #3b82f6; }

  .card-cb-btn { background: none; border: none; padding: 0; cursor: pointer; display: flex; }

  /* ULTRA-TACTICAL DAY VIEW STYLES */
  .day-view-container {
    display: flex; flex-direction: column; gap: 16px; height: 100%; box-sizing: border-box;
  }

  .day-view-banner {
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(8, 14, 26, 0.95));
    backdrop-filter: blur(8px); border: 1.5px solid rgba(245, 158, 11, 0.35);
    padding: 16px 20px; border-radius: 18px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  }

  .day-banner-info { display: flex; flex-direction: column; gap: 4px; }
  .banner-title-row { display: flex; align-items: center; gap: 10px; }
  :global(.banner-zap) { color: #f59e0b; }
  .banner-title-row h2 {
    font-size: 16px; font-weight: 900; letter-spacing: 0.08em; word-spacing: 0.12em; color: #ffffff; margin: 0;
  }
  .day-badge-today {
    font-size: 10px; font-weight: 900; padding: 3px 8px; border-radius: 6px;
    background: linear-gradient(135deg, #f59e0b, #d97706); color: #000000; letter-spacing: 0.06em;
  }
  .banner-date-sub { font-size: 12.5px; font-weight: 700; color: #94a3b8; word-spacing: 0.12em; }

  .day-banner-stats { display: flex; align-items: center; gap: 10px; }
  .stat-pill {
    display: flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 10px;
    font-size: 11px; font-weight: 900; letter-spacing: 0.06em; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
  .stat-pill.standby { background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: #f59e0b; }
  .stat-pill.engaged { background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.4); color: #60a5fa; }
  .stat-pill.pending { background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); color: #fca5a5; }
  .stat-pill.neutralized { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; }
  .stat-pill.aborted { background: rgba(100, 116, 139, 0.15); border: 1px solid rgba(100, 116, 139, 0.4); color: #94a3b8; }

  .day-directives-scroll { flex: 1; overflow-y: auto; padding-right: 4px; }

  .day-empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 60px 20px; text-align: center; gap: 12px;
    background: rgba(15, 23, 42, 0.4); border: 1px dashed rgba(255, 255, 255, 0.12);
    border-radius: 18px;
  }
  .empty-icon-ring {
    width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    background: rgba(245, 158, 11, 0.1); border: 1.5px solid rgba(245, 158, 11, 0.35);
  }
  :global(.empty-sparkle) { color: #f59e0b; }
  .day-empty-state h4 { font-size: 14.5px; font-weight: 900; color: #f3e8ff; letter-spacing: 0.06em; margin: 0; }
  .day-empty-state p { font-size: 13px; font-weight: 600; color: #94a3b8; max-width: 420px; margin: 0; line-height: 1.5; }

  .day-directives-list { display: flex; flex-direction: column; gap: 12px; }

  .day-strike-card {
    display: flex; align-items: center; gap: 16px; padding: 16px 20px;
    background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(12px);
    border: 1.5px solid rgba(255, 255, 255, 0.1); border-radius: 16px;
    cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  }
  .day-strike-card:hover {
    border-color: rgba(245, 158, 11, 0.6); transform: translateY(-2px);
    box-shadow: 0 10px 28px rgba(245, 158, 11, 0.2);
  }
  .day-strike-card.engaged {
    border-color: rgba(59, 130, 246, 0.6); background: rgba(15, 25, 48, 0.85);
  }
  .day-strike-card.pending {
    border-color: rgba(239, 68, 68, 0.7); background: rgba(30, 12, 16, 0.85);
    box-shadow: 0 0 18px rgba(239, 68, 68, 0.25);
  }
  .day-strike-card.aborted {
    opacity: 0.5; background: rgba(6, 10, 18, 0.6); border-color: rgba(100, 116, 139, 0.4);
  }
  .day-strike-card.aborted .day-strike-title { text-decoration: line-through; color: #64748b; }
  .day-strike-card.neutralized {
    opacity: 0.6; background: rgba(6, 10, 18, 0.6); border-color: rgba(16, 185, 129, 0.35);
  }
  .day-strike-card.neutralized .day-strike-title { text-decoration: line-through; color: #64748b; }

  /* AUTO-HIGHLIGHT ANIMATION FOR CREATED/UPDATED STRIKES */
  .day-strike-card.auto-highlight {
    animation: strikeGlowPulse 0.6s ease-in-out infinite alternate !important;
    border-color: #f59e0b !important;
  }

  @keyframes strikeGlowPulse {
    0% { box-shadow: 0 0 8px rgba(245, 158, 11, 0.4), inset 0 0 12px rgba(245, 158, 11, 0.2); }
    100% { box-shadow: 0 0 25px rgba(245, 158, 11, 0.8), inset 0 0 20px rgba(245, 158, 11, 0.35); }
  }

  .day-status-toggle { background: none; border: none; padding: 0; cursor: pointer; display: flex; }
  :global(.status-icon.pending) { color: #ef4444; }
  :global(.status-icon.aborted) { color: #64748b; }

  .day-strike-body { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .day-strike-title { font-size: 15px; font-weight: 800; word-spacing: 0.12em; color: #ffffff; }
  .strike-search-highlight {
    background: #facc15 !important;
    color: #000000 !important;
    font-weight: 900 !important;
    border-radius: 4px !important;
    padding: 1px 5px !important;
    box-shadow: 0 0 12px rgba(250, 204, 21, 0.8) !important;
    display: inline-block;
    font-style: normal;
  }

  .day-strike-notes {
    font-size: 12.5px; font-weight: 600; color: #cbd5e1; margin: 0; line-height: 1.4;
  }

  .day-strike-meta { display: flex; align-items: center; gap: 14px; margin-top: 2px; }
  .meta-item {
    display: flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 700; color: #94a3b8;
  }
  .meta-item.subtask-link {
    color: #c4b5fd;
    cursor: pointer;
    padding: 2px 10px;
    border-radius: 9999px;
    background: rgba(139, 92, 246, 0.12);
    border: 1px solid rgba(139, 92, 246, 0.30);
    transition: all 0.15s ease;
  }
  .meta-item.subtask-link:hover {
    color: #ffffff;
    background: rgba(139, 92, 246, 0.35);
    border-color: rgba(168, 85, 247, 0.70);
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.40);
    transform: translateY(-1px);
  }
  .meta-item.campaign-link {
    color: #fca5a5;
    font-weight: 800;
    cursor: pointer;
    padding: 2px 10px;
    border-radius: 9999px;
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.30);
    transition: all 0.15s ease;
  }
  .meta-item.campaign-link:hover {
    color: #ffffff;
    background: rgba(239, 68, 68, 0.35);
    border-color: rgba(239, 68, 68, 0.70);
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.40);
    transform: translateY(-1px);
  }
  .meta-item.independent { color: #38bdf8; }

  /* RIGID PERFECT COLUMN ALIGNMENT */
  .col-priority-wrap {
    width: 130px !important; min-width: 130px !important; max-width: 130px !important;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .col-status-wrap {
    width: 140px !important; min-width: 140px !important; max-width: 140px !important;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .col-action-wrap {
    width: 76px !important; min-width: 76px !important; max-width: 76px !important;
    display: flex; align-items: center; justify-content: flex-end; gap: 6px; flex-shrink: 0;
  }

  .day-strike-actions { display: flex; align-items: center; gap: 16px; }
  .status-pill-lg {
    display: inline-block; text-align: center; width: 115px;
    font-size: 11px; font-weight: 900; padding: 6px 0; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.06em;
  }
  .status-pill-lg.standby { background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4); }
  .status-pill-lg.engaged { background: rgba(59, 130, 246, 0.25); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); }
  .status-pill-lg.pending { background: rgba(239, 68, 68, 0.25); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.5); }
  .status-pill-lg.neutralized { background: rgba(16, 185, 129, 0.25); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
  .status-pill-lg.aborted { background: rgba(100, 116, 139, 0.2); color: #94a3b8; border: 1px solid rgba(100, 116, 139, 0.4); }

  .card-action-btns { display: flex; align-items: center; gap: 6px; }
  .action-icon-btn {
    width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
    background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.12);
    color: #94a3b8; cursor: pointer; transition: all 0.15s ease;
  }
  .action-icon-btn.repeat:hover { background: rgba(168, 85, 247, 0.2); border-color: rgba(168, 85, 247, 0.5); color: #c084fc; }
  .action-icon-btn.edit:hover { background: rgba(245, 158, 11, 0.2); border-color: rgba(245, 158, 11, 0.5); color: #f59e0b; }
  .action-icon-btn.delete:hover { background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.5); color: #ef4444; }
  .action-icon-btn.abort { color: #f87171; border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.08); }
  .action-icon-btn.abort:hover:not(:disabled) { background: rgba(239, 68, 68, 0.25); border-color: rgba(239, 68, 68, 0.6); color: #ef4444; box-shadow: 0 0 10px rgba(239, 68, 68, 0.3); }
  .action-icon-btn.abort:disabled { opacity: 0.35; cursor: not-allowed; border-color: rgba(239, 68, 68, 0.15) !important; color: #64748b !important; }
  .btn-abort-symbol { font-size: 13px; font-weight: 900; line-height: 1; letter-spacing: -0.02em; }
  .action-icon-btn.rc-locked {
    opacity: 0.35; cursor: not-allowed;
    color: #475569 !important; border-color: rgba(71, 85, 105, 0.3) !important;
  }
  .action-icon-btn.rc-locked:hover { background: transparent !important; border-color: rgba(71, 85, 105, 0.3) !important; color: #475569 !important; }

  /* CUSTOM RECURRENCE MODAL STYLES */
  .recurrence-modal-dialog {
    width: 620px !important; max-width: 95vw !important;
    border-color: rgba(168, 85, 247, 0.45) !important;
    box-shadow: 0 28px 72px rgba(0, 0, 0, 0.95), 0 0 40px rgba(168, 85, 247, 0.2) !important;
  }
  .recurrence-header { color: #c084fc !important; }
  :global(.recurrence-modal-icon) { color: #a855f7; }
  
  .recurrence-base-card {
    background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(168, 85, 247, 0.3);
    border-radius: 14px; padding: 12px 16px; display: flex; flex-direction: column; gap: 4px;
  }
  .base-label { font-size: 10px; font-weight: 900; color: #a855f7; letter-spacing: 0.08em; }
  .base-title { font-size: 14px; font-weight: 800; color: #ffffff; }
  .base-date { font-size: 12px; color: #94a3b8; }
  .base-date strong { color: #f59e0b; }

  .recurrence-interval-input-wrap { display: flex; gap: 10px; align-items: center; }
  .num-input { width: 100px !important; text-align: center; }
  .freq-select { flex: 1; }

  .recurrence-end-options { display: flex; gap: 12px; }
  .recurrence-radio-label {
    flex: 1; display: flex; align-items: center; gap: 8px; padding: 10px 14px;
    background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px; cursor: pointer; font-size: 12.5px; font-weight: 700; color: #94a3b8;
    transition: all 0.15s ease;
  }
  .recurrence-radio-label:hover { background: rgba(255, 255, 255, 0.06); }
  .recurrence-radio-label.selected {
    background: rgba(168, 85, 247, 0.15); border-color: rgba(168, 85, 247, 0.5); color: #e9d5ff;
  }

  .weekdays-btn-row { display: flex; gap: 8px; justify-content: space-between; margin-top: 4px; }
  .weekday-circle-btn {
    width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.15);
    color: #94a3b8; font-size: 13px; font-weight: 800; cursor: pointer; transition: all 0.15s ease;
  }
  .weekday-circle-btn:hover { background: rgba(168, 85, 247, 0.2); border-color: rgba(168, 85, 247, 0.5); color: #c084fc; }
  .weekday-circle-btn.active {
    background: linear-gradient(135deg, #a855f7, #7e22ce); border: none; color: #ffffff;
    box-shadow: 0 4px 14px rgba(168, 85, 247, 0.4); transform: scale(1.05);
  }
  .recurrence-save {
    background: linear-gradient(135deg, #a855f7, #7e22ce) !important; color: #ffffff !important;
    box-shadow: 0 4px 15px rgba(168, 85, 247, 0.35) !important;
    display: flex; align-items: center; gap: 6px;
  }
  .recurrence-save:hover { box-shadow: 0 6px 20px rgba(168, 85, 247, 0.5) !important; }

  /* Sequential Numbering Toggle */
  .numbering-toggle-row {
    display: flex; align-items: center; justify-content: space-between; gap: 14px;
    background: rgba(168, 85, 247, 0.06); border: 1px solid rgba(168, 85, 247, 0.2);
    border-radius: 14px; padding: 12px 16px;
  }
  .numbering-toggle-left { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
  .numbering-hint {
    font-size: 11.5px !important; color: #94a3b8; line-height: 1.5;
    white-space: normal; word-break: break-word;
  }
  .numbering-hint strong { color: #c084fc; }
  .numbering-toggle-switch {
    flex-shrink: 0; width: 46px; height: 26px; border-radius: 13px;
    background: rgba(255, 255, 255, 0.1); border: 1.5px solid rgba(255, 255, 255, 0.2);
    cursor: pointer; position: relative; transition: background 0.22s ease, border-color 0.22s ease;
    outline: none;
  }
  .numbering-toggle-switch:focus-visible {
    box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.4);
  }
  .numbering-toggle-switch.on {
    background: linear-gradient(135deg, #a855f7, #7e22ce);
    border-color: rgba(168, 85, 247, 0.8);
    box-shadow: 0 0 14px rgba(168, 85, 247, 0.4);
  }
  .toggle-knob {
    position: absolute; top: 3px; left: 3px;
    width: 18px; height: 18px; border-radius: 50%;
    background: #ffffff; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
    transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .numbering-toggle-switch.on .toggle-knob { transform: translateX(20px); }

  /* SCHEDULE VIEW TACTICAL STYLES */
  .schedule-view-container {
    display: flex; flex-direction: column; gap: 16px; height: 100%; box-sizing: border-box;
  }

  .schedule-banner {
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(8, 14, 26, 0.95));
    backdrop-filter: blur(8px); border: 1.5px solid rgba(245, 158, 11, 0.35);
    padding: 16px 20px; border-radius: 18px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  }

  .schedule-banner-title { display: flex; align-items: center; gap: 12px; }
  .banner-title-group { display: flex; flex-direction: column; gap: 2px; }
  .banner-title-group h2 {
    font-size: 16px; font-weight: 900; letter-spacing: 0.08em; word-spacing: 0.12em; color: #ffffff; margin: 0;
  }
  .banner-subtitle { font-size: 12px; font-weight: 700; color: #94a3b8; word-spacing: 0.1em; }

  .schedule-stream-scroll { flex: 1; overflow-y: auto; padding-right: 4px; }
  .schedule-timeline-list { display: flex; flex-direction: column; gap: 18px; }

  .schedule-group-card {
    background: rgba(10, 16, 28, 0.6); backdrop-filter: blur(14px);
    border: 1.5px solid rgba(255, 255, 255, 0.08); border-radius: 18px;
    padding: 16px; display: flex; flex-direction: column; gap: 12px;
    transition: border-color 0.2s ease;
  }
  .schedule-group-card.is-today {
    border-color: rgba(245, 158, 11, 0.5); background: rgba(245, 158, 11, 0.04);
  }
  .schedule-group-card.is-past {
    border-color: rgba(239, 68, 68, 0.3); opacity: 0.85;
  }

  .schedule-group-header {
    display: flex; align-items: center; justify-content: space-between;
    padding-bottom: 10px; border-bottom: 1px dashed rgba(255, 255, 255, 0.12);
  }
  .header-date-badge { display: flex; align-items: center; gap: 10px; }
  :global(.grp-cal-icon) { color: #f59e0b; }
  .grp-date-text { font-size: 14px; font-weight: 900; letter-spacing: 0.06em; color: #ffffff; }

  .grp-relative-tag {
    font-size: 10px; font-weight: 900; padding: 2px 7px; border-radius: 6px;
    background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4);
    letter-spacing: 0.06em;
  }
  .grp-relative-tag.today {
    background: linear-gradient(135deg, #f59e0b, #d97706); color: #000000; border: none;
  }
  .grp-relative-tag.past {
    background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.4);
  }

  .schedule-group-items {
    display: flex; flex-direction: column; gap: 8px;
    padding-left: 84px; border-left: 2px dashed rgba(245, 158, 11, 0.45); margin-left: 20px; margin-top: 4px;
  }
  .schedule-add-btn {
    margin-top: 2px; border-style: dashed; opacity: 0.85;
  }

  /* 3 DAYS GRID */
  .three-days-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; height: 100%; }
  .three-day-col {
    background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px; display: flex; flex-direction: column; padding: 14px; gap: 12px;
  }
  .three-day-col.is-today { border-color: rgba(245, 158, 11, 0.7); }

  /* STRIKE CARD COMMON */
  .strike-card {
    display: flex; align-items: center; gap: 14px; padding: 12px 18px;
    background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px; cursor: pointer;
  }
  .strike-card.neutralized { opacity: 0.55; background: rgba(0, 0, 0, 0.3); }
  .strike-card.neutralized .strike-title { text-decoration: line-through; color: #64748b; }
  .strike-card.engaged { border-color: rgba(59, 130, 246, 0.6); }

  .status-toggle-btn { background: none; border: none; cursor: pointer; padding: 0; display: flex; }
  :global(.status-icon.done) { color: #10b981; }
  :global(.status-icon.active) { color: #3b82f6; }
  :global(.status-icon.standby) { color: #f59e0b; }

  .strike-main { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .strike-title { font-size: 15px; font-weight: 800; word-spacing: 0.12em; color: #f3e8ff; }
  .strike-notes { font-size: 12px; color: #94a3b8; margin: 0; }

  .priority-tag { font-size: 10.5px; font-weight: 900; padding: 3px 8px; border-radius: 6px; }
  .priority-tag.high { background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.4); }
  .priority-tag.medium { background: rgba(245, 158, 11, 0.2); color: #fde047; border: 1px solid rgba(245, 158, 11, 0.4); }
  .priority-tag.low { background: rgba(59, 130, 246, 0.2); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.4); }

  .status-pill { font-size: 10.5px; font-weight: 900; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; }
  .status-pill.standby { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
  .status-pill.engaged { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
  .status-pill.neutralized { background: rgba(16, 185, 129, 0.2); color: #34d399; }

  .edit-strike-btn, .delete-strike-btn { background: none; border: none; color: #64748b; cursor: pointer; padding: 4px; }
  .edit-strike-btn:hover { color: #f59e0b; }
  .delete-strike-btn:hover { color: #ef4444; }

  /* MODAL BASE & OVERLAY (SCOPED INSIDE APP CONTENT BELOW TABNAVBAR) */
  .modal-overlay {
    position: fixed; top: 64px; bottom: 0; left: 0; right: 0; z-index: 9500;
    background: rgba(4, 7, 14, 0.88); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    padding: 24px; box-sizing: border-box;
  }
  .modal-dialog {
    width: 880px; max-width: 95vw; height: 680px; max-height: calc(100vh - 100px);
    background: rgba(11, 17, 32, 0.98); border: 1.5px solid rgba(245, 158, 11, 0.45);
    border-radius: 26px; padding: 26px 30px; display: flex; flex-direction: column; gap: 20px;
    box-shadow: 0 28px 72px rgba(0, 0, 0, 0.95), 0 0 40px rgba(245, 158, 11, 0.25);
    box-sizing: border-box; overflow: visible; position: relative; z-index: 9600;
  }

  /* MODAL SPECIFIC STYLING FOR STRIKE CREATION / EDIT DIALOG (ENLARGED & ACCESSIBLE) */
  .strike-modal-dialog {
    width: 840px !important; max-width: 92vw !important; min-width: 0 !important;
    height: auto !important; max-height: calc(100vh - 100px) !important;
    background: rgba(10, 16, 28, 0.98) !important; border: 2px solid rgba(245, 158, 11, 0.6) !important;
    border-radius: 28px !important; padding: 28px 34px !important; display: flex !important; flex-direction: column !important; gap: 20px !important;
    box-shadow: 0 32px 80px rgba(0, 0, 0, 0.95), 0 0 50px rgba(245, 158, 11, 0.3) !important;
    box-sizing: border-box !important; overflow: hidden !important; position: relative !important; z-index: 9600;
  }

  .strike-modal-body {
    flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 18px; overflow-y: auto; padding-right: 6px;
  }
  .strike-modal-body::-webkit-scrollbar { width: 6px; }
  .strike-modal-body::-webkit-scrollbar-thumb { background: rgba(245, 158, 11, 0.45); border-radius: 99px; }
  .strike-modal-body::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }

  .strike-inline-feedback-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 6px;
    animation: fadeIn 0.15s ease;
  }
  .strike-inline-feedback-bar .syntax-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 12px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 800;
    letter-spacing: 0.05em;
  }
  .strike-inline-feedback-bar .syntax-pill.priority-high {
    background: rgba(239, 68, 68, 0.18);
    border: 1px solid rgba(239, 68, 68, 0.5);
    color: #fca5a5;
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.25);
  }
  .strike-inline-feedback-bar .syntax-pill.priority-medium {
    background: rgba(245, 158, 11, 0.18);
    border: 1px solid rgba(245, 158, 11, 0.5);
    color: #fde68a;
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.25);
  }
  .strike-inline-feedback-bar .syntax-pill.priority-low {
    background: rgba(59, 130, 246, 0.18);
    border: 1px solid rgba(59, 130, 246, 0.5);
    color: #93c5fd;
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.25);
  }
  .strike-inline-feedback-bar .syntax-pill.date-detected {
    background: rgba(139, 92, 246, 0.18);
    border: 1px solid rgba(139, 92, 246, 0.5);
    color: #ddd6fe;
    box-shadow: 0 0 10px rgba(139, 92, 246, 0.25);
  }
  .strike-inline-feedback-bar .syntax-pill.date-detected.is-past {
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid rgba(239, 68, 68, 0.6);
    color: #fecaca;
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.35);
  }

  .strike-modal-dialog .form-row {
    display: flex; gap: 20px; width: 100%; box-sizing: border-box;
  }

  .strike-modal-dialog .form-group {
    display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 0;
  }

  .strike-modal-dialog .form-group label, 
  .strike-modal-dialog .form-group .field-label {
    font-size: 13px !important; font-weight: 900 !important; color: #c4b5fd !important; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 2px;
  }

  .strike-modal-dialog .modal-input,
  .strike-modal-dialog .modal-trigger-full,
  .strike-modal-dialog .date-picker-btn {
    height: 52px !important; min-height: 52px !important; max-height: 52px !important;
    padding: 0 18px !important; font-size: 16px !important; font-weight: 700 !important;
    background: rgba(6, 10, 18, 0.96) !important; border: 2px solid rgba(255, 255, 255, 0.2) !important;
    border-radius: 14px !important; color: #ffffff !important; box-sizing: border-box !important;
    width: 100% !important; min-width: 100% !important; max-width: 100% !important;
    display: flex !important; align-items: center !important; justify-content: space-between !important;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .strike-modal-dialog .modal-input-lg {
    font-size: 17.5px !important; font-weight: 800 !important; letter-spacing: 0.02em;
  }

  .strike-modal-dialog .modal-input:focus,
  .strike-modal-dialog .modal-trigger-full:focus {
    border-color: #f59e0b !important;
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.4) !important;
  }

  .strike-modal-dialog .modal-textarea {
    width: 100% !important; box-sizing: border-box !important;
    background: rgba(6, 10, 18, 0.96) !important; border: 2px solid rgba(255, 255, 255, 0.2) !important;
    border-radius: 16px !important; padding: 14px 18px !important; color: #ffffff !important;
    font-size: 15.5px !important; font-weight: 700 !important; outline: none; line-height: 1.5;
    min-height: 95px; max-height: 160px; resize: vertical;
  }

  .strike-modal-dialog .modal-textarea:focus {
    border-color: #f59e0b !important;
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.4) !important;
  }

  .strike-modal-dialog .custom-dd-wrap,
  .strike-modal-dialog .date-picker-wrap {
    width: 100% !important; min-width: 100% !important; max-width: 100% !important; position: relative !important;
  }

  .trigger-label-group {
    display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; font-size: 16px; font-weight: 700;
  }
  .modal-header { display: flex; align-items: center; justify-content: space-between; font-size: 19px; font-weight: 900; color: #f59e0b; letter-spacing: 0.08em; word-spacing: 0.08em; }
  .close-modal-btn {
    width: 40px; height: 40px; border-radius: 50% !important;
    display: inline-flex; align-items: center; justify-content: center;
    background: rgba(255, 255, 255, 0.08); border: 1.5px solid rgba(255, 255, 255, 0.18);
    color: #94a3b8; cursor: pointer; padding: 0; flex-shrink: 0;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  .close-modal-btn:hover {
    background: rgba(239, 68, 68, 0.25); border-color: rgba(239, 68, 68, 0.7);
    color: #fca5a5; transform: rotate(90deg) scale(1.08);
    box-shadow: 0 0 16px rgba(239, 68, 68, 0.4);
  }

  .modal-body { display: flex; flex-direction: column; gap: 18px; overflow-y: auto; padding-right: 6px; }
  .form-group { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 0; }
  .form-group label, .form-group .field-label { font-size: 13px; font-weight: 900; color: #a78bfa; letter-spacing: 0.08em; word-spacing: 0.06em; text-transform: uppercase; }
  .modal-input, .modal-textarea {
    width: 100%; box-sizing: border-box;
    background: rgba(6, 10, 18, 0.95); border: 1.5px solid rgba(255, 255, 255, 0.18);
    border-radius: 9999px; padding: 14px 22px; color: #ffffff; font-size: 15.5px; font-weight: 700; outline: none;
    caret-color: #f59e0b; transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .modal-textarea { border-radius: 20px !important; }
  .modal-input:focus, .modal-textarea:focus {
    border-color: rgba(245, 158, 11, 0.8); box-shadow: 0 0 16px rgba(245, 158, 11, 0.25);
  }
  .form-row { display: flex; gap: 18px; width: 100%; box-sizing: border-box; }
  .modal-footer { display: flex; justify-content: flex-end; gap: 14px; margin-top: 10px; }
  .btn-cancel { padding: 14px 28px; font-size: 14.5px; font-weight: 900; letter-spacing: 0.04em; word-spacing: 0.06em; background: rgba(255,255,255,0.06); border: 1.5px solid rgba(255,255,255,0.16); color: #fff; border-radius: 9999px; cursor: pointer; transition: all 0.15s ease; }
  .btn-cancel:hover { background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.3); }
  .btn-save { padding: 14px 34px; font-size: 14.5px; font-weight: 900; letter-spacing: 0.04em; word-spacing: 0.06em; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; color: #000; border-radius: 9999px; cursor: pointer; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.35); transition: all 0.15s ease; }
  .btn-save:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(245, 158, 11, 0.55); }

  /* RIGID 960px x 680px PENDING DIRECTIVES RESOLUTION WINDOW */
  .pending-modal-dialog {
    width: 960px !important; min-width: 960px !important; max-width: 960px !important;
    height: 680px !important; min-height: 680px !important; max-height: 680px !important;
    border-color: rgba(239, 68, 68, 0.55) !important; box-shadow: 0 28px 72px rgba(0,0,0,0.95), 0 0 40px rgba(239, 68, 68, 0.25) !important;
  }
  .pending-header { color: #fca5a5 !important; border-bottom: 1px solid rgba(239, 68, 68, 0.3); padding-bottom: 14px; flex-shrink: 0; }
  :global(.pending-modal-icon) { color: #ef4444; }
  .pending-live-badge {
    font-size: 11px; font-weight: 900; color: #ffffff; background: rgba(239, 68, 68, 0.85);
    padding: 3px 10px; border-radius: 9999px; letter-spacing: 0.05em; margin-left: 6px;
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
  }

  .pending-modal-body { flex: 1; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; padding-right: 8px; }
  .pending-instruction { font-size: 13.5px; font-weight: 600; color: #cbd5e1; line-height: 1.6; word-spacing: 0.08em; margin: 0; }

  .pending-items-list { display: flex; flex-direction: column; gap: 14px; }
  .pending-row-card {
    display: flex; flex-direction: column; gap: 14px;
    padding: 16px 20px; background: rgba(15, 23, 42, 0.85); border: 1.5px solid rgba(239, 68, 68, 0.35);
    border-radius: 20px; transition: all 0.2s ease; box-sizing: border-box; position: relative;
  }
  .pending-row-card:hover { border-color: rgba(239, 68, 68, 0.7); box-shadow: 0 4px 20px rgba(239, 68, 68, 0.15); }
  .pending-row-card.is-editing { border-color: #f59e0b; background: rgba(15, 23, 42, 0.95); box-shadow: 0 0 25px rgba(245, 158, 11, 0.2); }

  .pending-row-main { display: flex; align-items: center; justify-content: space-between; gap: 18px; width: 100%; }

  .pending-row-info { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
  .pending-row-title { font-size: 15.5px; font-weight: 800; color: #ffffff; word-spacing: 0.12em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pending-row-meta { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
  .meta-item.permits { color: #fde047; }

  .pending-row-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .btn-pending-action {
    display: flex; align-items: center; gap: 7px; padding: 9px 18px; font-size: 12.5px; font-weight: 900;
    letter-spacing: 0.04em; word-spacing: 0.06em;
    border-radius: 9999px; cursor: pointer; transition: all 0.15s ease; border: 1px solid transparent; white-space: nowrap;
  }
  .btn-pending-action.reschedule {
    background: rgba(245, 158, 11, 0.2); color: #f59e0b; border-color: rgba(245, 158, 11, 0.45);
  }
  .btn-pending-action.reschedule:hover:not(:disabled) { background: rgba(245, 158, 11, 0.35); border-color: #f59e0b; }
  .btn-pending-action.reschedule:disabled { opacity: 0.4; cursor: not-allowed; }

  .btn-pending-action.abort {
    background: rgba(239, 68, 68, 0.18); color: #fca5a5; border-color: rgba(239, 68, 68, 0.45);
  }
  .btn-pending-action.abort:hover { background: rgba(239, 68, 68, 0.35); border-color: #ef4444; color: #ffffff; }

  /* RESCHEDULE FULL DRAWER */
  .reschedule-drawer {
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    padding: 14px 20px; background: rgba(10, 16, 28, 0.98); border: 1.5px solid rgba(245, 158, 11, 0.6);
    border-radius: 20px; box-shadow: inset 0 0 15px rgba(245, 158, 11, 0.1); width: 100%; box-sizing: border-box;
  }
  .drawer-left { display: flex; align-items: center; gap: 14px; flex: 1; }
  .drawer-label { font-size: 11.5px; font-weight: 900; color: #f59e0b; letter-spacing: 0.08em; word-spacing: 0.06em; white-space: nowrap; }
  
  .drawer-btn { padding: 9px 16px !important; font-size: 13px !important; border-radius: 9999px !important; border-color: rgba(245, 158, 11, 0.5) !important; color: #ffffff !important; background: rgba(6, 10, 18, 0.95) !important; }
  
  .drawer-right { display: flex; align-items: center; gap: 10px; }
  .btn-confirm-reschedule {
    padding: 9px 20px; font-size: 12px; font-weight: 900; letter-spacing: 0.04em; word-spacing: 0.06em; background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; border: none; border-radius: 9999px; cursor: pointer; white-space: nowrap; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3); transition: all 0.15s ease;
  }
  .btn-confirm-reschedule:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(245, 158, 11, 0.55); }
  
  .btn-cancel-drawer {
    padding: 9px 18px; font-size: 12px; font-weight: 900; letter-spacing: 0.04em; word-spacing: 0.06em; background: rgba(255, 255, 255, 0.08); border: 1.5px solid rgba(255, 255, 255, 0.18); color: #ffffff; border-radius: 9999px; cursor: pointer; transition: all 0.15s ease;
  }
  .btn-cancel-drawer:hover { background: rgba(255, 255, 255, 0.16); border-color: rgba(255, 255, 255, 0.3); }

  .reschedule-popover, .modal-popover {
    position: absolute; top: calc(100% + 8px); left: 0; z-index: 10500 !important;
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.95), 0 0 25px rgba(245, 158, 11, 0.3) !important;
  }
  .modal-input-btn { width: 100%; justify-content: space-between; box-sizing: border-box; }

  /* ── Keyboard Navigation Focus Ring for Day-View Strike Cards ── */
  .day-strike-card.kb-focused {
    border-color: rgba(245, 158, 11, 0.9) !important;
    box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.45), 0 0 20px rgba(245, 158, 11, 0.3), inset 0 0 10px rgba(245, 158, 11, 0.08) !important;
    transform: translateX(4px) !important;
    outline: none;
  }

  /* ═══ TACTICAL BLUEPRINTS STYLES ═══ */

  /* Blueprint Pill in Day View Banner */
  .blueprint-pill {
    background: rgba(147, 51, 234, 0.2) !important;
    border: 1px solid rgba(147, 51, 234, 0.5) !important;
    color: #c084fc !important;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-left: auto;
  }
  .blueprint-pill:hover {
    background: rgba(147, 51, 234, 0.35) !important;
    border-color: rgba(147, 51, 234, 0.8) !important;
    color: #e9d5ff !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(147, 51, 234, 0.3);
  }

  /* Blueprints Window */
  .blueprints-drawer {
    width: 980px !important;
    min-width: 800px !important;
    max-width: 95vw !important;
    height: 640px !important;
    min-height: 520px !important;
    max-height: calc(100vh - 60px) !important;
    background: rgba(8, 12, 22, 0.98) !important;
    border: 2px solid rgba(168, 85, 247, 0.5) !important;
    border-radius: 26px !important;
    display: flex !important;
    flex-direction: column !important;
    box-shadow: 0 32px 80px rgba(0, 0, 0, 0.95), 0 0 45px rgba(168, 85, 247, 0.25) !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
    padding: 0 !important;
  }

  /* Compact 1-2 line Header */
  .blueprints-header {
    background: linear-gradient(135deg, rgba(147, 51, 234, 0.16), rgba(76, 29, 149, 0.1)) !important;
    border-bottom: 1.5px solid rgba(168, 85, 247, 0.3) !important;
    padding: 16px 24px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    flex-shrink: 0;
  }
  .blueprints-header .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 17px;
    font-weight: 900;
    color: #d8b4fe;
    letter-spacing: 0.08em;
  }
  :global(.blueprint-header-icon) {
    color: #c084fc;
  }
  .blueprint-count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 22px;
    padding: 0 8px;
    background: rgba(147, 51, 234, 0.35);
    border: 1px solid rgba(168, 85, 247, 0.6);
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 800;
    color: #f3e8ff;
    letter-spacing: 0.04em;
    box-shadow: 0 0 10px rgba(168, 85, 247, 0.3);
  }

  /* Body */
  .blueprints-body {
    flex: 1;
    overflow-y: auto;
    padding: 18px 24px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-sizing: border-box;
  }
  .blueprints-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    box-sizing: border-box;
  }

  /* Single-Row Blueprint Card */
  .blueprint-row-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 18px;
    background: rgba(15, 23, 42, 0.88);
    border: 1.5px solid rgba(168, 85, 247, 0.28);
    border-radius: 16px;
    transition: all 0.15s ease;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
    box-sizing: border-box;
  }
  .blueprint-row-card:hover {
    background: rgba(20, 30, 55, 0.95);
    border-color: rgba(168, 85, 247, 0.65);
    transform: translateX(2px);
    box-shadow: 0 4px 18px rgba(168, 85, 247, 0.15);
  }

  .bp-row-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }
  .bp-star-icon {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    background: rgba(168, 85, 247, 0.18);
    border: 1px solid rgba(168, 85, 247, 0.4);
    color: #c084fc;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .bp-info-col {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    min-width: 0;
  }
  .bp-title-line {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .bp-title {
    font-size: 15.5px;
    font-weight: 800;
    color: #f3e8ff;
    letter-spacing: 0.02em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .bp-notes-text {
    font-size: 12.5px;
    font-weight: 500;
    color: #94a3b8;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 520px;
  }

  .bp-row-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }
  .bp-date-meta {
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .bp-tag {
    font-size: 10px;
    font-weight: 800;
    padding: 2px 7px;
    border-radius: 5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .bp-tag.priority-low {
    background: rgba(59, 130, 246, 0.2);
    color: #93c5fd;
    border: 1px solid rgba(59, 130, 246, 0.35);
  }
  .bp-tag.standby {
    background: rgba(245, 158, 11, 0.15);
    color: #fde047;
    border: 1px solid rgba(245, 158, 11, 0.35);
  }

  .btn-instantiate {
    height: 38px;
    padding: 0 16px;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.04em;
    border-radius: 10px;
    background: linear-gradient(135deg, #9333ea, #7e22ce);
    color: #ffffff;
    border: 1.5px solid rgba(216, 180, 254, 0.4);
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    box-shadow: 0 3px 10px rgba(147, 51, 234, 0.3);
    white-space: nowrap;
  }
  .btn-instantiate:hover {
    transform: translateY(-1px);
    box-shadow: 0 5px 16px rgba(147, 51, 234, 0.5);
    border-color: #d8b4fe;
    background: linear-gradient(135deg, #a855f7, #9333ea);
  }
  .btn-delete-blueprint {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: rgba(239, 68, 68, 0.1);
    border: 1.5px solid rgba(239, 68, 68, 0.28);
    color: #fca5a5;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
    flex-shrink: 0;
  }
  .btn-delete-blueprint:hover {
    background: rgba(239, 68, 68, 0.25);
    border-color: #ef4444;
    color: #ffffff;
    transform: translateY(-1px);
  }

  /* Empty State */
  .blueprints-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 50px 24px;
    text-align: center;
    gap: 12px;
  }
  .empty-icon-ring.purple-glow {
    box-shadow: 0 0 25px rgba(168, 85, 247, 0.35);
    border-color: rgba(168, 85, 247, 0.5);
    color: #c084fc;
  }
  .blueprints-empty h4 {
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 1.2px;
    color: #f3e8ff;
    margin: 0;
  }
  .blueprints-empty p {
    font-size: 13.5px;
    line-height: 1.5;
    max-width: 400px;
    color: #94a3b8;
    margin: 0;
  }

  /* Save as Blueprint Button (Star) in Edit Modal Header */
  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .btn-save-blueprint {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    background: rgba(147, 51, 234, 0.18);
    border: 1px solid rgba(168, 85, 247, 0.45);
    border-radius: 8px;
    color: #c084fc;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .btn-save-blueprint:hover:not(.blueprint-locked):not(.blueprint-saved) {
    background: rgba(147, 51, 234, 0.35);
    border-color: rgba(168, 85, 247, 0.75);
    color: #e9d5ff;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(147, 51, 234, 0.25);
  }
  .btn-save-blueprint.blueprint-locked {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .btn-save-blueprint.blueprint-saved {
    background: rgba(34, 197, 94, 0.18) !important;
    border-color: rgba(34, 197, 94, 0.5) !important;
    color: #86efac !important;
    cursor: not-allowed !important;
    opacity: 0.95 !important;
  }
  .btn-save-blueprint.blueprint-saved:hover {
    transform: none !important;
    box-shadow: none !important;
  }

  /* INLINE GHOST AUTOCOMPLETE OVERLAY & SMART INPUT WRAP */
  .smart-input-wrap {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
  }
  .smart-input-field {
    position: relative;
    z-index: 2;
    background: transparent !important;
  }
  .ghost-overlay {
    position: absolute;
    left: 14px;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    pointer-events: none;
    z-index: 1;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    white-space: pre;
    overflow: hidden;
    color: transparent;
  }
  .ghost-echo {
    visibility: hidden;
  }
  .ghost-completion {
    color: rgba(148, 163, 184, 0.75);
    font-weight: 700;
    letter-spacing: 0.01em;
  }
  .ghost-tab-badge {
    margin-left: 8px;
    font-size: 9.5px;
    font-weight: 900;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(99, 102, 241, 0.25);
    border: 1px solid rgba(129, 140, 248, 0.5);
    color: #c7d2fe;
    letter-spacing: 0.05em;
    box-shadow: 0 0 8px rgba(99, 102, 241, 0.3);
  }
  .ghost-hint-pill {
    font-size: 11px;
    font-weight: 700;
    color: #818cf8;
    background: rgba(99, 102, 241, 0.15);
    padding: 2px 8px;
    border-radius: 5px;
    border: 1px solid rgba(129, 140, 248, 0.35);
  }
  .ghost-hint-pill strong {
    color: #ffffff;
    font-weight: 900;
  }

  /* UNDATED STAT PILL (DAY BANNER) */
  .stat-pill.undated-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 800;
    border-radius: 9px;
    background: rgba(99, 102, 241, 0.18);
    border: 1.5px solid rgba(99, 102, 241, 0.55);
    color: #c7d2fe;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  .stat-pill.undated-pill:hover {
    background: rgba(99, 102, 241, 0.35);
    border-color: rgba(129, 140, 248, 0.95);
    box-shadow: 0 0 18px rgba(99, 102, 241, 0.5);
    transform: translateY(-1px);
    color: #ffffff;
  }

  /* INLINE SYNTAX PILL FOR UNDATED */
  .syntax-pill.undated-detected {
    background: rgba(99, 102, 241, 0.25);
    border: 1px solid rgba(129, 140, 248, 0.6);
    color: #c7d2fe;
    font-weight: 800;
  }

  /* CREATION MODAL UNDATED MODE TOGGLE & BOX */
  .field-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }
  .btn-toggle-undated-mode {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 8px;
    font-size: 11.5px;
    font-weight: 800;
    letter-spacing: 0.04em;
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: #cbd5e1;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .btn-toggle-undated-mode:hover {
    background: rgba(99, 102, 241, 0.25);
    border-color: rgba(129, 140, 248, 0.6);
    color: #e0e7ff;
  }
  .btn-toggle-undated-mode.is-active {
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    border-color: rgba(199, 210, 254, 0.85);
    color: #ffffff;
    box-shadow: 0 0 14px rgba(99, 102, 241, 0.5);
  }

  .undated-mode-box {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 44px;
    padding: 0 14px;
    border-radius: 12px;
    background: rgba(99, 102, 241, 0.12);
    border: 1.5px dashed rgba(129, 140, 248, 0.55);
    color: #c7d2fe;
    box-sizing: border-box;
  }
  :global(.undated-box-icon) {
    color: #818cf8;
    flex-shrink: 0;
  }
  .undated-box-label {
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.04em;
  }

  /* ═══ TACTICAL UNDATED DIRECTIVES HOLDING BAY MODAL ═══ */
  .undated-modal-dialog {
    width: 1080px !important;
    max-width: 96vw !important;
    height: 88vh !important;
    max-height: 88vh !important;
    background: #0a0e1c !important;
    border: 1.5px solid rgba(99, 102, 241, 0.45) !important;
    box-shadow: 0 28px 75px rgba(0, 0, 0, 0.95), 0 0 45px rgba(99, 102, 241, 0.2) !important;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .undated-header {
    border-bottom: 1px solid rgba(99, 102, 241, 0.25) !important;
    padding: 16px 20px !important;
  }
  :global(.undated-header-icon) {
    color: #818cf8;
  }
  .undated-count-badge {
    font-size: 11px;
    font-weight: 900;
    padding: 2px 8px;
    border-radius: 6px;
    background: rgba(99, 102, 241, 0.25);
    border: 1px solid rgba(129, 140, 248, 0.5);
    color: #c7d2fe;
    letter-spacing: 0.06em;
  }

  .undated-modal-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 20px;
    background: rgba(15, 23, 42, 0.6);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .undated-search-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    background: #040711;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 10px;
    padding: 0 12px;
    height: 36px;
  }
  :global(.undated-search-icon) {
    color: #64748b;
    flex-shrink: 0;
  }
  .undated-search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #f1f5f9;
    font-size: 12.5px;
    font-weight: 600;
  }
  .undated-search-input::placeholder {
    color: #64748b;
  }
  .btn-clear-undated-search {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 2px;
    display: flex;
  }
  .btn-clear-undated-search:hover {
    color: #f1f5f9;
  }

  .undated-pri-filters {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .undated-pri-btn {
    padding: 5px 10px;
    font-size: 11px;
    font-weight: 800;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #94a3b8;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .undated-pri-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #e2e8f0;
  }
  .undated-pri-btn.active {
    background: rgba(99, 102, 241, 0.25);
    border-color: rgba(129, 140, 248, 0.7);
    color: #ffffff;
    box-shadow: 0 0 10px rgba(99, 102, 241, 0.3);
  }
  .undated-pri-btn.pri-high.active {
    background: rgba(239, 68, 68, 0.25);
    border-color: rgba(239, 68, 68, 0.7);
  }
  .undated-pri-btn.pri-med.active {
    background: rgba(245, 158, 11, 0.25);
    border-color: rgba(245, 158, 11, 0.7);
  }
  .undated-pri-btn.pri-low.active {
    background: rgba(59, 130, 246, 0.25);
    border-color: rgba(59, 130, 246, 0.7);
  }

  .undated-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    max-height: calc(86vh - 120px);
  }

  .undated-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .undated-row-card {
    background: rgba(15, 23, 42, 0.75);
    border: 1.5px solid rgba(99, 102, 241, 0.25);
    border-radius: 14px;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: all 0.2s ease;
  }
  .undated-row-card:hover {
    background: rgba(20, 30, 55, 0.9);
    border-color: rgba(129, 140, 248, 0.6);
    box-shadow: 0 4px 18px rgba(99, 102, 241, 0.15);
  }
  .undated-row-card.is-deploying {
    border-color: rgba(245, 158, 11, 0.7);
    background: rgba(245, 158, 11, 0.05);
  }

  .undated-row-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .undated-row-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }
  .undated-box-badge {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    background: rgba(99, 102, 241, 0.2);
    border: 1px solid rgba(129, 140, 248, 0.45);
    color: #a5b4fc;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .undated-info-col {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    min-width: 0;
  }
  .undated-title-line {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .undated-title {
    font-size: 15px;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: 0.02em;
  }
  .undated-pri-tag {
    font-size: 9.5px;
    font-weight: 900;
    padding: 2px 6px;
    border-radius: 5px;
    letter-spacing: 0.04em;
  }
  .undated-pri-tag.priority-high {
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid rgba(239, 68, 68, 0.45);
    color: #fca5a5;
  }
  .undated-pri-tag.priority-medium {
    background: rgba(245, 158, 11, 0.2);
    border: 1px solid rgba(245, 158, 11, 0.45);
    color: #fde047;
  }
  .undated-pri-tag.priority-low {
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.45);
    color: #93c5fd;
  }
  .undated-holding-tag {
    font-size: 9.5px;
    font-weight: 900;
    padding: 2px 6px;
    border-radius: 5px;
    background: rgba(99, 102, 241, 0.15);
    border: 1px solid rgba(129, 140, 248, 0.35);
    color: #c7d2fe;
    letter-spacing: 0.04em;
  }
  .undated-subtask-tag {
    font-size: 9.5px;
    font-weight: 900;
    padding: 2px 6px;
    border-radius: 5px;
    background: rgba(168, 85, 247, 0.15);
    border: 1px solid rgba(168, 85, 247, 0.35);
    color: #d8b4fe;
    letter-spacing: 0.04em;
  }
  .undated-notes-text {
    font-size: 12px;
    font-weight: 500;
    color: #94a3b8;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 480px;
  }

  .undated-row-right {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-shrink: 0;
  }
  .undated-date-meta {
    font-size: 11.5px;
    font-weight: 600;
    color: #64748b;
  }
  .undated-action-btns {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .btn-deploy-today {
    height: 34px;
    padding: 0 12px;
    font-size: 11.5px;
    font-weight: 900;
    letter-spacing: 0.04em;
    border-radius: 8px;
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: #000000;
    border: none;
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
    transition: all 0.15s ease;
    box-shadow: 0 3px 10px rgba(245, 158, 11, 0.3);
    white-space: nowrap;
  }
  .btn-deploy-today:hover {
    transform: translateY(-1px);
    box-shadow: 0 5px 15px rgba(245, 158, 11, 0.5);
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
  }

  .btn-schedule-undated {
    height: 34px;
    padding: 0 12px;
    font-size: 11.5px;
    font-weight: 900;
    letter-spacing: 0.04em;
    border-radius: 8px;
    background: rgba(99, 102, 241, 0.2);
    border: 1px solid rgba(129, 140, 248, 0.5);
    color: #c7d2fe;
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }
  .btn-schedule-undated:hover {
    background: rgba(99, 102, 241, 0.35);
    border-color: #818cf8;
    color: #ffffff;
    transform: translateY(-1px);
  }

  .btn-edit-undated, .btn-delete-undated {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
    flex-shrink: 0;
  }
  .btn-edit-undated {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #94a3b8;
  }
  .btn-edit-undated:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.3);
    color: #ffffff;
    transform: translateY(-1px);
  }
  .btn-delete-undated {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fca5a5;
  }
  .btn-delete-undated:hover {
    background: rgba(239, 68, 68, 0.25);
    border-color: #ef4444;
    color: #ffffff;
    transform: translateY(-1px);
  }

  /* CUSTOM DEPLOYMENT DRAWER */
  .deploy-drawer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 14px;
    background: rgba(10, 16, 30, 0.95);
    border: 1px dashed rgba(245, 158, 11, 0.5);
    border-radius: 10px;
    margin-top: 4px;
  }
  .drawer-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .drawer-label {
    font-size: 11px;
    font-weight: 800;
    color: #f59e0b;
    letter-spacing: 0.05em;
  }
  .drawer-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .btn-confirm-deploy {
    height: 32px;
    padding: 0 12px;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.04em;
    border-radius: 6px;
    background: linear-gradient(135deg, #10b981, #059669);
    color: #ffffff;
    border: none;
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .btn-confirm-deploy:hover {
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.5);
    transform: translateY(-1px);
  }
  .btn-cancel-drawer {
    height: 32px;
    padding: 0 10px;
    font-size: 11px;
    font-weight: 800;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #94a3b8;
    cursor: pointer;
  }
  .btn-cancel-drawer:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }

  .undated-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
    gap: 12px;
  }
  .empty-icon-ring.indigo-glow {
    box-shadow: 0 0 25px rgba(99, 102, 241, 0.35);
    border-color: rgba(129, 140, 248, 0.5);
    color: #a5b4fc;
  }
  .undated-empty h4 {
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 1.2px;
    color: #f3e8ff;
    margin: 0;
  }
  .undated-empty p {
    font-size: 13px;
    line-height: 1.5;
    max-width: 440px;
    color: #94a3b8;
    margin: 0;
  }
  .no-filter-match {
    color: #64748b;
    font-size: 13px;
    font-weight: 600;
  }

</style>
