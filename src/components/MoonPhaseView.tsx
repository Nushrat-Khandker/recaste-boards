import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useCalendarNav as useNavigate } from '@/hooks/useCalendarNav';
import { ChevronLeft, ChevronRight, Loader2, MapPin, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import CalendarEventDialog from '@/components/CalendarEventDialog';
import {
  fetchSolarData, fallbackSolar, fmtH,
  type DayData
} from '@/lib/moon-calculations';
import { format } from 'date-fns';
import { getHijriMonthName } from '@/lib/hijri-utils';

import {
  PHASE_NAMES, PHASE_EMOJIS as PHASE_ICONS,
  getAllNewMoons, getHijriFromNewMoon, findLunationForDate,
  getPhaseBoundariesForLunation, type LunationData,
} from '@/lib/hijri-calendar-engine';

interface PhaseBlock {
  name: string;
  icon: string;
  phaseIndex: number;
  startDate: Date;
  endDate: Date;
  newMoonDate: Date;
  hijriYear: number;
  hijriMonth: number;
}

const MS_PER_DAY = 86400000;

/** Build all phase blocks from lookup-table lunations */
function buildAllPhaseBlocks(): PhaseBlock[] {
  const allMoons = getAllNewMoons();
  const blocks: PhaseBlock[] = [];

  for (const nmDate of allMoons) {
    const lun = findLunationForDate(nmDate);
    const boundaries = [lun.nm, lun.fq, lun.fm, lun.lq, lun.nextNm];

    for (let p = 0; p < 4; p++) {
      blocks.push({
        name: PHASE_NAMES[p],
        icon: PHASE_ICONS[p],
        phaseIndex: p,
        startDate: boundaries[p],
        endDate: boundaries[p + 1],
        newMoonDate: lun.nm,
        hijriYear: lun.hijriYear,
        hijriMonth: lun.hijriMonth,
      });
    }
  }

  return blocks.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

function getHijriForDate(date: Date): { year: number; month: number } {
  const lun = findLunationForDate(date);
  return { year: lun.hijriYear, month: lun.hijriMonth };
}

const H_START = 14, H_RANGE = 26;
const TOP_H = 28, BOTTOM_H = 4, ROW_H = 380;
const LEFT_AXIS_W = 36; // width for Y-axis hour labels

const WD_LABELS = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Jumuah', 'As-sabt'];

const CITIES = [
  { label: 'Dhaka', value: '23.8103,90.4125' },
  { label: 'Mecca', value: '21.3891,39.8579' },
  { label: 'Riyadh', value: '24.6877,46.7219' },
  { label: 'Dubai', value: '25.2048,55.2708' },
  { label: 'Cairo', value: '30.0444,31.2357' },
  { label: 'London', value: '51.5074,-0.1278' },
  { label: 'Edinburgh', value: '55.9533,-3.1883' },
  { label: 'New York', value: '40.7128,-74.0060' },
  { label: 'Kuala Lumpur', value: '3.1390,101.6869' },
  { label: 'Singapore', value: '1.3521,103.8198' },
];

function axH(h: number | null): number | null {
  if (h === null) return null;
  let a = ((h % 24) + 24) % 24;
  if (a < H_START) a += 24;
  return a;
}

function toY(ah: number, rowH: number): number {
  return TOP_H + ((ah - H_START) / H_RANGE) * rowH;
}

function pathStr(pts: number[][]): string {
  return pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
}

const MoonPhaseView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const geo = useGeolocation();

  const [city, setCity] = useState('');
  const [cityLabel, setCityLabel] = useState('Detecting...');
  const [phaseBlocks, setPhaseBlocks] = useState<PhaseBlock[]>([]);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [days, setDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [utcOffset, setUtcOffset] = useState(6);
  const [zoom, setZoom] = useState(1);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [eventDialogState, setEventDialogState] = useState<{ open: boolean; date: string; event?: any }>({
    open: false, date: '',
  });

  // GPS location detection
  useEffect(() => {
    if (geo.latitude && geo.longitude) {
      const coordStr = `${geo.latitude.toFixed(4)},${geo.longitude.toFixed(4)}`;
      let nearest = CITIES[0];
      let minDist = Infinity;
      CITIES.forEach(c => {
        const [lat, lng] = c.value.split(',').map(Number);
        const dist = Math.abs(lat - geo.latitude!) + Math.abs(lng - geo.longitude!);
        if (dist < minDist) { minDist = dist; nearest = c; }
      });
      if (minDist < 2) {
        setCity(nearest.value);
        setCityLabel(nearest.label);
      } else {
        setCity(coordStr);
        setCityLabel('Your Location');
      }
    } else if (!geo.loading) {
      setCity(CITIES[0].value);
      setCityLabel(CITIES[0].label);
    }
  }, [geo.latitude, geo.longitude, geo.loading]);

  // Build phase blocks from the same new-moon anchor as HijriCalendar
  useEffect(() => {
    const blocks = buildAllPhaseBlocks();
    setPhaseBlocks(blocks);

    // Find current phase block
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let idx = 0;
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].startDate <= now && blocks[i].endDate > now) {
        idx = i;
        break;
      }
    }
    setPhaseIdx(idx);
  }, []);

  useEffect(() => {
    fetchCalendarEvents();
  }, []);

  const fetchCalendarEvents = async () => {
    try {
      const { data } = await supabase.from('calendar_events').select('*').order('date');
      if (data) setCalendarEvents(data);
    } catch { /* silent */ }
  };

  // Load solar data for the current phase block's days
  useEffect(() => {
    if (phaseBlocks.length === 0 || !city) return;
    const block = phaseBlocks[phaseIdx];
    if (!block) return;

    const msPerDay = 86400000;
    const dayDates: Date[] = [];
    const cur = new Date(block.startDate);
    while (cur < block.endDate) {
      dayDates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    if (!dayDates.length) dayDates.push(new Date(block.startDate));

    const [lat, lng] = city.split(',').map(Number);
    setLoading(true);

    Promise.all(dayDates.map((d) => {
      const ds = format(d, 'yyyy-MM-dd');
      return fetchSolarData(lat, lng, ds).then(r => {
        if (r) setUtcOffset(r.utcOffset);
        return r;
      });
    })).then(results => {
      const nmTime = block.newMoonDate.getTime();
      const daysData: DayData[] = dayDates.map((date, i) => {
        const moonAge = (date.getTime() - nmTime) / msPerDay;
        return { date, moonAge, s: results[i] || fallbackSolar(i, lat) };
      });
      setDays(daysData);
      setLoading(false);
    });
  }, [phaseBlocks, phaseIdx, city]);

  const getEventsForDate = (gregorianDate: Date) => {
    const dateKey = format(gregorianDate, 'yyyy-MM-dd');
    return calendarEvents.filter(e => e.date === dateKey);
  };

  const currentBlock = phaseBlocks[phaseIdx];

  const render = useCallback(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container || days.length === 0) return;

    const N = days.length;
    const containerWidth = container.clientWidth;
    const chartAreaW = Math.floor((containerWidth - LEFT_AXIS_W) * zoom / N) * N;
    const COL_W = chartAreaW / N;
    const W = LEFT_AXIS_W + chartAreaW;
    const scaledRowH = ROW_H * zoom;
    const H = TOP_H + scaledRowH + BOTTOM_H;
    svg.setAttribute('width', String(W));
    svg.setAttribute('height', String(H));
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const AX = LEFT_AXIS_W; // x-offset for chart area
    let o = '';

    // Background
    o += `<rect width="${W}" height="${H}" fill="hsl(36,36%,92%)"/>`;

    // Left Y-axis — 4 key hour labels
    for (const targetHour of [15, 21, 3, 9]) {
      const hr = ((targetHour - H_START) % 24 + 24) % 24;
      if (hr > H_RANGE) continue;
      const y = TOP_H + (hr / H_RANGE) * scaledRowH;
      const hourVal = ((H_START + hr) % 24 + 24) % 24;
      o += `<text x="${AX - 4}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-family="system-ui,sans-serif" font-size="10" font-weight="600" fill="hsl(36,20%,35%)">${String(hourVal).padStart(2, '0')}</text>`;
    }

    // Graph-paper grid — fine lines every hour, bold every 3 hours
    for (let hr = 0; hr <= H_RANGE; hr++) {
      const y = TOP_H + (hr / H_RANGE) * scaledRowH;
      const isMajor = hr % 3 === 0;
      o += `<line x1="${AX}" y1="${y.toFixed(1)}" x2="${W}" y2="${y.toFixed(1)}" stroke="hsl(36,25%,68%)" stroke-width="${isMajor ? '1' : '0.4'}" stroke-opacity="${isMajor ? '0.7' : '0.35'}"/>`;
    }
    // Vertical sub-grid
    for (let i = 0; i < N; i++) {
      for (let sub = 1; sub <= 3; sub++) {
        const x = AX + i * COL_W + (sub / 4) * COL_W;
        o += `<line x1="${x}" y1="${TOP_H}" x2="${x}" y2="${TOP_H + scaledRowH}" stroke="hsl(36,25%,68%)" stroke-width="0.4" stroke-opacity="0.3"/>`;
      }
    }

    // Today highlight + Jumuah & As-sabt tinted columns
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    days.forEach((d, i) => {
      const wd = d.date.getDay();
      const x = AX + i * COL_W;
      const dateKey = format(d.date, 'yyyy-MM-dd');
      if (dateKey === todayStr) {
        o += `<rect x="${x}" y="0" width="${COL_W}" height="${H}" fill="hsla(36,70%,50%,0.12)"/>`;
        o += `<rect x="${x + 1}" y="${TOP_H}" width="${COL_W - 2}" height="${scaledRowH}" fill="none" stroke="hsl(36,80%,45%)" stroke-width="2" stroke-dasharray="4 2" rx="2"/>`;
      }
      if (wd === 5) {
        o += `<rect x="${x}" y="${TOP_H}" width="${COL_W}" height="${scaledRowH}" fill="hsla(152,50%,40%,0.07)"/>`;
      } else if (wd === 6) {
        o += `<rect x="${x}" y="${TOP_H}" width="${COL_W}" height="${scaledRowH}" fill="hsla(0,50%,45%,0.07)"/>`;
      }
    });

    // Column grid separators
    for (let i = 1; i < N; i++) {
      const x = AX + i * COL_W;
      o += `<line x1="${x}" y1="${TOP_H}" x2="${x}" y2="${TOP_H + scaledRowH}" stroke="hsl(36,25%,78%)" stroke-width="0.5"/>`;
    }

    // Night bands
    days.forEach((d, i) => {
      if (!d.s) return;
      const x = AX + i * COL_W;
      const ss = axH(d.s.sunset), sr = axH(d.s.sunrise);
      if (ss && sr) {
        const y1 = toY(ss, scaledRowH), y2 = toY(sr, scaledRowH);
        o += `<rect x="${x}" y="${y1.toFixed(1)}" width="${COL_W}" height="${(y2 - y1).toFixed(1)}" fill="rgba(8,5,35,0.065)"/>`;
      }
    });

    // Polyline data
    const ssP: number[][] = [], srP: number[][] = [], nP: number[][] = [];
    days.forEach((d, i) => {
      if (!d.s) return;
      const cx = AX + i * COL_W + COL_W / 2, s = d.s;
      if (s.sunset !== null) ssP.push([cx, toY(axH(s.sunset)!, scaledRowH)]);
      if (s.sunrise !== null) srP.push([cx, toY(axH(s.sunrise)!, scaledRowH)]);
      if (s.noon !== null) nP.push([cx, toY(s.noon < H_START ? s.noon + 24 : s.noon + 24, scaledRowH)]);
    });

    // Sunset day-start ticks
    days.forEach((d, i) => {
      if (!d.s || d.s.sunset === null) return;
      const cx = AX + i * COL_W + COL_W / 2, sy = toY(axH(d.s.sunset)!, scaledRowH);
      o += `<line x1="${cx}" y1="${(sy - 7).toFixed(1)}" x2="${cx}" y2="${(sy + 7).toFixed(1)}" stroke="hsl(0,65%,49%)" stroke-width="2.5"/>`;
    });

    // Lines
    if (ssP.length > 1) o += `<path d="${pathStr(ssP)}" fill="none" stroke="hsl(0,65%,49%)" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (srP.length > 1) o += `<path d="${pathStr(srP)}" fill="none" stroke="hsl(30,80%,50%)" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (nP.length > 1) o += `<path d="${pathStr(nP)}" fill="none" stroke="hsl(45,70%,49%)" stroke-width="2.5" stroke-dasharray="7 4" stroke-linejoin="round" stroke-linecap="round"/>`;

    // Next phase icon at end of chart
    if (currentBlock && N > 0) {
      const nextPIdx = (currentBlock.phaseIndex + 1) % 4;
      const nextIcon = PHASE_ICONS[nextPIdx];
      const lx = AX + (N - 1) * COL_W + COL_W * 0.76;
      const cy = toY(H_START + H_RANGE * 0.15, scaledRowH);
      o += `<text x="${lx.toFixed(1)}" y="${(cy + 8).toFixed(1)}" text-anchor="middle" font-size="22">${nextIcon}</text>`;
    }

    // Calendar events on the chart
    days.forEach((d, i) => {
      const evts = getEventsForDate(d.date);
      evts.forEach((evt, ei) => {
        const x = AX + i * COL_W + 2;
        const w = COL_W - 4;
        let yStart: number, blockH: number;
        const startH = evt.start_time ? parseTimeStr(evt.start_time) : null;
        const endH = evt.end_time ? parseTimeStr(evt.end_time) : null;

        if (startH !== null) {
          const ah = startH < H_START ? startH + 24 : startH;
          yStart = toY(ah, scaledRowH);
          if (endH !== null) {
            const ahE = endH < H_START ? endH + 24 : endH;
            blockH = toY(ahE, scaledRowH) - yStart;
          } else {
            blockH = (1 / H_RANGE) * scaledRowH;
          }
        } else {
          // All-day events: small block near top
          yStart = TOP_H + 4 + ei * 18;
          blockH = 16;
        }

        blockH = Math.max(blockH, 14);
        o += `<rect x="${x}" y="${yStart.toFixed(1)}" width="${w}" height="${blockH.toFixed(1)}" rx="3" fill="${evt.color}" fill-opacity="0.85" class="event-block" data-date="${format(d.date, 'yyyy-MM-dd')}" data-event-id="${evt.id}" style="cursor:pointer"/>`;
        o += `<text x="${x + 4}" y="${(yStart + Math.min(blockH / 2 + 4, 12)).toFixed(1)}" font-family="system-ui,sans-serif" font-size="10" font-weight="600" fill="white" class="pointer-events-none">${evt.title.slice(0, 10)}</text>`;
      });
    });

    // Day header labels — compact on mobile
    days.forEach((d, i) => {
      const cx = AX + i * COL_W + COL_W / 2, wd = d.date.getDay();
      const col = wd === 5 ? 'hsl(152,60%,32%)' : wd === 6 ? 'hsl(0,60%,45%)' : 'hsl(36,20%,10%)';
      const wt = (wd === 5 || wd === 6) ? '700' : '500';
      const isSmall = COL_W < 70;
      let label: string;
      if (isSmall) {
        // Short labels for narrow columns
        label = wd === 5 ? 'Jum' : wd === 6 ? 'Sab' : `D${wd + 1}`;
      } else {
        label = WD_LABELS[wd];
        if (wd === 5) {
          const dLocal = d.date.getDate();
          const mLocal = d.date.toLocaleString('en', { month: 'short' });
          label += ` ${dLocal} ${mLocal}`;
        }
      }
      const fontSize = isSmall ? '9' : '12';
      o += `<text x="${cx}" y="${TOP_H - 6}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${fontSize}" font-weight="${wt}" fill="${col}">${label}</text>`;
    });

    // Border
    o += `<rect x="${AX}" y="${TOP_H}" width="${chartAreaW}" height="${scaledRowH}" fill="none" stroke="hsl(36,25%,68%)" stroke-width="1"/>`;

    // Clickable day column overlays
    days.forEach((d, i) => {
      const x = AX + i * COL_W;
      const dateKey = format(d.date, 'yyyy-MM-dd');
      o += `<rect x="${x}" y="${TOP_H}" width="${COL_W}" height="${scaledRowH}" fill="transparent" class="day-col" data-date="${dateKey}" style="cursor:pointer"/>`;
    });

    svg.innerHTML = o;

    // Click handler
    const handleClick = (e: MouseEvent) => {
      const target = e.target as SVGElement;
      if (target.classList.contains('day-col')) {
        const date = target.getAttribute('data-date');
        if (date) navigate(`/day?date=${date}`);
      }
      if (target.classList.contains('event-block')) {
        const date = target.getAttribute('data-date');
        const eventId = target.getAttribute('data-event-id');
        const evt = calendarEvents.find(e => e.id === eventId);
        if (date && evt && user && evt.user_id === user.id) {
          setEventDialogState({ open: true, date, event: evt });
        }
      }
    };

    // Tooltip
    const handleMouseMove = (e: MouseEvent) => {
      const rect = svg.getBoundingClientRect();
      const i = Math.floor((e.clientX - rect.left - LEFT_AXIS_W) / COL_W);
      const tt = tooltipRef.current;
      if (!tt) return;
      if (i < 0 || i >= N || !days[i].s) { tt.style.opacity = '0'; return; }
      const d = days[i], s = d.s;
      tt.innerHTML = `<strong>${WD_LABELS[d.date.getDay()]}</strong><br>🌇 Sunset: ${fmtH(s.sunset)}<br>🌅 Sunrise: ${fmtH(s.sunrise)}<br>☀️ Noon: ${fmtH(s.noon)}<br>🌙 Age: ~${(d.moonAge || 0).toFixed(1)}d`;
      tt.style.opacity = '1';
      tt.style.left = (e.clientX + 14) + 'px';
      tt.style.top = (e.clientY - 65) + 'px';
    };
    const handleMouseLeave = () => {
      if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
    };

    svg.addEventListener('click', handleClick);
    svg.addEventListener('mousemove', handleMouseMove);
    svg.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      svg.removeEventListener('click', handleClick);
      svg.removeEventListener('mousemove', handleMouseMove);
      svg.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [days, currentBlock, utcOffset, calendarEvents, user, zoom]);

  useEffect(() => {
    const cleanup = render();
    return cleanup;
  }, [render]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => render());
    observer.observe(container);
    return () => observer.disconnect();
  }, [render]);

  // Pinch-to-zoom touch support
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let initialDistance = 0;
    let initialZoom = 1;

    const getDistance = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        initialDistance = getDistance(e.touches);
        initialZoom = zoom;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = getDistance(e.touches);
        const scale = currentDistance / initialDistance;
        setZoom(Math.min(3, Math.max(0.5, initialZoom * scale)));
      }
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
    };
  }, [zoom]);

  const hijriInfo = currentBlock ? { year: currentBlock.hijriYear, month: currentBlock.hijriMonth } : (days.length > 0 ? getHijriForDate(days[0].date) : null);
  const hijriMonthName = hijriInfo ? getHijriMonthName(hijriInfo.month) : '';
  const hijriYear = hijriInfo ? hijriInfo.year : '';

  return (
    <div className="w-full max-w-6xl mx-auto p-2 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-1 sm:mb-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPhaseIdx(i => Math.max(0, i - 1))}
          disabled={phaseIdx <= 0}
          className="text-xs sm:text-sm px-2 sm:px-3"
        >
          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <div className="text-center">
          <h2 className="text-base sm:text-2xl font-bold">
            {currentBlock && (
              <>{currentBlock.icon} {currentBlock.name}</>
            )}
          </h2>
          {hijriInfo && (
            <p className="text-sm sm:text-base font-semibold text-primary">
              {hijriMonthName} {hijriYear} AH
            </p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setPhaseIdx(i => Math.min(phaseBlocks.length - 1, i + 1))}
          disabled={phaseIdx >= phaseBlocks.length - 1}
          className="text-xs sm:text-sm px-2 sm:px-3"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mb-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-5 h-[3px] rounded-sm bg-[hsl(0,65%,49%)]" />
            Sunset
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-[3px] rounded-sm bg-[hsl(30,80%,50%)]" />
            Sunrise
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-0 border-t-2 border-dashed border-[hsl(45,70%,49%)]" />
            Noon
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs w-8 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span className="text-xs">{cityLabel}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="w-full rounded-lg border border-border overflow-x-auto" style={{ background: 'hsl(36,36%,92%)' }}>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : (
          <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" />
        )}
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed pointer-events-none opacity-0 transition-opacity z-50 rounded-lg border border-border bg-card p-2 text-sm shadow-lg"
        style={{ maxWidth: 200, lineHeight: 1.7 }}
      />

      {/* Calendar Event Dialog */}
      <CalendarEventDialog
        isOpen={eventDialogState.open}
        onClose={() => setEventDialogState({ open: false, date: '' })}
        event={eventDialogState.event}
        date={eventDialogState.date}
        onSaved={fetchCalendarEvents}
      />
    </div>
  );
};

export default MoonPhaseView;

function parseTimeStr(t: string): number | null {
  if (!t) return null;
  const p = t.split(':');
  return parseInt(p[0]) + parseInt(p[1] || '0') / 60;
}
