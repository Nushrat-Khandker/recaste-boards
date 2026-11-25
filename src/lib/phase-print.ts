import { calculateSunsetDay, type SunsetDay } from './sunset-day';
import { getHijriMonthName } from './hijri-utils';

/** Minimal shape of a calendar phase block needed to print a whole Hijri month. */
export interface PrintPhaseBlock {
  name: string;
  icon: string;
  startDate: Date;
  endDate: Date;
  startInstant: Date;
  hijriYear: number;
  hijriMonth: number;
}

export interface PhasePrintSheetData {
  key: string;
  title: string;
  phaseLabel: string;
  days: SunsetDay[];
  phaseChange?: { instant: Date; icon: string; name: string };
}

/** Sunset-to-sunset columns for one phase block, in chronological order. */
export function sunsetDaysForBlock(block: PrintPhaseBlock, latitude: number, longitude: number): SunsetDay[] {
  const dates: Date[] = [];
  const cursor = new Date(block.startDate);
  while (cursor < block.endDate) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  if (!dates.length) dates.push(new Date(block.startDate));
  return dates.map(date => calculateSunsetDay(date, latitude, longitude)).filter((day): day is SunsetDay => day !== null);
}

/** Every phase of the Hijri month the given block belongs to, one print sheet each. */
export function buildMonthPhaseSheets(
  blocks: PrintPhaseBlock[],
  block: PrintPhaseBlock,
  latitude: number,
  longitude: number,
): PhasePrintSheetData[] {
  const monthBlocks = blocks
    .filter(b => b.hijriYear === block.hijriYear && b.hijriMonth === block.hijriMonth)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const monthName = getHijriMonthName(block.hijriMonth);
  return monthBlocks.map((b, index) => {
    const next = monthBlocks[index + 1];
    return {
      key: `${b.hijriYear}-${b.hijriMonth}-${index}`,
      title: `${monthName} ${b.hijriYear} AH`,
      phaseLabel: `${b.icon} ${b.name}`,
      days: sunsetDaysForBlock(b, latitude, longitude),
      phaseChange: next ? { instant: next.startInstant, icon: next.icon, name: next.name } : undefined,
    };
  }).filter(sheet => sheet.days.length > 0);
}
