export function getFormattedDate(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export class ChronosMath {
  /**
   * Verify whether a given day, month (0-indexed), and year form a valid calendar date
   */
  static isValidCalendarDate(day, month, year) {
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    if (month < 0 || month > 11 || day < 1 || day > 31 || year < 1000 || year > 9999) return false;
    const testDate = new Date(year, month, day, 0, 0, 0, 0);
    return testDate.getFullYear() === year &&
           testDate.getMonth() === month &&
           testDate.getDate() === day;
  }

  /**
   * Parse a string in format DD-MM-YYYY or YYYY-MM-DD to Date object at midnight 00:00:00 local time
   * Strictly validates day-of-month bounds (e.g. Feb 31 returns null, never rolls over)
   */
  static parseDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const trimmed = dateStr.trim();
    const parts = trimmed.split('-');
    if (parts.length !== 3) return null;

    let year, month, day;
    if (parts[0].length === 4) {
      // YYYY-MM-DD format
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      // DD-MM-YYYY format
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    }

    if (!ChronosMath.isValidCalendarDate(day, month, year)) return null;

    const dateObj = new Date(year, month, day, 0, 0, 0, 0);
    return isNaN(dateObj.getTime()) ? null : dateObj;
  }

  /**
   * Parse @DD-MM-YYYY, @DD-MM, or @DD from subtask title string
   * Returns { dateStr: 'DD-MM-YYYY', targetDate: Date, isToday: boolean, isFuture: boolean, isPast: boolean, matchedText: string } or null
   */
  static parseSubtaskDate(text) {
    if (!text || typeof text !== 'string') return null;
    const match = text.match(/@(\d{1,2})(?:-(\d{1,2}))?(?:-(\d{2,4}))?\b/);
    if (!match) return null;

    const matchedText = match[0];
    const day = parseInt(match[1], 10);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    let month = match[2] !== undefined ? parseInt(match[2], 10) - 1 : currentMonth;
    let year = match[3] !== undefined ? parseInt(match[3], 10) : currentYear;
    if (year < 100) year += 2000;

    if (!ChronosMath.isValidCalendarDate(day, month, year)) return null;

    const targetDate = new Date(year, month, day, 0, 0, 0, 0);
    if (isNaN(targetDate.getTime())) return null;

    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const targetMs = targetDate.getTime();
    const todayMs = todayDate.getTime();

    const formatted = getFormattedDate(targetDate);

    return {
      dateStr: formatted,
      targetDate,
      isToday: targetMs === todayMs,
      isFuture: targetMs > todayMs,
      isPast: targetMs < todayMs,
      matchedText
    };
  }

  /**
   * Format Date object to DD-MM-YYYY
   */
  static formatDate(dateObj) {
    if (!dateObj || isNaN(dateObj.getTime())) return '';
    return getFormattedDate(dateObj);
  }

  /**
   * Add N days to a date string and return new DD-MM-YYYY string
   */
  static addDays(dateString, days) {
    const d = this.parseDate(dateString);
    if (!d) return dateString;
    d.setDate(d.getDate() + days);
    return this.formatDate(d);
  }

  /**
   * Return true if target deadline date is strictly before current date
   */
  static isBreached(deadlineStr, currentDateStr = getFormattedDate()) {
    const dead = this.parseDate(deadlineStr);
    const curr = this.parseDate(currentDateStr);
    if (!dead || !curr) return false;
    return dead.getTime() < curr.getTime();
  }

  /**
   * Calculate difference in full days (deadline - current)
   */
  static daysRemaining(deadlineStr, currentDateStr = getFormattedDate()) {
    if (!deadlineStr) return 999999;
    const dead = this.parseDate(deadlineStr);
    const curr = this.parseDate(currentDateStr);
    if (!dead || !curr) return 999999;
    const diffMs = dead.getTime() - curr.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate exact number of days overdue (current - deadline)
   */
  static overdueDays(deadlineStr, currentDateStr = getFormattedDate()) {
    const dead = this.parseDate(deadlineStr);
    const curr = this.parseDate(currentDateStr);
    if (!dead || !curr) return 0;
    const diffMs = curr.getTime() - dead.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }

  /**
   * Calculate number of days spent between start date and end date (both days inclusive)
   */
  static daysSpent(startDateStr, endDateStr = getFormattedDate()) {
    const start = this.parseDate(startDateStr);
    const end = this.parseDate(endDateStr);
    if (!start || !end) return 1;
    const diffMs = end.getTime() - start.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return (days < 0 ? 0 : days) + 1; // Both dates included
  }
}
