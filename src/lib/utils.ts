import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Display-only: uppercase the first letter of each word ("jean-luc godard" → "Jean-Luc Godard"). */
export function formatPersonName(name: string): string {
  return name.replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase());
}
