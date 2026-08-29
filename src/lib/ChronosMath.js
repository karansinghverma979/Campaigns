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
   * Resolve a single @token into a Date object (supporting natural keywords, weekdays, offsets, and numeric dates)
   */
  static parseSingleDateToken(tokenText, refDate = new Date()) {
    if (!tokenText || typeof tokenText !== 'string') return null;
    const clean = tokenText.replace(/^@/, '').trim().toLowerCase();
    if (!clean) return null;

    const now = new Date(refDate);
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // 1. Relative Day Keywords
    if (clean === 'today' || clean === 'tod') {
      return todayMidnight;
    }
    if (clean === 'tomorrow' || clean === 'tom' || clean === 'tmrw' || clean === 'tmr' || clean === 'next' || clean === 'nextday') {
      const d = new Date(todayMidnight);
      d.setDate(d.getDate() + 1);
      return d;
    }
    if (clean === 'overmorrow' || clean === 'over' || clean === 'ovm' || clean === 'dayaftertomorrow') {
      const d = new Date(todayMidnight);
      d.setDate(d.getDate() + 2);
      return d;
    }

    // 2. Relative offsets: @+3, @+3d, @in3d, @in3days, @+2w, @in2w, @+1m, @in1m
    const offsetDayMatch = clean.match(/^(?:\+|in)?(\d+)(?:d|days)?$/);
    if (offsetDayMatch && (clean.startsWith('+') || clean.startsWith('in') || clean.endsWith('d') || clean.endsWith('days'))) {
      const days = parseInt(offsetDayMatch[1], 10);
      if (days >= 0 && days <= 3650) {
        const d = new Date(todayMidnight);
        d.setDate(d.getDate() + days);
        return d;
      }
    }

    const offsetWeekMatch = clean.match(/^(?:\+|in)?(\d+)(?:w|weeks|wk|wks)$/);
    if (offsetWeekMatch) {
      const weeks = parseInt(offsetWeekMatch[1], 10);
      if (weeks >= 0 && weeks <= 520) {
        const d = new Date(todayMidnight);
        d.setDate(d.getDate() + (weeks * 7));
        return d;
      }
    }

    const offsetMonthMatch = clean.match(/^(?:\+|in)?(\d+)(?:m|months|mon|mons)$/);
    if (offsetMonthMatch) {
      const months = parseInt(offsetMonthMatch[1], 10);
      if (months >= 0 && months <= 120) {
        const d = new Date(todayMidnight);
        d.setMonth(d.getMonth() + months);
        return d;
      }
    }

    // 3. Weekday shortcuts
    const weekdaysMap = {
      sun: 0, sunday: 0, nextsun: 0, nextsunday: 0,
      mon: 1, monday: 1, nextmon: 1, nextmonday: 1,
      tue: 2, tues: 2, tuesday: 2, nexttue: 2, nexttuesday: 2,
      wed: 3, wednesday: 3, nextwed: 3, nextwednesday: 3,
      thu: 4, thur: 4, thurs: 4, thursday: 4, nextthu: 4, nextthursday: 4,
      fri: 5, friday: 5, nextfri: 5, nextfriday: 5,
      sat: 6, saturday: 6, nextsat: 6, nextsaturday: 6
    };

    if (weekdaysMap[clean] !== undefined) {
      const targetDay = weekdaysMap[clean];
      const currentDay = todayMidnight.getDay();
      let diff = (targetDay - currentDay + 7) % 7;
      if (diff === 0) {
        diff = 7;
      }
      const d = new Date(todayMidnight);
      d.setDate(d.getDate() + diff);
      return d;
    }

    // 4. Weekend & Month boundary shortcuts
    if (clean === 'weekend' || clean === 'thisweekend') {
      const currentDay = todayMidnight.getDay();
      let diff = (6 - currentDay + 7) % 7;
      if (diff === 0) diff = 7;
      const d = new Date(todayMidnight);
      d.setDate(d.getDate() + diff);
      return d;
    }
    if (clean === 'nextweekend') {
      const currentDay = todayMidnight.getDay();
      let diff = (6 - currentDay + 7) % 7 + 7;
      const d = new Date(todayMidnight);
      d.setDate(d.getDate() + diff);
      return d;
    }
    if (clean === 'nextweek' || clean === 'nextwk') {
      const d = new Date(todayMidnight);
      d.setDate(d.getDate() + 7);
      return d;
    }
    if (clean === 'nextmonth' || clean === 'nextmonstart' || clean === 'monthstart' || clean === '1st') {
      return new Date(todayMidnight.getFullYear(), todayMidnight.getMonth() + 1, 1, 0, 0, 0, 0);
    }
    if (clean === 'monthend' || clean === 'eom' || clean === 'endofmonth') {
      return new Date(todayMidnight.getFullYear(), todayMidnight.getMonth() + 1, 0, 0, 0, 0, 0);
    }

    // 5. Numeric calendar patterns: DD, DD-MM, DD-MM-YYYY (also supports / and .)
    const numMatch = clean.match(/^(\d{1,2})(?:[-/.])?(\d{1,2})?(?:[-/.])?(\d{2,4})?$/);
    if (numMatch) {
      const day = parseInt(numMatch[1], 10);
      const currentYear = todayMidnight.getFullYear();
      const currentMonth = todayMidnight.getMonth();

      let month = numMatch[2] !== undefined ? parseInt(numMatch[2], 10) - 1 : currentMonth;
      let year = numMatch[3] !== undefined ? parseInt(numMatch[3], 10) : currentYear;
      if (year < 100) year += 2000;

      if (ChronosMath.isValidCalendarDate(day, month, year)) {
        const d = new Date(year, month, day, 0, 0, 0, 0);
        if (!isNaN(d.getTime())) return d;
      }
    }

    return null;
  }

  /**
   * Parse @date keywords, weekdays, and numeric dates from title string
   * Scans all occurrences; selects the LAST valid date declared.
   * Returns { dateStr: 'DD-MM-YYYY', targetDate: Date, isToday: boolean, isFuture: boolean, isPast: boolean, matchedText: string, allMatchedTexts: string[] } or null
   */
  static parseSubtaskDate(text, refDate = new Date()) {
    if (!text || typeof text !== 'string') return null;
    const globalRegex = /@([a-zA-Z0-9+]+(?:[-/.][a-zA-Z0-9]+)*)\b/g;
    const matches = Array.from(text.matchAll(globalRegex));
    if (matches.length === 0) return null;

    const now = new Date(refDate);
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayMs = todayDate.getTime();

    let lastValid = null;
    const allMatchedTexts = [];

    for (const match of matches) {
      const matchedText = match[0];
      const targetDate = ChronosMath.parseSingleDateToken(matchedText, todayDate);
      if (!targetDate || isNaN(targetDate.getTime())) continue;

      allMatchedTexts.push(matchedText);

      const targetMs = targetDate.getTime();
      const formatted = getFormattedDate(targetDate);

      lastValid = {
        dateStr: formatted,
        targetDate,
        isToday: targetMs === todayMs,
        isFuture: targetMs > todayMs,
        isPast: targetMs < todayMs,
        matchedText,
        allMatchedTexts
      };
    }

    if (lastValid) {
      lastValid.allMatchedTexts = allMatchedTexts;
    }

    return lastValid;
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
