import React, { useEffect, useRef, useState } from 'react';
import { useCalendarNav as useNavigate } from '@/hooks/useCalendarNav';
import { ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useCalendarNow } from '@/hooks/useCalendarNow';
import CalendarEventDialog from '@/components/CalendarEventDialog';
import CalendarLocationControl from '@/components/CalendarLocationControl';
import {
  displayDateInZone, getLocalPhaseBoundaries
} from '@/lib/moon-calculations';
import { calculateSunsetDay, type SunsetDay } from '@/lib/sunset-day';
import SunsetDayChart from '@/components/SunsetDayChart';
import PhasePrintSheet from '@/components/PhasePrintSheet';
import { buildMonthPhaseSheets, type PhasePrintSheetData } from '@/lib/phase-print';
import { getHijriMonthName } from '@/lib/hijri-utils';

import {
  findLunationForDate,
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
  startInstant: Date;
  labelBoundary: Date;
  endBoundary: Date;
}

/** Build all phase blocks from lookup-table lunations */
function buildAllPhaseBlocks(latitude: number, longitude: number, timeZone: string): PhaseBlock[] {
  const events = getLocalPhaseBoundaries(latitude, longitude);
  const blocks: PhaseBlock[] = [];
  for (let i = 0; i < events.length - 1; i++) {
    const event = events[i];
    const boundary = event.labelBoundary, endBoundary = events[i + 1].labelBoundary;
    if (!boundary || !endBoundary || boundary >= endBoundary) continue;
    blocks.push({
      name: event.name, icon: event.icon, phaseIndex: event.phase,
      startDate: displayDateInZone(boundary, timeZone),
      endDate: displayDateInZone(endBoundary, timeZone),
      labelBoundary: boundary, endBoundary,
      startInstant: event.utc, newMoonDate: event.newMoonUtc,
      hijriYear: event.hijriYear, hijriMonth: event.hijriMonth,
    });
  }

  return blocks.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

function getHijriForDate(date: Date): { year: number; month: number } {
  const lun = findLunationForDate(date);
  return { year: lun.hijriYear, month: lun.hijriMonth };
}

const MoonPhaseView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const geo = useGeolocation();
  const now = useCalendarNow();
  const followCurrentPhase = useRef(true);

  const [phaseBlocks, setPhaseBlocks] = useState<PhaseBlock[]>([]);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [days, setDays] = useState<SunsetDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculationError, setCalculationError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [eventDialogState, setEventDialogState] = useState<{ open: boolean; date: string; event?: any }>({
    open: false, date: '',
  });
  // A print request keeps the chosen scope and sheets in the DOM until the dialog closes.
  const [printRequest, setPrintRequest] = useState<{ scope: 'phase' | 'month'; sheets: PhasePrintSheetData[]; id: number } | null>(null);

  // Localize exact reference instants without shifting existing task dates.
  useEffect(() => {
    const blocks = buildAllPhaseBlocks(geo.latitude, geo.longitude, geo.timeZone);
    setPhaseBlocks(blocks);
    followCurrentPhase.current = true;

    // Find current phase block
    const now = new Date();
    let idx = 0;
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].labelBoundary <= now && blocks[i].endBoundary > now) {
        idx = i;
        break;
      }
    }
    setPhaseIdx(idx);
  }, [geo.latitude, geo.longitude, geo.timeZone]);

  useEffect(() => {
    if (!followCurrentPhase.current) return;
    const idx = phaseBlocks.findIndex(block => block.labelBoundary <= now && now < block.endBoundary);
    if (idx >= 0) setPhaseIdx(idx);
  }, [now, phaseBlocks]);

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
    if (phaseBlocks.length === 0 || geo.loading) return;
    const block = phaseBlocks[phaseIdx];
    if (!block) return;

    const dayDates: Date[] = [];
    const cur = new Date(block.startDate);
    while (cur < block.endDate) {
      dayDates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    if (!dayDates.length) dayDates.push(new Date(block.startDate));

    let cancelled = false;
    setLoading(true);
    setCalculationError(false);

    Promise.resolve(dayDates.map(date => calculateSunsetDay(date, geo.latitude, geo.longitude))).then(results => {
      if (cancelled) return;
      const calculated = results.filter((day): day is SunsetDay => day !== null);
      setCalculationError(calculated.length !== dayDates.length);
      setDays(calculated);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [phaseBlocks, phaseIdx, geo.latitude, geo.longitude, geo.loading]);

  const currentBlock = phaseBlocks[phaseIdx];

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

  const printScope = printRequest?.scope ?? 'phase';
  const monthSheets = printRequest?.sheets ?? [];

  const requestPrint = (scope: 'phase' | 'month') => {
    const sheets = scope === 'month' && currentBlock
      ? buildMonthPhaseSheets(phaseBlocks, currentBlock, geo.latitude, geo.longitude)
      : [];
    setPrintRequest({ scope, sheets, id: Date.now() });
  };

  useEffect(() => {
    if (!printRequest) return;
    const timer = window.setTimeout(() => window.print(), 80);
    return () => window.clearTimeout(timer);
  }, [printRequest]);

  useEffect(() => {
    const reset = () => setPrintRequest(null);
    window.addEventListener('afterprint', reset);
    return () => window.removeEventListener('afterprint', reset);
  }, []);

  return (
    <div data-calendar-print="phase" data-print-scope={printScope} className="w-full max-w-6xl mx-auto p-2 sm:p-6">
      {/* Header */}
      <div data-print-hide={printScope === 'month' || undefined} className="flex items-center justify-between mb-1 sm:mb-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => { followCurrentPhase.current = false; setPhaseIdx(i => Math.max(0, i - 1)); }}
          disabled={phaseIdx <= 0}
          className="text-xs sm:text-sm px-2 sm:px-3"
        >
          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <div className="text-center">
          <h2 data-print-hide className="text-base sm:text-2xl font-bold">
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
          onClick={() => { followCurrentPhase.current = false; setPhaseIdx(i => Math.min(phaseBlocks.length - 1, i + 1)); }}
          disabled={phaseIdx >= phaseBlocks.length - 1}
          className="text-xs sm:text-sm px-2 sm:px-3"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>

      <div data-print-hide><CalendarLocationControl location={geo} /></div>
      {currentBlock && <p data-print-hide className="text-center text-xs text-muted-foreground mb-3">
        Phase event: {new Intl.DateTimeFormat('en-GB', { timeZone: geo.timeZone, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(currentBlock.startInstant)}
        {' · '}Sunset boundary: {new Intl.DateTimeFormat('en-GB', { timeZone: geo.timeZone, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(currentBlock.labelBoundary)}
      </p>}

      {/* Legend */}
      <div data-print-hide className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-5 h-[3px] rounded-sm bg-[hsl(var(--chart-sunset))]" />
            Sunset
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-[3px] rounded-sm bg-[hsl(var(--chart-sunrise))]" />
            Sunrise
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-[3px] bg-[hsl(var(--chart-meridian))]" />
            Meridian
          </div>
        </div>
        <div data-print-hide className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" title="Print" aria-label="Print calendar" disabled={loading || calculationError || !days.length}>
                <Printer className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => requestPrint('phase')}>This phase</DropdownMenuItem>
              <DropdownMenuItem onClick={() => requestPrint('month')}>Whole month</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs w-8 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="w-full">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : calculationError ? (
          <p role="alert" className="p-6 text-sm text-muted-foreground">Sunset times unavailable. Allow location access or try again.</p>
        ) : (
          <SunsetDayChart days={days} now={now} zoom={zoom} events={calendarEvents} jumuahDatePair
            onDay={date => navigate(`/day?date=${date}`)}
            onEvent={event => {
              if (user && event.user_id === user.id) setEventDialogState({ open: true, date: event.date, event });
            }}
            phaseChange={phaseBlocks[phaseIdx + 1] ? {
              instant: phaseBlocks[phaseIdx + 1].startInstant,
              icon: phaseBlocks[phaseIdx + 1].icon,
              name: phaseBlocks[phaseIdx + 1].name,
            } : undefined}
          />
        )}
      </div>

      {/* Whole-month print sheets: one page per phase of this Hijri month. */}
      {monthSheets.length > 0 && (
        <div data-print-month-sheets>
          {monthSheets.map(sheet => (
            <PhasePrintSheet
              key={sheet.key}
              days={sheet.days}
              phaseChange={sheet.phaseChange}
              jumuahDatePair
              title={sheet.title}
              phaseLabel={sheet.phaseLabel}
            />
          ))}
        </div>
      )}

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
