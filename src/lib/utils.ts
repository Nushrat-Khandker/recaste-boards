
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, isValid } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | undefined): string | null {
  if (!date || !isValid(date)) return null;
  
  // Use Gregorian formatting
  return format(date, "PPP");
}

export function formatDateRange(startDate: Date | undefined, dueDate: Date | undefined): string {
  const start = startDate ? formatDate(startDate) : null;
  const due = dueDate ? formatDate(dueDate) : null;
  
  if (start && due) {
    return `${start} - ${due}`;
  } else if (start) {
    return `Starts: ${start}`;
  } else if (due) {
    return `Due: ${due}`;
  }
  
  return '';
}
