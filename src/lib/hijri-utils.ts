
/**
 * Simple Hijri date utilities
 * Implements basic conversion between Gregorian and Hijri calendars
 */

// Constants for calculation
const ISLAMIC_EPOCH = 1948439.5; // Julian day of 1 Muharram 1 A.H.
const GREGORIAN_EPOCH = 1721425.5; // Julian day of 1 January 1 C.E.
const MILLISECONDS_PER_DAY = 86400000;

/**
 * Convert a Gregorian date to Hijri
 */
export function gregorianToHijri(date: Date): { year: number; month: number; day: number } {
  // Simple conversion formula based on approximate calculations
  // This is a simplified version and may be off by 1-2 days in some cases
  const gregorianYear = date.getFullYear();
  const gregorianMonth = date.getMonth() + 1;
  const gregorianDay = date.getDate();
  
  // Get elapsed days since Gregorian epoch
  const jd = gregorianToJulian(gregorianYear, gregorianMonth, gregorianDay);
  
  // Convert to Hijri
  return julianToHijri(jd);
}

/**
 * Convert a Hijri date to Gregorian
 */
export function hijriToGregorian(year: number, month: number, day: number): Date {
  // Convert Hijri to Julian day
  const jd = hijriToJulian(year, month, day);
  
  // Convert Julian to Gregorian
  const { year: gYear, month: gMonth, day: gDay } = julianToGregorian(jd);
  
  // Create Date object (month is 0-based in JavaScript Date)
  return new Date(gYear, gMonth - 1, gDay);
}

/**
 * Convert Gregorian date to Julian day
 */
function gregorianToJulian(year: number, month: number, day: number): number {
  let a = Math.floor((14 - month) / 12);
  let y = year + 4800 - a;
  let m = month + 12 * a - 3;
  
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 
         Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

/**
 * Convert Julian day to Hijri date
 * Calibrated so that 1 Muharram 1447 = June 25, 2024
 */
function julianToHijri(jd: number): { year: number; month: number; day: number } {
  // Reference point: June 25, 2024 = 1 Muharram 1447
  // Julian day for June 25, 2024
  const referenceJD = gregorianToJulian(2024, 6, 25);
  const referenceHijriYear = 1447;
  const referenceHijriMonth = 1;
  const referenceHijriDay = 1;
  
  // Calculate days difference from reference
  const daysDiff = Math.floor(jd - referenceJD);
  
  // Approximate Hijri month length (29.53 days average)
  const avgMonthLength = 29.53059;
  const avgYearLength = avgMonthLength * 12;
  
  // Calculate total days in Hijri calendar from reference
  let totalDays = daysDiff;
  
  // Start from reference date
  let year = referenceHijriYear;
  let month = referenceHijriMonth;
  let day = referenceHijriDay + totalDays;
  
  // Adjust for months and years
  while (day > 30) {
    day -= 30;
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  
  while (day < 1) {
    month--;
    if (month < 1) {
      month = 12;
      year--;
    }
    day += 30;
  }
  
  return { year, month, day };
}

/**
 * Convert Hijri date to Julian day
 * Calibrated so that 1 Muharram 1447 = June 25, 2024
 */
function hijriToJulian(year: number, month: number, day: number): number {
  // Reference: 1 Muharram 1447 = June 25, 2024
  const referenceJD = gregorianToJulian(2024, 6, 25);
  const referenceHijriYear = 1447;
  const referenceHijriMonth = 1;
  const referenceHijriDay = 1;
  
  // Calculate difference in years, months, and days from reference
  const yearsDiff = year - referenceHijriYear;
  const monthsDiff = month - referenceHijriMonth;
  const daysDiff = day - referenceHijriDay;
  
  // Approximate calculation (30 days per month, 354 days per year)
  const totalDays = yearsDiff * 354 + monthsDiff * 30 + daysDiff;
  
  return referenceJD + totalDays;
}

/**
 * Convert Julian day to Gregorian date
 */
function julianToGregorian(jd: number): { year: number; month: number; day: number } {
  let j = Math.floor(jd) + 0.5;
  j = j + 32044;
  
  let g = Math.floor(j / 146097);
  let dg = j % 146097;
  
  let c = Math.floor((Math.floor(dg / 36524) + 1) * 3 / 4);
  dg = dg - Math.floor(c * 36524);
  
  let b = Math.floor(dg / 1461);
  let db = dg % 1461;
  
  let a = Math.floor((Math.floor(db / 365) + 1) * 3 / 4);
  db = db - Math.floor(a * 365);
  
  let y = Math.floor(g * 400 + c * 100 + b * 4 + a);
  let m = Math.floor((Math.floor(db * 5 + 308) / 153) - 2);
  let d = db - Math.floor((m + 4) * 153 / 5) + 122;
  
  let year = y - 4800 + Math.floor((m + 2) / 12);
  let month = ((m + 2) % 12) + 1;
  let day = d + 1;
  
  return { year, month, day };
}

/**
 * Get Hijri month name
 */
export function getHijriMonthName(month: number): string {
  const monthNames = [
    "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani",
    "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban",
    "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
  ];
  
  // Month should be 1-12, adjust index for zero-based array
  const index = ((month - 1) % 12 + 12) % 12;
  return monthNames[index];
}

/**
 * Format Hijri date in a readable format
 */
export function formatHijriDate(date: Date): string {
  const hijri = gregorianToHijri(date);
  return `${hijri.day} ${getHijriMonthName(hijri.month)} ${hijri.year} AH`;
}

/**
 * Is the current Gregorian date start of a Hijri month
 * (Simple approximation - for astronomical calculation, a more complex algorithm would be needed)
 */
export function isStartOfHijriMonth(date: Date): boolean {
  const hijri = gregorianToHijri(date);
  return hijri.day === 1;
}

/**
 * Calculate if this is the day after the new moon
 * This is a placeholder - proper astronomical calculations would be needed for accuracy
 */
export function isDayAfterNewMoon(date: Date): boolean {
  // This is a simplified approximation
  // For accurate calculation, we would need astronomical calculations or an API
  const hijri = gregorianToHijri(date);
  return hijri.day === 1;
}

export function getHijriWeekdays(): string[] {
  return ["Ahad", "Ithnayn", "Thulatha", "Arbaa", "Khamis", "Jumuah", "Sabt"];
}
