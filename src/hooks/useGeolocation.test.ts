import { it } from 'node:test';
import assert from 'node:assert/strict';
import { ensureCalendarLocationRequested } from './useGeolocation';

it('requests device location once across calendar consumers, ignoring saved city selection', () => {
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let requests = 0;
  let savedCityReads = 0;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
    geolocation: { getCurrentPosition: () => { requests++; } },
  } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => { savedCityReads++; return 'london'; },
  } });
  try {
    ensureCalendarLocationRequested();
    ensureCalendarLocationRequested();
    ensureCalendarLocationRequested();
    assert.equal(requests, 1);
    assert.equal(savedCityReads, 0);
  } finally {
    if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator);
    else Reflect.deleteProperty(globalThis, 'navigator');
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});