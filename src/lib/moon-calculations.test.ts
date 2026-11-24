import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSolarData, dateKeyInZone, localDayStart, getTimeZone, fmtH, getLocalPhaseForDate } from './moon-calculations';
import { getReferencePhaseInstants, getMonthStartDate } from './hijri-calendar-engine';

describe('Location-based astronomy', () => {
  // Reference: timeanddate.com/moon/bangladesh/dhaka?month=11&year=2026
  it('agrees with Dhaka reference moon times within two minutes', () => {
    const data = calculateSolarData(23.8103, 90.4125, '2026-11-24');
    assert.equal(data.timeZone, 'Asia/Dhaka');
    assert.equal(data.utcOffset, 6);
    assert.ok(data.moonrise !== null && Math.abs(data.moonrise * 60 - (16 * 60 + 43)) < 2);
    assert.ok(data.moonset !== null && Math.abs(data.moonset * 60 - (5 * 60 + 45)) < 2);
    assert.ok(Math.abs(data.illumination - 99.8) < 0.1);
  });
  // Reference: timeanddate.com/moon/uk/london?month=11&year=2026
  it('changes moonrise and moonset to London local times', () => {
    const data = calculateSolarData(51.5074, -0.1278, '2026-11-24');
    assert.equal(data.timeZone, 'Europe/London');
    assert.equal(data.utcOffset, 0);
    assert.ok(data.moonrise !== null && Math.abs(data.moonrise * 60 - (15 * 60 + 17)) < 2);
    assert.ok(data.moonset !== null && Math.abs(data.moonset * 60 - (7 * 60 + 43)) < 2);
  });
  it('does not invent a moonset when none happens that day', () => {
    assert.equal(calculateSolarData(23.8103, 90.4125, '2026-11-18').moonset, null);
  });
  it('uses actual daylight-saving day lengths', () => {
    const start = localDayStart('2026-03-08', 'America/New_York');
    const end = localDayStart('2026-03-09', 'America/New_York');
    assert.equal(start.toISOString(), '2026-03-08T05:00:00.000Z');
    assert.equal((end.getTime() - start.getTime()) / 3600000, 23);
    const autumn = localDayStart('2026-11-01', 'America/New_York');
    const autumnEnd = localDayStart('2026-11-02', 'America/New_York');
    assert.equal((autumnEnd.getTime() - autumn.getTime()) / 3600000, 25);
  });
  it('accepts zero coordinates and fractional timezone offsets', () => {
    assert.equal(getTimeZone(0, 0), 'Etc/GMT');
    assert.equal(localDayStart('2026-11-24', 'Asia/Kolkata').toISOString(), '2026-11-23T18:30:00.000Z');
  });
  it('keeps reference phase instants but changes their civil dates by location', () => {
    const newMoon = getReferencePhaseInstants().find(e => e.phase === 0 && e.utc.toISOString().startsWith('2026-12-09'));
    assert.ok(newMoon);
    assert.equal(dateKeyInZone(newMoon.utc, 'Asia/Dhaka'), '2026-12-09');
    assert.equal(dateKeyInZone(newMoon.utc, 'America/New_York'), '2026-12-08');
    const dhaka = getLocalPhaseForDate(new Date(2026, 11, 9), 'Asia/Dhaka');
    const newYork = getLocalPhaseForDate(new Date(2026, 11, 8), 'America/New_York');
    assert.equal(dhaka?.dayInPhase, 1);
    assert.equal(newYork?.dayInPhase, 1);
    assert.equal(dhaka?.phaseInstant.getTime(), newYork?.phaseInstant.getTime());
  });
  it('retains the exact November full-moon reference time', () => {
    const full = getReferencePhaseInstants().find(e => e.phase === 2 && e.utc.toISOString().startsWith('2026-11-24'));
    assert.ok(full);
    assert.equal(full.utc.toISOString(), '2026-11-24T14:53:00.000Z');
  });
  it('does not change the established Hijri month anchor', () => {
    const date = getMonthStartDate(1447, 1);
    assert.equal(date.getFullYear(), 2025);
    assert.equal(date.getMonth(), 5);
    assert.equal(date.getDate(), 25);
  });
  it('rounds times without ever displaying minute 60', () => {
    assert.equal(fmtH(23 + 59.9 / 60), '12:00am');
    assert.equal(fmtH(null), '—');
  });
});