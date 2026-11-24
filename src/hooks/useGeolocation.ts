import { useEffect, useSyncExternalStore } from 'react';
import { DEFAULT_CALENDAR_LOCATION } from '@/lib/calendar-locations';
import { getTimeZone } from '@/lib/moon-calculations';

interface GeolocationState {
  latitude: number;
  longitude: number;
  loading: boolean;
  error: string | null;
  label: string;
}
let state: GeolocationState = {
  ...DEFAULT_CALENDAR_LOCATION, loading: true, error: null,
  label: 'Dhaka (default)',
};
let started = false;
let requestId = 0;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => state;
const update = (patch: Partial<GeolocationState>) => { state = { ...state, ...patch }; listeners.forEach(fn => fn()); };
function requestLocation() {
  const id = ++requestId;
  update({ loading: true, error: null });
  if (!navigator.geolocation) {
    update({ ...DEFAULT_CALENDAR_LOCATION, loading: false, error: 'Location unavailable', label: 'Dhaka (default)' });
    return;
  }
  navigator.geolocation.getCurrentPosition(position => {
    if (id !== requestId) return;
    const { latitude, longitude } = position.coords;
    update({ latitude, longitude, loading: false, error: null, label: 'Your location' });
  }, () => {
    if (id !== requestId) return;
    update({ ...DEFAULT_CALENDAR_LOCATION, loading: false, error: 'Location unavailable — using Dhaka. Allow location access to use your local times.', label: 'Dhaka (default)' });
  }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
}
export function ensureCalendarLocationRequested() {
  if (started) return;
  started = true;
  requestLocation();
}

export function useGeolocation() {
  const current = useSyncExternalStore(subscribe, snapshot);
  useEffect(ensureCalendarLocationRequested, []);
  return { ...current, timeZone: getTimeZone(current.latitude, current.longitude), requestLocation };
}
export type CalendarLocationState = ReturnType<typeof useGeolocation>;
