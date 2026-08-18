/**
 * Moon Phase Calculator — Jean Meeus "Astronomical Algorithms"
 * Ported from qamar.html
 */

const R = Math.PI / 180;

export interface PhaseEvent {
  utc: Date;
  phase: number; // 0=New, 1=FQ, 2=Full, 3=LQ
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
}

export interface DayData {
  date: Date;
  moonAge: number;
  s: SolarData;
}

function _jde(k: number, p: number): number {
  const kk = k + p * 0.25;
  const T = kk / 1236.85, T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  let J = 2451550.09766 + 29.530588861 * kk + 0.00015437 * T2
    - 0.000000150 * T3 + 0.00000000073 * T4;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const M = (2.5534 + 29.10535670 * kk - 0.0000014 * T2) * R;
  const Mp = (201.5643 + 385.81693528 * kk + 0.0107582 * T2 + 0.00001238 * T3) * R;
  const F = (160.7108 + 390.67050284 * kk - 0.0016118 * T2 - 0.00000227 * T3) * R;
  const Om = (124.7746 - 1.56375588 * kk + 0.0020672 * T2) * R;

  if (p === 0 || p === 2) {
    const nm = p === 0;
    J += (nm ? -0.40720 : -0.40614) * Math.sin(Mp) + 0.17241 * E * Math.sin(M)
      + (nm ? 0.01608 : 0.01614) * Math.sin(2 * Mp) + (nm ? 0.01039 : 0.01043) * Math.sin(2 * F)
      + 0.00739 * E * Math.sin(Mp - M) - 0.00514 * E * Math.sin(Mp + M)
      + 0.00208 * E * E * Math.sin(2 * M) - 0.00111 * Math.sin(Mp - 2 * F)
      - 0.00057 * Math.sin(Mp + 2 * F) + 0.00056 * E * Math.sin(2 * Mp + M)
      - 0.00042 * Math.sin(3 * Mp) + 0.00042 * E * Math.sin(M + 2 * F)
      + 0.00038 * E * Math.sin(M - 2 * F) - 0.00024 * E * Math.sin(2 * Mp - M)
      - 0.00017 * Math.sin(Om) - 0.00007 * Math.sin(Mp + 2 * M)
      + 0.00004 * Math.sin(2 * Mp - 2 * F) + 0.00004 * Math.sin(3 * M)
      + 0.00003 * Math.sin(Mp + M - 2 * F) + 0.00003 * Math.sin(2 * Mp + 2 * F)
      - 0.00003 * Math.sin(Mp + M + 2 * F) + 0.00003 * Math.sin(Mp - M + 2 * F)
      - 0.00002 * Math.sin(Mp - M - 2 * F) - 0.00002 * Math.sin(3 * Mp + M)
      + 0.00002 * Math.sin(4 * Mp);
  } else {
    J += -0.62801 * Math.sin(Mp) + 0.17172 * E * Math.sin(M)
      - 0.01183 * E * Math.sin(Mp + M) + 0.00862 * Math.sin(2 * Mp)
      + 0.00804 * Math.sin(2 * F) + 0.00454 * E * Math.sin(Mp - M)
      + 0.00204 * E * E * Math.sin(2 * M) - 0.00180 * Math.sin(Mp - 2 * F)
      - 0.00070 * Math.sin(Mp + 2 * F) - 0.00040 * Math.sin(3 * Mp)
      - 0.00034 * E * Math.sin(2 * Mp - M) + 0.00032 * E * Math.sin(M + 2 * F)
      + 0.00032 * E * Math.sin(M - 2 * F) - 0.00028 * E * E * Math.sin(Mp + 2 * M)
      + 0.00027 * E * Math.sin(2 * Mp + M) - 0.00017 * Math.sin(Om)
      - 0.00005 * Math.sin(Mp - M - 2 * F) + 0.00004 * Math.sin(2 * Mp + 2 * F)
      - 0.00004 * Math.sin(Mp + M + 2 * F) + 0.00003 * Math.sin(Mp - 2 * M)
      + 0.00003 * Math.sin(4 * Mp) + 0.00002 * Math.sin(Mp - M + 2 * F)
      + 0.00002 * Math.sin(2 * Mp - 2 * F) - 0.00002 * Math.sin(Mp + M - 2 * F);
    const W = 0.00306 - 0.00038 * E * Math.cos(M) + 0.00026 * Math.cos(Mp)
      - 0.00002 * Math.cos(Mp - M) + 0.00002 * Math.cos(Mp + M) + 0.00002 * Math.cos(2 * F);
    J += p === 1 ? W : -W;
  }
  return J;
}

