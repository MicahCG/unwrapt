import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanName(name: string | null | undefined): string {
  if (!name) return '';
  // Remove "'s" suffix from names (e.g., "Frankie's" becomes "Frankie")
  return name.endsWith("'s") ? name.slice(0, -2) : name;
}
