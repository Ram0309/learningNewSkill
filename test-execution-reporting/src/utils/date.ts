import { format, parseISO, isValid, startOfDay, endOfDay, subDays, addDays } from 'date-fns';

/**
 * Date utility functions for Test Execution Reporting System
 */
export class DateUtils {
  /**
   * Format date to ISO string
   */
  static toISOString(date: Date): string {
    return date.toISOString();
  }

  /**
   * Format date for display
   */
  static formatForDisplay(date: Date | string): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'yyyy-MM-dd HH:mm:ss');
  }

  /**
   * Format date for file names
   */
  static formatForFileName(date: Date | string): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'yyyy-MM-dd_HH-mm-ss');
  }

  /**
   * Format date for reports
   */
  static formatForReport(date: Date | string): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'MMM dd, yyyy HH:mm');
  }

  /**
   * Get start of day
   */
  static getStartOfDay(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return startOfDay(dateObj);
  }

  /**
   * Get end of day
   */
  static getEndOfDay(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return endOfDay(dateObj);
  }

  /**
   * Get date range for last N days
   */
  static getLastNDays(days: number): { from: Date; to: Date } {
    const to = new Date();
    const from = subDays(to, days);
    return { from, to };
  }

  /**
   * Get date range for this week
   */
  static getThisWeek(): { from: Date; to: Date } {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const from = subDays(today, dayOfWeek);
    const to = addDays(from, 6);
    return { 
      from: this.getStartOfDay(from), 
      to: this.getEndOfDay(to) 
    };
  }

  /**
   * Get date range for this month
   */
  static getThisMonth(): { from: Date; to: Date } {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { 
      from: this.getStartOfDay(from), 
      to: this.getEndOfDay(to) 
    };
  }

  /**
   * Calculate duration between two dates
   */
  static calculateDuration(start: Date | string, end: Date | string): number {
    const startDate = typeof start === 'string' ? parseISO(start) : start;
    const endDate = typeof end === 'string' ? parseISO(end) : end;
    return endDate.getTime() - startDate.getTime();
  }

  /**
   * Format duration in human readable format
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else if (seconds > 0) {
      return `${seconds}s`;
    } else {
      return `${milliseconds}ms`;
    }
  }

  /**
   * Validate date string
   */
  static isValidDate(dateString: string): boolean {
    try {
      const date = parseISO(dateString);
      return isValid(date);
    } catch {
      return false;
    }
  }

  /**
   * Parse date from various formats
   */
  static parseDate(dateInput: string | Date): Date {
    if (dateInput instanceof Date) {
      return dateInput;
    }

    // Try ISO format first
    let date = parseISO(dateInput);
    if (isValid(date)) {
      return date;
    }

    // Try other common formats
    const formats = [
      'yyyy-MM-dd',
      'MM/dd/yyyy',
      'dd/MM/yyyy',
      'yyyy-MM-dd HH:mm:ss',
      'MM/dd/yyyy HH:mm:ss'
    ];

    for (const formatStr of formats) {
      try {
        // Note: date-fns doesn't have a generic parse function
        // This is a simplified implementation
        date = new Date(dateInput);
        if (isValid(date)) {
          return date;
        }
      } catch {
        continue;
      }
    }

    throw new Error(`Unable to parse date: ${dateInput}`);
  }

  /**
   * Get timezone offset
   */
  static getTimezoneOffset(): number {
    return new Date().getTimezoneOffset();
  }

  /**
   * Convert to UTC
   */
  static toUTC(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return new Date(dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000));
  }

  /**
   * Convert from UTC
   */
  static fromUTC(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000));
  }

  /**
   * Get relative time description
   */
  static getRelativeTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else if (diffSeconds > 0) {
      return `${diffSeconds} second${diffSeconds > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }

  /**
   * Generate date range array
   */
  static generateDateRange(start: Date | string, end: Date | string): Date[] {
    const startDate = typeof start === 'string' ? parseISO(start) : start;
    const endDate = typeof end === 'string' ? parseISO(end) : end;
    const dates: Date[] = [];
    
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }
    
    return dates;
  }
}