export function getFormattedDate(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export class ChronosMath {
  /**
   * Parse a string in format DD-MM-YYYY or YYYY-MM-DD to Date object at midnight 00:00:00 local time
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

    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    const dateObj = new Date(year, month, day, 0, 0, 0, 0);
    return isNaN(dateObj.getTime()) ? null : dateObj;
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
    const dead = this.parseDate(deadlineStr);
    const curr = this.parseDate(currentDateStr);
    if (!dead || !curr) return 0;
    const diffMs = dead.getTime() - curr.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate exact number of days overdue (current - deadline)
   */
  static overdueDays(deadlineStr, currentDateStr = getFormattedDate()) {
    const dead = this.parseDate(deadlineStr);
    const curr = this.parseDate(currentDateStr);
    if (!dead || !curr) return 0;
    const diffMs = curr.getTime() - dead.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
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
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return (days < 0 ? 0 : days) + 1; // Both dates included
  }
}
