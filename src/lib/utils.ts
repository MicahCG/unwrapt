import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanName(name: string | null | undefined): string {
  if (!name) return '';

  let cleaned = name;

  // Remove "'s" possessive suffix (e.g., "Andrea's" → "Andrea")
  if (cleaned.endsWith("'s")) {
    cleaned = cleaned.slice(0, -2);
  }

  // Remove common birthday-related suffixes (case insensitive)
  const birthdaySuffixes = [
    ' Bday',
    ' Birthday',
    ' bday',
    ' birthday',
    "'s Bday",
    "'s Birthday",
    "'s bday",
    "'s birthday",
    ' B-day',
    ' b-day'
  ];

  for (const suffix of birthdaySuffixes) {
    if (cleaned.endsWith(suffix)) {
      cleaned = cleaned.slice(0, -suffix.length);
    }
  }

  return cleaned.trim();
}
