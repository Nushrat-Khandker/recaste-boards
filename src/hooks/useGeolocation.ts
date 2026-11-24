import { useEffect, useSyncExternalStore } from 'react';
import { CALENDAR_LOCATIONS, DEFAULT_CALENDAR_LOCATION } from '@/lib/calendar-locations';
import { getTimeZone } from '@/lib/moon-calculations';

const STORAGE_KEY = 'community-calendar-city';
interface GeolocationState {
  latitude: number;
  longitude: number;
  loading: boolean;
  error: string | null;
  selection: string;
  label: string;
}
let state: GeolocationState = {
  ...DEFAULT_CALENDAR_LOCATION, loading: true, error: null,
  selection: 'auto', label: 'Dhaka (default)',
};
let started = false;
let requestId = 0;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => state;
const update = (patch: Partial<GeolocationState>) => { state = { ...state, ...patch }; listeners.forEach(fn => fn()); };
function saveSelection(value: string) {
  try { localStorage.setItem(STORAGE_KEY, value); } catch { /* unavailable storage does not block astronomy */ }
}
function selectCity(id: string) {
  if (id === 'auto') { saveSelection(id); requestLocation(); return; }
  const city = CALENDAR_LOCATIONS.find(c => c.id === id);
  if (!city) return;
  requestId++;
  saveSelection(id);
  update({ ...city, loading: false, error: null, selection: city.id });
}
function requestLocation() {
  const id = ++requestId;
  update({ loading: true, error: null, selection: 'auto' });
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
    update({ ...DEFAULT_CALENDAR_LOCATION, loading: false, error: 'Location unavailable — choose a city', label: 'Dhaka (default)' });
  }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
}
export function useGeolocation() {
  const current = useSyncExternalStore(subscribe, snapshot);
  useEffect(() => {
    if (started) return;
    started = true;
    let selection = 'auto';
    try { selection = localStorage.getItem(STORAGE_KEY) || 'auto'; } catch { /* use GPS */ }
    if (CALENDAR_LOCATIONS.some(city => city.id === selection)) selectCity(selection);
    else requestLocation();
  }, []);
  return { ...current, timeZone: getTimeZone(current.latitude, current.longitude), selectCity,
    requestLocation: () => { saveSelection('auto'); requestLocation(); } };
}
export type CalendarLocationState = ReturnType<typeof useGeolocation>;