function jdeToUTC(jde: number): Date {
  const jd = jde + 0.5, Z = Math.floor(jd), Frac = jd - Z;
  let A = Z;
  if (Z >= 2299161) {
    const a = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + a - Math.floor(a / 4);
  }
  const B = A + 1524, C = Math.floor((B - 122.1) / 365.25), D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const day = B - D - Math.floor(30.6001 * E);
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;
  const ts = Math.round(Frac * 86400);
  return new Date(Date.UTC(year, month - 1, day, Math.floor(ts / 3600), Math.floor((ts % 3600) / 60), ts % 60));
}

export function buildPhaseEvents(pivot: Date): PhaseEvent[] {
  const yr = pivot.getUTCFullYear();
  const k0 = Math.round((yr - 2000 + pivot.getUTCMonth() / 12) * 12.3685);
  const out: PhaseEvent[] = [];
  const names = ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter'];
  const icons = ['🌑', '🌓', '🌕', '🌗'];
  const labels = ['NM', 'FQ', 'FM', 'LQ'];
  for (let k = k0 - 5; k <= k0 + 6; k++) {
    for (let p = 0; p < 4; p++) {
      out.push({
        utc: jdeToUTC(_jde(k, p)),
        phase: p,
        name: names[p],
        icon: icons[p],
        label: labels[p]
      });
    }
  }
  return out.sort((a, b) => a.utc.getTime() - b.utc.getTime());
}

function parseT(s: string): number | null {
  if (!s || s === 'N/A' || s === '--') return null;
  const up = s.toUpperCase(), has12 = /[AP]M/.test(up);
  const clean = s.replace(/[apm\s]/gi, '').split(':');
  let h = parseInt(clean[0] || '0'), m = parseInt(clean[1] || '0'), sec = parseFloat(clean[2] || '0');
  if (has12) {
    if (up.includes('PM') && h !== 12) h += 12;
    if (up.includes('AM') && h === 12) h = 0;
  }
  return h + m / 60 + sec / 3600;
}

export async function fetchSolarData(lat: number, lng: number, dateStr: string): Promise<SolarData | null> {
  try {
    const r = await fetch(`https://api.sunrisesunset.io/json?lat=${lat}&lng=${lng}&date=${dateStr}&time_format=24`);
    const j = await r.json();
    if (j.status !== 'OK') return null;
    const res = j.results;
    return {
      sunrise: parseT(res.sunrise),
      sunset: parseT(res.sunset),
      noon: parseT(res.solar_noon),
      moonrise: parseT(res.moonrise),
      moonset: parseT(res.moonset),
      utcOffset: parseFloat(res.utc_offset || '6')
    };
  } catch {
    return null;
  }
}

export function fallbackSolar(dayIndex: number, lat: number): SolarData {
  const tropical = Math.abs(lat) < 30;
  const ss = tropical ? 18.15 + dayIndex * 0.008 : 20.0 + dayIndex * 0.05;
  const sr = tropical ? 5.9 - dayIndex * 0.006 : 4.0 + dayIndex * 0.06;
  return { sunrise: sr, sunset: ss, noon: 12.0, moonrise: sr + dayIndex * 0.8, moonset: ss + dayIndex * 0.8, utcOffset: 6 };
}

export function localDate(utcDate: Date, offsetH: number): Date {
  const ms = utcDate.getTime() + offsetH * 3600000;
  const d = new Date(ms);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function fmtH(h: number | null): string {
  if (h === null || isNaN(h)) return '—';
  const n = ((h % 24) + 24) % 24, hh = Math.floor(n), mm = Math.round((n - hh) * 60);
  return `${hh % 12 || 12}:${mm.toString().padStart(2, '0')}${hh >= 12 ? 'pm' : 'am'}`;
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
