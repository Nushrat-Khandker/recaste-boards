import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getLocalPhaseBoundaries, displayDateInZone } from './moon-calculations';
import { getHijriMonthName } from './hijri-utils';
import { findLunationForDate } from './hijri-calendar-engine';
import { buildMonthPhaseSheets, type PrintPhaseBlock } from './phase-print';

const DHAKA = { latitude: 23.8103, longitude: 90.4125, timeZone: 'Asia/Dhaka' };

type Block = PrintPhaseBlock & { labelBoundary: Date; endBoundary: Date };

/** Same phase blocks the Phase view builds, narrowed to what printing needs. */
function blocksFor(latitude: number, longitude: number, timeZone: string): Block[] {
  const events = getLocalPhaseBoundaries(latitude, longitude);
  const blocks: Block[] = [];
  for (let i = 0; i < events.length - 1; i++) {
    const event = events[i];
    const boundary = event.labelBoundary, endBoundary = events[i + 1].labelBoundary;
    if (!boundary || !endBoundary || boundary >= endBoundary) continue;
    blocks.push({
      name: event.name, icon: event.icon,
      startDate: displayDateInZone(boundary, timeZone),
      endDate: displayDateInZone(endBoundary, timeZone),
      startInstant: event.utc,
      hijriYear: event.hijriYear, hijriMonth: event.hijriMonth,
      labelBoundary: boundary, endBoundary,
    });
  }
  return blocks.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

describe('Whole-month phase printing', () => {
  const blocks = blocksFor(DHAKA.latitude, DHAKA.longitude, DHAKA.timeZone);
  const now = new Date();
  const current = blocks.find(block => block.labelBoundary <= now && now < block.endBoundary) ?? blocks[0];
  const sheets = buildMonthPhaseSheets(blocks, current, DHAKA.latitude, DHAKA.longitude);

  it('prints every phase of the current Hijri month as its own sheet', () => {
    assert.ok(blocks.length > 0);
    assert.ok(sheets.length >= 3, `expected at least three phases, got ${sheets.length}`);
    const title = `${getHijriMonthName(current.hijriMonth)} ${current.hijriYear} AH`;
    for (const sheet of sheets) assert.equal(sheet.title, title);
  });

  it('keeps one unbroken run of sunset-to-sunset columns across the month', () => {
    const keys = sheets.flatMap(sheet => sheet.days.map(day => day.dateKey));
    assert.ok(keys.length >= 29 && keys.length <= 30, `expected 29 or 30 days, got ${keys.length}`);
    assert.equal(new Set(keys).size, keys.length);
    for (let i = 1; i < keys.length; i++) {
      const next = new Date(keys[i - 1] + 'T00:00:00');
      next.setDate(next.getDate() + 1);
      assert.equal(keys[i], keyOf(next));
    }
  });

  it('marks each sheet with the phase that opens the next one, and stops at the month end', () => {
    for (let i = 0; i < sheets.length - 1; i++) {
      const marker = sheets[i].phaseChange;
      assert.ok(marker, `sheet ${i} is missing its phase change`);
      assert.equal(`${marker.icon} ${marker.name}`, sheets[i + 1].phaseLabel);
    }
    assert.equal(sheets[sheets.length - 1].phaseChange, undefined);
  });

  it('keeps every printed column inside the Hijri month it is titled for', () => {
    for (const sheet of sheets) {
      for (const day of sheet.days) {
        const lunation = findLunationForDate(day.date);
        assert.equal(lunation.hijriYear, current.hijriYear);
        assert.equal(lunation.hijriMonth, current.hijriMonth);
      }
    }
  });
});
