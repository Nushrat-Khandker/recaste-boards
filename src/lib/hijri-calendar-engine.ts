/**
 * Unified Hijri Calendar Engine — Timezone-Aware Lookup Table
 * Phase timestamps sourced from timeanddate.com (2024–2027), stored as UTC ms.
 * `new Date(ts)` automatically converts to the user's local timezone,
 * so phase dates shift correctly for any location.
 */

// ── Phase metadata ──────────────────────────────────────────────
export const PHASE_NAMES = ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter'] as const;
export const PHASE_EMOJIS = ['🌑', '🌓', '🌕', '🌗'] as const;

// Legacy exports for compatibility
export const SYNODIC_MONTH = 29.53059;
export const KNOWN_NEW_MOON = new Date(Date.UTC(2025, 5, 25));
export const ANCHOR_HIJRI_YEAR = 1447;
export const ANCHOR_HIJRI_MONTH = 1;
export const PHASE_OFFSETS = [0, 7.4, 14.8, 22.1];

// ── UTC timestamps (ms) for each lunation: [NM, FQ, FM, LQ] ────
// Source: timeanddate.com Washington DC times → converted to UTC
const LUNATION_TIMESTAMPS: [number, number, number, number][] = [
  [1704974220000,1705549920000,1706205180000,1706915880000],
  [1707519540000,1708095600000,1708777800000,1709479380000],
  [1710061200000,1710648600000,1711350000000,1712027640000],
  [1712600400000,1713208380000,1713916080000,1714562820000],
  [1715138460000,1715773680000,1716472380000,1717089120000],
  [1717677420000,1718342280000,1719018420000,1719611580000],
  [1720220220000,1720910880000,1721557020000,1722135060000],
  [1722769980000,1723475880000,1724091900000,1724664300000],
  [1725328500000,1726034700000,1726626840000,1727203740000],
  [1727894940000,1728586500000,1729164360000,1729756980000],
  [1730465220000,1731131700000,1731706080000,1732325220000],
  [1733034060000,1733671560000,1734253260000,1734905880000],
  [1735597560000,1736207760000,1736807160000,1737491400000],
  // 2025
  [1738154100000,1738742520000,1739368380000,1740072720000],
  [1740703440000,1741278660000,1741935240000,1742642940000],
  [1743245820000,1743819240000,1744503720000,1745199300000],
  [1745782260000,1746366660000,1747068900000,1747742280000],
  [1748314920000,1748922000000,1749627780000,1750274340000],
  [1750847460000,1751484600000,1752179760000,1752799020000], // ← 1 Muharram 1447
  [1753384260000,1754052060000,1754726040000,1755321120000],
  [1755929160000,1756621500000,1757268480000,1757845920000],
  [1758484440000,1759189980000,1759808820000,1760379120000],
  [1761049500000,1761754800000,1762348740000,1762925280000],
  [1763621220000,1764313080000,1764890040000,1765486260000],
  [1766194980000,1766862540000,1767434520000,1768060080000],
  // 2026
  [1768765860000,1769402820000,1769983740000,1770640980000],
  [1771329660000,1771936020000,1772537820000,1773221880000],
  [1773883380000,1774466220000,1775095860000,1775796660000], // ← Shawwal 1447
  [1776426660000,1776997860000,1777656180000,1778361000000],
  [1778961660000,1779534600000,1780217100000,1780912800000],
  [1781492040000,1782078900000,1782777360000,1783452540000],
  [1784022180000,1784631900000,1785335700000,1785982860000],
  [1786556160000,1787193960000,1787890680000,1788508260000],
  [1789097160000,1789764180000,1790441340000,1791033900000],
  [1791647400000,1792339920000,1792987860000,1793564880000],
  [1794207720000,1794916020000,1795531980000,1796105280000],
  [1796777460000,1797486120000,1798075680000,1798657140000],
  // 2027
  [1799353440000,1800045240000,1800620220000,1801220100000],
  [1801929360000,1802591880000,1803165780000,1803791760000],
  [1804498140000,1805127900000,1805712180000,1806367980000],
  [1807055460000,1807656960000,1808260020000,1808943420000],
  [1809601080000,1810183380000,1810810740000,1811512680000],
  [1812138000000,1812711360000,1813365840000,1814072040000],
  [1814670120000,1815244740000,1815925440000,1816620840000],
  [1817201100000,1817787240000,1818487680000,1819160820000],
  [1819734060000,1820341860000,1821049380000,1821694800000],
  [1822271760000,1822909620000,1823608020000,1824226140000],
  [1824816960000,1825487940000,1826162700000,1826758080000],
  [1827372240000,1828070520000,1828714080000,1829293860000],
  [1829938320000,1830618000000,1831222800000,1831914000000],
];

