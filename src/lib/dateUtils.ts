/**
 * Date utilities for handling birthdays and anniversaries
 * Ensures dates are always in user's local timezone
 */

/**
 * Parse a date string (YYYY-MM-DD) in local timezone
 * Avoids timezone shift issues when displaying birthdays
 */
export function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date();

  // Split the date string (YYYY-MM-DD format)
  const [year, month, day] = dateString.split('-').map(Number);

  // Create date in LOCAL timezone (not UTC)
  // Month is 0-indexed in JavaScript (0 = January)
  const date = new Date(year, month - 1, day);

  return date;
}

/**
 * Get the next occurrence of a birthday/anniversary from today
 * Returns the date in the current or next year, whichever is upcoming
 */
export function getNextOccurrence(dateString: string): Date {
  const date = parseLocalDate(dateString);
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normalize to start of day

  const currentYear = now.getFullYear();

  // Create occurrence for this year
  let nextOccurrence = new Date(
    currentYear,
    date.getMonth(),
    date.getDate()
  );
  nextOccurrence.setHours(0, 0, 0, 0);

  // If it's already passed this year, use next year
  if (nextOccurrence < now) {
    nextOccurrence = new Date(
      currentYear + 1,
      date.getMonth(),
      date.getDate()
    );
    nextOccurrence.setHours(0, 0, 0, 0);
  }

  return nextOccurrence;
}

/**
 * Get days until a date (for recurring occasions like birthdays)
 */
export function getDaysUntil(dateString: string): number {
  const nextOccurrence = getNextOccurrence(dateString);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const diffTime = nextOccurrence.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Get days until a specific date (NOT recurring - for delivery dates, etc.)
 * Returns negative number if date is in the past
 */
export function getDaysUntilExact(dateString: string): number {
  const targetDate = parseLocalDate(dateString);
  targetDate.setHours(0, 0, 0, 0);
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Format a date string for display (e.g., "Dec 28")
 * Always shows the correct month/day regardless of timezone
 */
export function formatOccasionDate(dateString: string): string {
  const date = parseLocalDate(dateString);

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format a date string with year (e.g., "December 28, 2024")
 */
export function formatOccasionDateLong(dateString: string): string {
  const date = parseLocalDate(dateString);

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Check if a date is today
 */
export function isToday(dateString: string): boolean {
  const date = parseLocalDate(dateString);
  const nextOccurrence = getNextOccurrence(dateString);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return nextOccurrence.getTime() === now.getTime();
}

/**
 * Check if a date is within the next N days
 */
export function isWithinDays(dateString: string, days: number): boolean {
  const daysUntil = getDaysUntil(dateString);
  return daysUntil >= 0 && daysUntil <= days;
}
