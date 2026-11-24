/** Location-aware astronomy; exact phase instants retain the timeanddate reference table. */
import { Body, Observer, SearchRiseSet, SearchHourAngle, Illumination, SearchMoonPhase } from 'astronomy-engine';
import tzLookup from 'tz-lookup';
import { getReferencePhaseInstants } from './hijri-calendar-engine';

export interface PhaseEvent {
  utc: Date;
  phase: number;
  name: string;
  icon: string;
  label: string;
}
export interface SolarData {
  sunrise: number | null;
  sunset: number | null;
  noon: number | null;
  moonrise: number | null;
  moonset: number | null;
  utcOffset: number;
  timeZone: string;
  illumination: number;
  moonAge: number;
}
export interface DayData { date: Date; moonAge: number; s: SolarData; }

export function getTimeZone(lat: number, lng: number): string {
  return tzLookup(lat, lng);
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const value = (key: string) => Number(parts.find(p => p.type === key)?.value ?? 0);
  return { year: value('year'), month: value('month'), day: value('day'),
    hour: value('hour'), minute: value('minute'), second: value('second') };
}

export function dateKeyInZone(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Browser-local date used only as a civil date container for the existing calendar UI. */
export function displayDateInZone(date: Date, timeZone: string): Date {
  const p = zonedParts(date, timeZone);
  return new Date(p.year, p.month - 1, p.day);
}

export function offsetAt(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const localMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return (localMs - Math.floor(date.getTime() / 1000) * 1000) / 3600000;
}

/** Resolve civil midnight to UTC, including fractional offsets and DST. */
export function localDayStart(dateKey: string, timeZone: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  const nominal = Date.UTC(year, month - 1, day);
  let utc = nominal;
  for (let i = 0; i < 4; i++) utc = nominal - offsetAt(new Date(utc), timeZone) * 3600000;
  return new Date(utc);
}

export function buildPhaseEvents(pivot: Date): PhaseEvent[] {
  const labels = ['NM', 'FQ', 'FM', 'LQ'];
  return getReferencePhaseInstants()
    .filter(event => Math.abs(event.utc.getTime() - pivot.getTime()) < 180 * 86400000)
    .map(event => ({ ...event, label: labels[event.phase] }));
}

export function getLocalPhaseForDate(date: Date, timeZone: string) {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const events = getReferencePhaseInstants();
  for (let i = events.length - 2; i >= 0; i--) {
    const event = events[i], next = events[i + 1];
    const start = displayDateInZone(event.utc, timeZone);
    const end = displayDateInZone(next.utc, timeZone);
    if (target >= start.getTime() && target < end.getTime()) {
      const civilMs = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
      return { phase: event.name, phaseEmoji: event.icon,
        dayInPhase: Math.round((civilMs(date) - civilMs(start)) / 86400000) + 1,
        phaseDuration: Math.round((civilMs(end) - civilMs(start)) / 86400000),
        phaseInstant: event.utc };
    }
  }
  return null;
}

/** Calculate events strictly within the chosen civil day; no event is a legitimate null. */
export function calculateSolarData(lat: number, lng: number, dateKey: string): SolarData {
  const timeZone = getTimeZone(lat, lng);
  const start = localDayStart(dateKey, timeZone);
  const next = new Date(`${dateKey}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const end = localDayStart(next.toISOString().slice(0, 10), timeZone);
  const limitDays = (end.getTime() - start.getTime()) / 86400000;
  const observer = new Observer(lat, lng, 0);
  const hours = (instant: Date | undefined): number | null => {
    if (!instant || instant < start || instant >= end) return null;
    const p = zonedParts(instant, timeZone);
    return p.hour + p.minute / 60 + p.second / 3600;
  };
  const riseSet = (body: Body, direction: number) =>
    hours(SearchRiseSet(body, observer, direction, start, limitDays)?.date);
  const transit = SearchHourAngle(Body.Sun, observer, 0, start).time.date;
  const lunarTransit = SearchHourAngle(Body.Moon, observer, 0, start).time.date;
  // Like the reference site: illumination at lunar transit, or midday if no transit occurs that day.
  const sample = lunarTransit < end ? lunarTransit : new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);
  const newMoon = SearchMoonPhase(0, sample, -35)?.date;
  return {
    sunrise: riseSet(Body.Sun, 1), sunset: riseSet(Body.Sun, -1), noon: hours(transit),
    moonrise: riseSet(Body.Moon, 1), moonset: riseSet(Body.Moon, -1),
    utcOffset: offsetAt(sample, timeZone), timeZone,
    illumination: Illumination(Body.Moon, sample).phase_fraction * 100,
    moonAge: newMoon ? (sample.getTime() - newMoon.getTime()) / 86400000 : 0,
  };
}

// Keep the existing asynchronous interface; calculation no longer needs an external API.
export async function fetchSolarData(lat: number, lng: number, dateKey: string): Promise<SolarData | null> {
  try { return calculateSolarData(lat, lng, dateKey); } catch { return null; }
}

export function localDate(utcDate: Date, offsetH: number): Date {
  const d = new Date(utcDate.getTime() + offsetH * 3600000);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function fmtH(h: number | null): string {
  if (h === null || !Number.isFinite(h)) return '—';
  const minutes = ((Math.round(h * 60) % 1440) + 1440) % 1440;
  const hour = Math.floor(minutes / 60);
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, '0')}${hour >= 12 ? 'pm' : 'am'}`;
}

export function moonPhaseIcon(age: number): { icon: string; label: string } {
  const frac = (age % 29.53) / 29.53;
  if (frac < 0.03 || frac > 0.97) return { icon: '🌑', label: 'New Moon' };
  if (frac < 0.22) return { icon: '🌒', label: 'Waxing Crescent' };
  if (frac < 0.28) return { icon: '🌓', label: '1st Quarter' };
  if (frac < 0.47) return { icon: '🌔', label: 'Waxing Gibbous' };
  if (frac < 0.53) return { icon: '🌕', label: 'Full Moon' };
  if (frac < 0.72) return { icon: '🌖', label: 'Waning Gibbous' };
  if (frac < 0.78) return { icon: '🌗', label: '3rd Quarter' };
  return { icon: '🌘', label: 'Waning Crescent' };
}
