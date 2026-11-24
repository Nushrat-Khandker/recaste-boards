import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSunsetDay, chartHour, sunsetDayDate, sunsetDayDisplayDate, calendarEventInterval } from './sunset-day';
import { calculateSolarData, dateKeyInZone, getLocalPhaseForInstant } from './moon-calculations';

describe('Sunset-to-sunset calendar days', () => {
  it('counts Tuesday after sunset as Day 4 through Wednesday sunset without changing stored dates', () => {
    const openingDate = new Date(2026, 10, 24);
    const day = calculateSunsetDay(openingDate, 23.8103, 90.4125);
    assert.ok(day);
    const weekday = (instant: Date) => sunsetDayDisplayDate(sunsetDayDate(instant, 23.8103, 90.4125)).getDay() + 1;
    assert.equal(weekday(new Date(day.start.getTime() - 1)), 3);
    assert.equal(weekday(day.start), 4);
    assert.equal(weekday(new Date('2026-11-25T00:00:00Z')), 4);
    assert.equal(weekday(new Date(day.end.getTime() - 1)), 4);
    assert.equal(weekday(day.end), 5);
    assert.equal(openingDate.getDate(), 24);
    assert.equal(day.dateKey, '2026-11-24');
  });
  it('keeps all of Day 4 in First Quarter despite the Tuesday evening full moon', () => {
    const day = calculateSunsetDay(new Date(2026, 10, 24), 23.8103, 90.4125);
    assert.ok(day);
    for (const instant of [day.start, new Date('2026-11-24T14:53:00Z'), new Date('2026-11-25T00:00:00Z'), new Date(day.end.getTime() - 1)]) {
      assert.equal(getLocalPhaseForInstant(instant, 23.8103, 90.4125)?.phase, 'First Quarter');
    }
    assert.equal(getLocalPhaseForInstant(day.end, 23.8103, 90.4125)?.phase, 'Full Moon');
  });
  it('starts at November 24 sunset and ends at November 25 sunset in Dhaka', () => {
    const day = calculateSunsetDay(new Date(2026, 10, 24), 23.8103, 90.4125);
    assert.ok(day);
    assert.equal(dateKeyInZone(day.start, day.timeZone), '2026-11-24');
    assert.equal(dateKeyInZone(day.end, day.timeZone), '2026-11-25');
    assert.ok(Math.abs(chartHour(day, day.start) - (calculateSolarData(23.8103, 90.4125, '2026-11-24').sunset ?? 0)) < 1 / 3600);
    assert.ok(Math.abs(chartHour(day, day.end) - 24 - (calculateSolarData(23.8103, 90.4125, '2026-11-25').sunset ?? 0)) < 1 / 3600);
  });
  it('places next-morning sunrise and next daytime solar meridian inside the interval', () => {
    const day = calculateSunsetDay(new Date(2026, 10, 24), 23.8103, 90.4125);
    assert.ok(day && day.sunrise && day.meridian);
    assert.equal(dateKeyInZone(day.sunrise, day.timeZone), '2026-11-25');
    assert.equal(dateKeyInZone(day.meridian, day.timeZone), '2026-11-25');
    assert.ok(day.start < day.sunrise && day.sunrise < day.meridian && day.meridian < day.end);
    assert.ok(chartHour(day, day.sunrise) > 24);
    assert.ok(chartHour(day, day.meridian) > 35 && chartHour(day, day.meridian) < 37);
  });
  it('keeps the same day through midnight and changes it only at sunset', () => {
    const day = calculateSunsetDay(new Date(2026, 10, 24), 23.8103, 90.4125);
    assert.ok(day);
    const key = (instant: Date) => sunsetDayDate(instant, 23.8103, 90.4125).getDate();
    assert.equal(key(new Date('2026-11-25T00:00:00Z')), 24);
    assert.equal(key(new Date(day.end.getTime() - 1000)), 24);
    assert.equal(key(day.end), 25);
  });
  it('plots moon events only within the actual sunset interval', () => {
    const day = calculateSunsetDay(new Date(2026, 10, 24), 23.8103, 90.4125);
    assert.ok(day && day.moonset);
    assert.equal(dateKeyInZone(day.moonset, day.timeZone), '2026-11-25');
    for (const instant of [day.moonrise, day.moonset]) if (instant) assert.ok(instant >= day.start && instant < day.end);
  });
  it('does not fabricate sunset-to-sunset days in polar daylight', () => {
    assert.equal(calculateSunsetDay(new Date(2026, 5, 21), 69.6492, 18.9553), null);
  });
  it('keeps exact elapsed-hour positions through a daylight-saving change', () => {
    const day = calculateSunsetDay(new Date(2026, 2, 7), 40.7128, -74.006);
    assert.ok(day && day.sunrise && day.meridian);
    assert.ok(day.end.getTime() - day.start.getTime() > 23.9 * 3600000);
    assert.ok(day.end.getTime() - day.start.getTime() < 24.1 * 3600000);
    assert.equal(dateKeyInZone(day.sunrise, day.timeZone), '2026-03-08');
    assert.equal(chartHour(day, day.sunrise), (day.sunrise.getTime() - day.origin.getTime()) / 3600000);
    assert.ok(day.sunrise < day.meridian && day.meridian < day.end);
  });
  it('shows next morning events without rewriting their stored date', () => {
    const day = calculateSunsetDay(new Date(2026, 10, 24), 23.8103, 90.4125);
    assert.ok(day);
    const event = { id: 'morning', date: '2026-11-25', title: 'Work', color: 'teal', start_time: '09:00', end_time: '10:00' };
    const interval = calendarEventInterval(event, day);
    assert.ok(interval);
    assert.equal(chartHour(day, interval.start), 33);
    assert.equal(event.date, '2026-11-25');
    assert.equal(calendarEventInterval({ ...event, date: '2026-11-24' }, day), null);
  });
});