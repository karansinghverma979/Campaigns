<script>
  import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-svelte';
  import { ChronosMath, getFormattedDate } from '../lib/ChronosMath.js';

  let { value = '', onselect = () => {}, minDateStr = getFormattedDate() } = $props();

  // Internal view year and month
  let viewYear = $state(new Date().getFullYear());
  let viewMonth = $state(new Date().getMonth()); // 0-indexed

  // Parse current value if valid
  $effect(() => {
    if (value) {
      const parsed = ChronosMath.parseDate(value) || parseIsoDate(value);
      if (parsed) {
        viewYear = parsed.getFullYear();
        viewMonth = parsed.getMonth();
      }
    }
  });

  function parseIsoDate(str) {
    if (!str || typeof str !== 'string') return null;
    const parts = str.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return null;
  }

  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  // Compute days matrix for viewMonth / viewYear
  const calendarDays = $derived.by(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sun
    const totalDays = lastDay.getDate();

    const days = [];

    // Empty lead cells from previous month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ dayNum: null, dateStr: '', isDisabled: true });
    }

    // Days of current month
    const todayZero = new Date();
    todayZero.setHours(0, 0, 0, 0);

    const minDateObj = ChronosMath.parseDate(minDateStr) || todayZero;

    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(viewYear, viewMonth, d, 0, 0, 0, 0);
      const dd = String(d).padStart(2, '0');
      const mm = String(viewMonth + 1).padStart(2, '0');
      const yyyy = viewYear;
      const formatted = `${dd}-${mm}-${yyyy}`;

      const isDisabled = dateObj.getTime() < minDateObj.getTime();
      const isToday = dateObj.getTime() === todayZero.getTime();
      const isSelected = value === formatted || value === `${yyyy}-${mm}-${dd}`;

      days.push({
        dayNum: d,
        dateStr: formatted,
        isDisabled,
        isToday,
        isSelected
      });
    }

    return days;
  });

  function prevMonth() {
    if (viewMonth === 0) {
      viewMonth = 11;
      viewYear -= 1;
    } else {
      viewMonth -= 1;
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      viewMonth = 0;
      viewYear += 1;
    } else {
      viewMonth += 1;
    }
  }

  function selectDay(cell) {
    if (cell.isDisabled || !cell.dateStr) return;
    onselect(cell.dateStr);
  }
</script>

<div class="calendar-2x-container">
  <!-- Month & Year Control Header -->
  <div class="cal-header">
    <button type="button" class="cal-nav-btn" onclick={prevMonth} title="Previous Month">
      <ChevronLeft size={18} />
    </button>

    <div class="cal-title">
      <CalendarIcon size={16} class="cal-title-icon" />
      <span>{monthNames[viewMonth]} {viewYear}</span>
    </div>

    <button type="button" class="cal-nav-btn" onclick={nextMonth} title="Next Month">
      <ChevronRight size={18} />
    </button>
  </div>

  <!-- Day of Week Headers -->
  <div class="cal-weekdays">
    {#each dayNames as dayName}
      <span class="weekday-cell">{dayName}</span>
    {/each}
  </div>

  <!-- 2X Grid Cells -->
  <div class="cal-grid">
    {#each calendarDays as cell}
      {#if cell.dayNum === null}
        <div class="cal-day-cell empty"></div>
      {:else}
        <button
          type="button"
          class="cal-day-cell"
          class:disabled={cell.isDisabled}
          class:today={cell.isToday}
          class:selected={cell.isSelected}
          disabled={cell.isDisabled}
          onclick={() => selectDay(cell)}
        >
          <span class="day-number">{cell.dayNum}</span>
        </button>
      {/if}
    {/each}
  </div>
</div>

<style>
  .calendar-2x-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: rgba(6, 10, 18, 0.95);
    border: 1.5px solid rgba(139, 92, 246, 0.45);
    border-radius: 20px;
    padding: 18px;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65), 0 0 24px rgba(139, 92, 246, 0.15);
    width: 100%;
    box-sizing: border-box;
    user-select: none;
  }

  .cal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
  }

  .cal-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 900;
    letter-spacing: 0.06em;
    color: #f3e8ff;
  }

  :global(.cal-title-icon) {
    color: #c4b5fd;
  }

  .cal-nav-btn {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #c4b5fd;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .cal-nav-btn:hover {
    background: rgba(139, 92, 246, 0.25);
    border-color: rgba(139, 92, 246, 0.55);
    color: #ffffff;
  }

  .cal-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
    text-align: center;
    padding-bottom: 4px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .weekday-cell {
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.08em;
    color: var(--text-dim);
    padding: 4px 0;
  }

  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 8px;
  }

  .cal-day-cell {
    aspect-ratio: 1;
    min-height: 42px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #ffffff;
    font-size: 15px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .cal-day-cell:hover:not(.disabled) {
    background: rgba(139, 92, 246, 0.25);
    border-color: rgba(168, 85, 247, 0.65);
    color: #ffffff;
    transform: scale(1.08);
    box-shadow: 0 0 16px rgba(139, 92, 246, 0.35);
  }

  .cal-day-cell.today {
    border-color: rgba(59, 130, 246, 0.7);
    background: rgba(59, 130, 246, 0.12);
  }

  .cal-day-cell.selected {
    background: linear-gradient(135deg, #8b5cf6, #6366f1) !important;
    border-color: rgba(196, 181, 253, 0.8) !important;
    color: #ffffff !important;
    font-weight: 900 !important;
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.6) !important;
    transform: scale(1.05) !important;
  }

  .cal-day-cell.disabled {
    opacity: 0.25;
    cursor: not-allowed;
    background: transparent;
    border-color: transparent;
    color: var(--text-dim);
  }

  .cal-day-cell.empty {
    background: transparent;
    border: none;
    cursor: default;
  }
</style>
