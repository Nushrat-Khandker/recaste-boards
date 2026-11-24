import { Body, Observer, SearchRiseSet, SearchHourAngle } from 'astronomy-engine';
import { calculateSolarData, dateKeyInZone, displayDateInZone, getSunsetForDate, getTimeZone, localDayStart } from './moon-calculations';

export interface SunsetDay {
  date: Date;
  dateKey: string;
  nextDateKey: string;
  timeZone: string;
  origin: Date;
  start: Date;
  end: Date;
  sunrise: Date | null;
  meridian: Date | null;
  moonrise: Date | null;
  moonset: Date | null;
  illumination: number;
}

export function sunsetDayDate(instant: Date, latitude: number, longitude: number): Date {
  const date = displayDateInZone(instant, getTimeZone(latitude, longitude));
  const sunset = getSunsetForDate(date, latitude, longitude);
  if (sunset && instant < sunset) date.setDate(date.getDate() - 1);
  return date;
}

/** Search only inside the real sunset interval, including next-morning events. */
export function calculateSunsetDay(date: Date, latitude: number, longitude: number): SunsetDay | null {
  const timeZone = getTimeZone(latitude, longitude);
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);
  const start = getSunsetForDate(date, latitude, longitude);
  const end = getSunsetForDate(nextDate, latitude, longitude);
  if (!start || !end || start >= end) return null;
  const dateKey = dateKeyInZone(start, timeZone);
  const nextDateKey = dateKeyInZone(end, timeZone);
  const observer = new Observer(latitude, longitude, 0);
  const within = (instant?: Date) => instant && instant >= start && instant < end ? instant : null;
  const riseSet = (body: Body, direction: number) => within(SearchRiseSet(body, observer, direction, start, (end.getTime() - start.getTime()) / 86400000)?.date);
  return {
    date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    dateKey, nextDateKey, timeZone, origin: localDayStart(dateKey, timeZone), start, end,
    sunrise: riseSet(Body.Sun, 1),
    meridian: within(SearchHourAngle(Body.Sun, observer, 0, start).time.date),
    moonrise: riseSet(Body.Moon, 1), moonset: riseSet(Body.Moon, -1),
    illumination: calculateSolarData(latitude, longitude, nextDateKey).illumination,
  };
}

/** Elapsed hours from this column's civil midnight; never wrap next-day events. */
export function chartHour(day: SunsetDay, instant: Date): number {
  return (instant.getTime() - day.origin.getTime()) / 3600000;
}

export function formatChartTime(instant: Date | null, timeZone: string): string {
  return instant ? new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(instant) : '—';
}

export interface ChartCalendarEvent {
  id: string; date: string; title: string; color: string;
  start_time?: string | null; end_time?: string | null; user_id?: string;
}

/** Interpret stored civil dates without shifting or rewriting the event. */
export function calendarEventInterval(event: ChartCalendarEvent, day: SunsetDay) {
  if (!event.start_time) return event.date === day.dateKey ? { start: day.start, end: day.end, allDay: true } : null;
  const [hour, minute] = event.start_time.split(':').map(Number);
  let start = new Date(localDayStart(event.date, day.timeZone).getTime() + (hour * 60 + minute) * 60000);
  // Correct DST offsets at the event itself, rather than reusing midnight's offset.
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: day.timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const resolve = (dateKey: string, time: string) => {
    const [h, m] = time.split(':').map(Number);
    let value = new Date(localDayStart(dateKey, day.timeZone).getTime() + (h * 60 + m) * 60000);
    for (let i = 0; i < 2; i++) {
      const [actualH, actualM] = formatter.format(value).split(':').map(Number);
      value = new Date(value.getTime() + ((h - actualH) * 60 + m - actualM) * 60000);
    }
    return value;
  };
  start = resolve(event.date, event.start_time);
  let end = event.end_time ? resolve(event.date, event.end_time) : new Date(start.getTime() + 3600000);
  if (end <= start && event.end_time) {
    const tomorrow = new Date(`${event.date}T12:00:00Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    end = resolve(tomorrow.toISOString().slice(0, 10), event.end_time);
  }
  if (end <= day.start || start >= day.end) return null;
  return { start: new Date(Math.max(start.getTime(), day.start.getTime())), end: new Date(Math.min(end.getTime(), day.end.getTime())), allDay: false };
}