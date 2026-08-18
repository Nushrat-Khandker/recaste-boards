import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useCalendarNav as useNavigate } from '@/hooks/useCalendarNav';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getHijriMonthName } from '@/lib/hijri-utils';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { fetchSolarData, fallbackSolar, type SolarData } from '@/lib/moon-calculations';
import { format } from 'date-fns';
import CalendarEventDialog from '@/components/CalendarEventDialog';

import {
  PHASE_NAMES as PHASE_NAMES_4, PHASE_EMOJIS as PHASE_EMOJIS_4,
  getHijriForDate, getPhaseForDate,
} from '@/lib/hijri-calendar-engine';

const H_START = 14, H_RANGE = 26;
const TIME_CIRCLES = [15, 21, 3, 9];
const STRIP_W = 260;
const ML = 60, MR = 20;
const TOP_PAD = 10, BOT_PAD = 10;
const CHART_H = 780;
const TOTAL_H = TOP_PAD + CHART_H + BOT_PAD;
const TOTAL_W = ML + STRIP_W + MR;

function axH(h: number | null): number | null {
  if (h === null) return null;
  let a = ((h % 24) + 24) % 24;
  if (a < H_START) a += 24;
  return a;
}

function fmt24(h: number | null): string {
  if (h === null) return '';
  const n = ((h % 24) + 24) % 24;
  const hh = Math.floor(n), mm = Math.round((n - hh) * 60);
  return `${String(hh).padStart(2, '0')}${String(mm).padStart(2, '0')}`;
}

function toY(ah: number): number {
  return TOP_PAD + ((ah - H_START) / H_RANGE) * CHART_H;
}

function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function formatDateShort(date: Date): string {
  return format(date, 'd MMM yyyy');
}

function parseTime(t: string): number | null {
  if (!t) return null;
  const p = t.split(':');
  return parseInt(p[0]) + parseInt(p[1] || '0') / 60;
}

interface DayViewProps { date: Date; }

