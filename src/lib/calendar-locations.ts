export const CALENDAR_LOCATIONS = [
  { id: 'dhaka', label: 'Dhaka', latitude: 23.8103, longitude: 90.4125 },
  { id: 'mecca', label: 'Mecca', latitude: 21.3891, longitude: 39.8579 },
  { id: 'riyadh', label: 'Riyadh', latitude: 24.6877, longitude: 46.7219 },
  { id: 'dubai', label: 'Dubai', latitude: 25.2048, longitude: 55.2708 },
  { id: 'cairo', label: 'Cairo', latitude: 30.0444, longitude: 31.2357 },
  { id: 'london', label: 'London', latitude: 51.5074, longitude: -0.1278 },
  { id: 'edinburgh', label: 'Edinburgh', latitude: 55.9533, longitude: -3.1883 },
  { id: 'new-york', label: 'New York', latitude: 40.7128, longitude: -74.006 },
  { id: 'kuala-lumpur', label: 'Kuala Lumpur', latitude: 3.139, longitude: 101.6869 },
  { id: 'singapore', label: 'Singapore', latitude: 1.3521, longitude: 103.8198 },
] as const;

export const DEFAULT_CALENDAR_LOCATION = CALENDAR_LOCATIONS[0];