// ── Derive local dates from timestamps ──────────────────────────

/** Convert a UTC timestamp to a local-midnight Date (user's timezone) */
function tsToLocalDate(ts: number): Date {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Format a local Date to 'YYYY-MM-DD' */
function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Days between two dates (local midnight) */
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** Normalize any Date to local midnight */
function toLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// ── Anchor ──────────────────────────────────────────────────────
// Index 18 in LUNATION_TIMESTAMPS = 1 Muharram 1447
const ANCHOR_INDEX = 18;

// ── Lunation data ───────────────────────────────────────────────

export interface LunationData {
  index: number;
  nm: Date;
  fq: Date;
  fm: Date;
  lq: Date;
  nextNm: Date;
  hijriYear: number;
  hijriMonth: number;
}

function getLunation(idx: number): LunationData | null {
  if (idx < 0 || idx >= LUNATION_TIMESTAMPS.length) return null;
  const t = LUNATION_TIMESTAMPS[idx];
  const nextNm = idx + 1 < LUNATION_TIMESTAMPS.length
    ? tsToLocalDate(LUNATION_TIMESTAMPS[idx + 1][0])
    : new Date(tsToLocalDate(t[0]).getTime() + 30 * 86400000);

  const monthOffset = idx - ANCHOR_INDEX;
  const rawMonth = ANCHOR_HIJRI_MONTH - 1 + monthOffset;
  const hijriMonth = ((rawMonth % 12) + 12) % 12 + 1;
  const hijriYear = ANCHOR_HIJRI_YEAR + Math.floor(rawMonth / 12);

  return {
    index: idx,
    nm: tsToLocalDate(t[0]),
    fq: tsToLocalDate(t[1]),
    fm: tsToLocalDate(t[2]),
    lq: tsToLocalDate(t[3]),
    nextNm,
    hijriYear,
    hijriMonth,
  };
}

function findLunationIndex(date: Date): number {
  const t = date.getTime();
  for (let i = LUNATION_TIMESTAMPS.length - 1; i >= 0; i--) {
    if (tsToLocalDate(LUNATION_TIMESTAMPS[i][0]).getTime() <= t) return i;
  }
  return 0;
}

export function findLunationForDate(date: Date): LunationData {
  const local = toLocalMidnight(date);
  const idx = findLunationIndex(local);
  return getLunation(idx)!;
}

// ── Phase info ──────────────────────────────────────────────────

export interface PhaseInfo {
  phaseIndex: number;
  phase: string;
  phaseEmoji: string;
  dayInPhase: number;
  phaseDuration: number;
  phaseStartDate: Date;
  phaseEndDate: Date;
}

export function getPhaseForDate(date: Date, lun?: LunationData): PhaseInfo {
  const local = toLocalMidnight(date);
  const l = lun || findLunationForDate(local);
  const t = local.getTime();

  const boundaries = [l.nm, l.fq, l.fm, l.lq, l.nextNm];

  let pi = 3;
  for (let i = 0; i < 4; i++) {
    if (t >= boundaries[i].getTime() && t < boundaries[i + 1].getTime()) {
      pi = i;
      break;
    }
  }

  const start = boundaries[pi];
  const end = boundaries[pi + 1];
  const duration = daysBetween(start, end);
  const dayIn = daysBetween(start, local) + 1;

  return {
    phaseIndex: pi,
    phase: PHASE_NAMES[pi],
    phaseEmoji: PHASE_EMOJIS[pi],
    dayInPhase: Math.min(dayIn, duration),
    phaseDuration: duration,
    phaseStartDate: start,
    phaseEndDate: end,
  };
}

// ── Full Hijri info ─────────────────────────────────────────────

export interface HijriDateInfo {
  year: number;
  month: number;
  day: number;
  phase: string;
  phaseEmoji: string;
  phaseIndex: number;
  dayInPhase: number;
  phaseDuration: number;
}

export function getHijriForDate(date: Date): HijriDateInfo {
  const local = toLocalMidnight(date);
  const lun = findLunationForDate(local);
  const phase = getPhaseForDate(local, lun);
  const day = daysBetween(lun.nm, local) + 1;

  return {
    year: lun.hijriYear,
    month: lun.hijriMonth,
    day,
    phase: phase.phase,
    phaseEmoji: phase.phaseEmoji,
    phaseIndex: phase.phaseIndex,
    dayInPhase: phase.dayInPhase,
    phaseDuration: phase.phaseDuration,
  };
}

// ── Compatibility API ───────────────────────────────────────────

export function getHijriFromNewMoon(nmDate: Date): { year: number; month: number } {
  const lun = findLunationForDate(nmDate);
  return { year: lun.hijriYear, month: lun.hijriMonth };
}

export function findNewMoonForDate(date: Date): Date {
  return findLunationForDate(date).nm;
}

export function getCurrentHijriMonth(): { year: number; month: number } {
  const lun = findLunationForDate(new Date());
  return { year: lun.hijriYear, month: lun.hijriMonth };
}

export function getCurrentHijriYear(): number {
  return getCurrentHijriMonth().year;
}

export function getMonthStartDate(hijriYear: number, hijriMonth: number): Date {
  const targetOffset = (hijriYear - ANCHOR_HIJRI_YEAR) * 12 + (hijriMonth - ANCHOR_HIJRI_MONTH);
  const targetIdx = ANCHOR_INDEX + targetOffset;
  if (targetIdx >= 0 && targetIdx < LUNATION_TIMESTAMPS.length) {
    return tsToLocalDate(LUNATION_TIMESTAMPS[targetIdx][0]);
  }
  // Fallback for out-of-range
  const ms = KNOWN_NEW_MOON.getTime() + targetOffset * SYNODIC_MONTH * 86400000;
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function getMonthEndDate(hijriYear: number, hijriMonth: number): Date {
  let nextMonth = hijriMonth + 1;
  let nextYear = hijriYear;
  if (nextMonth > 12) { nextMonth = 1; nextYear++; }
  return getMonthStartDate(nextYear, nextMonth);
}

export function getLunationForHijriMonth(hijriYear: number, hijriMonth: number): LunationData | null {
  const targetOffset = (hijriYear - ANCHOR_HIJRI_YEAR) * 12 + (hijriMonth - ANCHOR_HIJRI_MONTH);
  const targetIdx = ANCHOR_INDEX + targetOffset;
  return getLunation(targetIdx);
}

export function computeNewMoonDates(_fromYear: number, _toYear: number): Date[] {
  const start = new Date(_fromYear, 0, 1);
  const end = new Date(_toYear, 11, 31);
  return LUNATION_TIMESTAMPS
    .map(t => tsToLocalDate(t[0]))
    .filter(d => d >= start && d <= end);
}

export function computeNewMoonStrings(fromYear: number, toYear: number): string[] {
  return computeNewMoonDates(fromYear, toYear).map(fmtDate);
}

export function getAllNewMoons(): Date[] {
  return LUNATION_TIMESTAMPS.map(t => tsToLocalDate(t[0]));
}

export function getPhaseBoundariesForLunation(lun: LunationData): number[] {
  return [
    0,
    daysBetween(lun.nm, lun.fq),
    daysBetween(lun.nm, lun.fm),
    daysBetween(lun.nm, lun.lq),
    daysBetween(lun.nm, lun.nextNm),
  ];
}

export function getPhaseBoundaries(): number[] {
  return [...PHASE_OFFSETS.map(Math.round), Math.round(SYNODIC_MONTH)];
}