export const DayView: React.FC<DayViewProps> = ({ date }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const geo = useGeolocation();
  const svgRef = useRef<SVGSVGElement>(null);

  const [solar, setSolar] = useState<SolarData | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventDialogState, setEventDialogState] = useState<{ open: boolean; date: string; event?: any }>({
    open: false, date: '',
  });

  const hijri = getHijriForDate(date);
  const phase = getPhaseForDate(date);
  const weekday = date.getDay();
  const dateKey = toDateKey(date);
  const isJummah = weekday === 5;
  const isSabt = weekday === 6;

  const fetchEvents = useCallback(async () => {
    try {
      const { data } = await supabase.from('calendar_events').select('*').eq('date', dateKey);
      if (data) setCalendarEvents(data);
    } catch { /* silent */ }
  }, [dateKey]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    if (geo.loading) return;
    const lat = geo.latitude || 23.8103;
    const lng = geo.longitude || 90.4125;
    setLoading(true);
    fetchSolarData(lat, lng, dateKey).then(data => {
      setSolar(data || fallbackSolar(0, lat));
      setLoading(false);
    });
  }, [dateKey, geo.latitude, geo.longitude, geo.loading]);

  const render = useCallback(() => {
    const svg = svgRef.current;
    if (!svg || !solar) return;

    const sx = ML, sw = STRIP_W;
    let o = '';

    o += `<rect width="${TOTAL_W}" height="${TOTAL_H}" fill="hsl(36,36%,92%)" rx="12"/>`;

    if (isJummah) o += `<rect x="${sx}" y="${TOP_PAD}" width="${sw}" height="${CHART_H}" fill="hsla(152,50%,40%,0.07)"/>`;
    else if (isSabt) o += `<rect x="${sx}" y="${TOP_PAD}" width="${sw}" height="${CHART_H}" fill="hsla(0,50%,45%,0.07)"/>`;

    const ss = axH(solar.sunset), sr = axH(solar.sunrise);
    if (ss !== null && sr !== null) {
      const y1 = toY(ss), y2 = toY(sr);
      o += `<rect x="${sx}" y="${y1.toFixed(1)}" width="${sw}" height="${(y2 - y1).toFixed(1)}" fill="rgba(8,5,35,0.08)"/>`;
    }

    if (ss !== null) {
      const y = toY(ss);
      o += `<line x1="${sx}" y1="${y.toFixed(1)}" x2="${sx + sw}" y2="${y.toFixed(1)}" stroke="hsl(0,65%,49%)" stroke-width="2.5"/>`;
      o += `<text x="${sx - 8}" y="${(y + 5).toFixed(1)}" text-anchor="end" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="hsl(0,65%,49%)">${fmt24(solar.sunset)}</text>`;
    }

    if (sr !== null) {
      const y = toY(sr);
      o += `<line x1="${sx}" y1="${y.toFixed(1)}" x2="${sx + sw}" y2="${y.toFixed(1)}" stroke="hsl(30,80%,50%)" stroke-width="2.5"/>`;
      o += `<text x="${sx - 8}" y="${(y + 5).toFixed(1)}" text-anchor="end" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="hsl(30,80%,50%)">${fmt24(solar.sunrise)}</text>`;
    }

    if (solar.noon !== null) {
      const nah = solar.noon < H_START ? solar.noon + 24 : solar.noon;
      const y = toY(nah);
      o += `<line x1="${sx}" y1="${y.toFixed(1)}" x2="${sx + sw}" y2="${y.toFixed(1)}" stroke="hsl(45,70%,49%)" stroke-width="2" stroke-dasharray="7 4"/>`;
      o += `<text x="${sx - 8}" y="${(y + 5).toFixed(1)}" text-anchor="end" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="hsl(45,70%,49%)">${fmt24(solar.noon)}</text>`;
    }

    TIME_CIRCLES.forEach(clk => {
      const ah = clk < H_START ? clk + 24 : clk;
      if (ah < H_START || ah > H_START + H_RANGE) return;
      const cy = toY(ah);
      o += `<text x="${sx + sw + 8}" y="${(cy + 5).toFixed(1)}" text-anchor="start" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="hsl(36,20%,42%)">${String(clk).padStart(2, '0')}</text>`;
    });

    if (ss !== null) {
      const y = toY(ss);
      const mid = sx + sw / 2;
      o += `<line x1="${mid}" y1="${(y - 10).toFixed(1)}" x2="${mid}" y2="${(y + 10).toFixed(1)}" stroke="hsl(0,65%,49%)" stroke-width="3"/>`;
    }

    // Calendar events
    calendarEvents.forEach((evt, ei) => {
      let yStart: number, blockH: number;
      const startH = evt.start_time ? parseTime(evt.start_time) : null;
      const endH = evt.end_time ? parseTime(evt.end_time) : null;

      if (startH !== null) {
        const ah = startH < H_START ? startH + 24 : startH;
        yStart = toY(ah);
        if (endH !== null) {
          const ahE = endH < H_START ? endH + 24 : endH;
          blockH = toY(ahE) - yStart;
        } else {
          blockH = (1 / H_RANGE) * CHART_H;
        }
      } else {
        yStart = TOTAL_H - BOT_PAD - 40 - ei * 38;
        blockH = 32;
      }

      blockH = Math.max(blockH, 26);
      const ex = sx + 10, ew = sw - 20;
      o += `<rect x="${ex}" y="${yStart.toFixed(1)}" width="${ew}" height="${blockH.toFixed(1)}" rx="6" fill="${evt.color}" fill-opacity="0.9" class="evt-block" data-id="${evt.id}" style="cursor:pointer"/>`;
      o += `<text x="${ex + 8}" y="${(yStart + Math.min(blockH / 2 + 5, 18)).toFixed(1)}" font-family="system-ui,sans-serif" font-size="13" font-weight="600" fill="white" class="pointer-events-none">${evt.title}</text>`;
      if (startH !== null) {
        o += `<text x="${ex + ew - 6}" y="${(yStart + Math.min(blockH / 2 + 5, 18)).toFixed(1)}" text-anchor="end" font-family="system-ui,sans-serif" font-size="11" fill="rgba(255,255,255,0.8)" class="pointer-events-none">${evt.start_time || ''}</text>`;
      }
    });

    // Clickable strip overlay for adding events
    o += `<rect x="${sx}" y="${TOP_PAD}" width="${sw}" height="${CHART_H}" fill="transparent" class="strip-click" style="cursor:pointer"/>`;

    o += `<rect x="${sx}" y="${TOP_PAD}" width="${sw}" height="${CHART_H}" fill="none" stroke="hsl(36,25%,68%)" stroke-width="1" rx="4"/>`;
    svg.innerHTML = o;

    // Click handlers
    const handleClick = (e: MouseEvent) => {
      const target = e.target as SVGElement;
      if (target.classList.contains('evt-block')) {
        const eventId = target.getAttribute('data-id');
        const evt = calendarEvents.find(ev => ev.id === eventId);
        if (evt && user && evt.user_id === user.id) {
          setEventDialogState({ open: true, date: dateKey, event: evt });
        }
      } else if (target.classList.contains('strip-click')) {
        setEventDialogState({ open: true, date: dateKey });
      }
    };

    svg.addEventListener('click', handleClick);
    return () => svg.removeEventListener('click', handleClick);
  }, [solar, calendarEvents, isJummah, isSabt, dateKey, user]);

  useEffect(() => {
    const cleanup = render();
    return cleanup;
  }, [render]);

  const prevDate = new Date(date);
  prevDate.setDate(prevDate.getDate() - 1);
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);

  const todayKey = toDateKey(new Date());
  const isToday = dateKey === todayKey;

  return (
    <div className="w-full max-w-2xl mx-auto p-2 sm:p-6">
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <Button variant="outline" size="sm" onClick={() => navigate(`/day?date=${toDateKey(prevDate)}`)} className="text-xs sm:text-sm px-2 sm:px-3">
          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <div className="text-center leading-tight">
          {(() => {
            const dayLabel = isJummah ? 'Jumuah' : isSabt ? 'As-Sabt' : `Day ${weekday + 1}`;
            const labelColor = isJummah ? 'text-green-700 dark:text-green-300' : isSabt ? 'text-red-700 dark:text-red-300' : '';
            return (
              <>
                <h2 className={cn("text-base sm:text-2xl font-bold", labelColor)}>
                  {phase.phaseEmoji} {dayLabel}
                  {isToday && <span className="ml-2 text-xs sm:text-sm font-medium text-primary">(Today)</span>}
                </h2>
                <p className="text-sm font-semibold text-foreground">{phase.dayInPhase} / {phase.phaseDuration}</p>
                <p className="text-xs text-muted-foreground">{getHijriMonthName(hijri.month)} {hijri.year}</p>
              </>
            );
          })()}
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(`/day?date=${toDateKey(nextDate)}`)} className="text-xs sm:text-sm px-2 sm:px-3">
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground mb-3">
        <button onClick={() => navigate(`/year?year=${hijri.year}`)} className="hover:text-primary transition-colors">{hijri.year} AH</button>
        <span>›</span>
        <button onClick={() => navigate(`/quarter?q=${Math.ceil(hijri.month / 3)}&year=${hijri.year}`)} className="hover:text-primary transition-colors">Q{Math.ceil(hijri.month / 3)}</button>
        <span>›</span>
        <button onClick={() => navigate(`/?month=${hijri.month}&year=${hijri.year}`)} className="hover:text-primary transition-colors">{getHijriMonthName(hijri.month)}</button>
        <span>›</span>
        <button onClick={() => navigate('/moon-phases')} className="hover:text-primary transition-colors">{phase.phase}</button>
        <span>›</span>
        <span className={cn(
          'font-medium',
          isJummah && 'text-green-700 dark:text-green-300',
          isSabt && 'text-red-700 dark:text-red-300',
          !isJummah && !isSabt && 'text-foreground'
        )}>
          Day {hijri.day}{isJummah ? ` · Jumuah · ${formatDateShort(date)}` : isSabt ? ' · As-Sabt' : ''}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading…</div>
      ) : (
        <div className="flex justify-center">
            <svg ref={svgRef} viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`} className="w-full max-w-xs sm:max-w-sm" style={{ height: 'auto' }} />
        </div>
      )}

      <div className="text-center mt-2 text-xs text-muted-foreground font-semibold">
        {hijri.year}/{hijri.month}
      </div>

      {/* Calendar Event Dialog */}
      <CalendarEventDialog
        isOpen={eventDialogState.open}
        onClose={() => setEventDialogState({ open: false, date: '' })}
        event={eventDialogState.event}
        date={eventDialogState.date}
        onSaved={fetchEvents}
      />
    </div>
  );
};
