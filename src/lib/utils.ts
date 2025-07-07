import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanName(name: string | null | undefined): string {
  if (!name) return '';
  console.log('cleanName called with:', name);
  // Remove "'s" suffix from names (e.g., "Frankie's" becomes "Frankie")
  const cleaned = name.endsWith("'s") ? name.slice(0, -2) : name;
  console.log('cleanName result:', cleaned);
  return cleaned;
}
