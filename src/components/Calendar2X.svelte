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

  // Compute days matrix for viewMonth / viewYear — guarantee exactly 35 cells (5 rows x 7 cols)
  const calendarDays = $derived.by(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sun, 6 = Sat
    const totalDays = lastDay.getDate();

    const days = [];

    // Empty lead cells from previous month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ dayNum: null, dateStr: '', isDisabled: true, dayOfWeek: i });
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
      const dayOfWeek = dateObj.getDay();

      const isDisabled = dateObj.getTime() < minDateObj.getTime();
      const isToday = dateObj.getTime() === todayZero.getTime();
      const isSelected = value === formatted || value === `${yyyy}-${mm}-${dd}`;

      days.push({
        dayNum: d,
        dateStr: formatted,
        isDisabled,
        isToday,
        isSelected,
        dayOfWeek,
        isSunday: dayOfWeek === 0,
        isSaturday: dayOfWeek === 6
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
      <ChevronLeft size={16} />
    </button>

    <div class="cal-title">
      <CalendarIcon size={15} class="cal-title-icon" />
      <span>{monthNames[viewMonth]} {viewYear}</span>
    </div>

    <button type="button" class="cal-nav-btn" onclick={nextMonth} title="Next Month">
      <ChevronRight size={16} />
    </button>
  </div>

  <!-- Day of Week Headers (Sunday & Saturday highlighted differently) -->
  <div class="cal-weekdays">
    {#each dayNames as dayName, idx}
      <span 
        class="weekday-cell" 
        class:sunday={idx === 0} 
        class:saturday={idx === 6}
      >
        {dayName}
      </span>
    {/each}
  </div>

  <!-- 5-Row Fixed Grid Cells -->
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
          class:sunday={cell.isSunday}
          class:saturday={cell.isSaturday}
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
    gap: 10px;
    background: rgba(8, 14, 26, 0.98);
    backdrop-filter: blur(10px);
    border: 1.5px solid rgba(245, 158, 11, 0.50);
    border-radius: 22px;
    padding: 16px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.85), 0 0 30px rgba(245, 158, 11, 0.20);
    width: 290px;
    box-sizing: border-box;
    user-select: none;
  }

  .cal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 4px;
  }

  .cal-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 900;
    letter-spacing: 0.06em;
    word-spacing: 0.06em;
    color: #f3e8ff;
  }

  :global(.cal-title-icon) {
    color: #f59e0b;
  }

  .cal-nav-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #f59e0b;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .cal-nav-btn:hover {
    background: rgba(245, 158, 11, 0.25);
    border-color: rgba(245, 158, 11, 0.65);
    color: #ffffff;
    transform: scale(1.1);
  }

  .cal-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    text-align: center;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .weekday-cell {
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.08em;
    color: #94a3b8;
    padding: 2px 0;
  }
  /* DISTINCT SUNDAY & SATURDAY HIGHLIGHTS */
  .weekday-cell.sunday { color: #f87171; font-weight: 900; }
  .weekday-cell.saturday { color: #38bdf8; font-weight: 900; }

  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    grid-auto-rows: 32px;
    gap: 5px;
    justify-items: center;
  }

  .cal-day-cell {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #ffffff;
    font-size: 12.5px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .cal-day-cell.sunday:not(.disabled):not(.selected) {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
    color: #fca5a5;
  }
  .cal-day-cell.saturday:not(.disabled):not(.selected) {
    background: rgba(56, 189, 248, 0.1);
    border-color: rgba(56, 189, 248, 0.3);
    color: #7dd3fc;
  }

  .cal-day-cell:hover:not(.disabled) {
    background: rgba(245, 158, 11, 0.25);
    border-color: rgba(245, 158, 11, 0.7);
    color: #ffffff;
    transform: scale(1.1);
    box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
  }

  .cal-day-cell.today {
    border-color: rgba(245, 158, 11, 0.8);
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
    font-weight: 900;
  }

  .cal-day-cell.selected {
    background: linear-gradient(135deg, #f59e0b, #d97706) !important;
    border-color: rgba(254, 243, 199, 0.9) !important;
    color: #000000 !important;
    font-weight: 900 !important;
    box-shadow: 0 0 16px rgba(245, 158, 11, 0.6) !important;
  }

  .cal-day-cell.disabled {
    opacity: 0.2;
    cursor: not-allowed;
    background: transparent;
    border-color: transparent;
    color: #64748b;
  }

  .cal-day-cell.empty {
    background: transparent;
    border: none;
    cursor: default;
  }
</style>
