import React, { useEffect, useState, useCallback } from 'react';
import { useCalendarNav as useNavigate } from '@/hooks/useCalendarNav';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getHijriMonthName } from '@/lib/hijri-utils';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useCalendarNow } from '@/hooks/useCalendarNow';
import { getLocalPhaseForDate } from '@/lib/moon-calculations';
import { calculateSunsetDay, sunsetDayDate, sunsetDayDisplayDate, formatChartTime, type SunsetDay } from '@/lib/sunset-day';
import SunsetDayChart from '@/components/SunsetDayChart';
import CalendarLocationControl from '@/components/CalendarLocationControl';
import { format } from 'date-fns';
import CalendarEventDialog from '@/components/CalendarEventDialog';

import {
  getHijriForDate,
} from '@/lib/hijri-calendar-engine';

function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function formatDateShort(date: Date): string {
  return format(date, 'd MMM yyyy');
}

interface DayViewProps { date: Date; }

export const DayView: React.FC<DayViewProps> = ({ date }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const geo = useGeolocation();
  const now = useCalendarNow();

  const [solar, setSolar] = useState<SunsetDay | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventDialogState, setEventDialogState] = useState<{ open: boolean; date: string; event?: any }>({
    open: false, date: '',
  });

  const hijri = getHijriForDate(date);
  const weekday = sunsetDayDisplayDate(date).getDay();
  const dateKey = toDateKey(date);
  const isToday = dateKey === toDateKey(sunsetDayDate(now, geo.latitude, geo.longitude));
  const phase = getLocalPhaseForDate(date, geo.latitude, geo.longitude);
  const isJummah = weekday === 5;
  const isSabt = weekday === 6;

  const fetchEvents = useCallback(async () => {
    try {
      const { data } = await supabase.from('calendar_events').select('*').gte('date', dateKey).lte('date', toDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)));
      if (data) setCalendarEvents(data);
    } catch { /* silent */ }
  }, [dateKey]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    if (geo.loading) return;
    let cancelled = false;
    setLoading(true);
    Promise.resolve(calculateSunsetDay(date, geo.latitude, geo.longitude)).then(data => {
      if (cancelled) return;
      setSolar(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [dateKey, geo.latitude, geo.longitude, geo.loading]);

  const prevDate = new Date(date);
  prevDate.setDate(prevDate.getDate() - 1);
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);

  return (
    <div className="w-full max-w-2xl mx-auto p-2 sm:p-6">
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <Button variant="outline" size="sm" onClick={() => navigate(`/day?date=${toDateKey(prevDate)}`)} className="text-xs sm:text-sm px-2 sm:px-3">
          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <div className="text-center leading-tight">
          {(() => {
            const dayLabel = isJummah ? 'Jumuah' : isSabt ? 'As-Sabt' : `${weekday + 1}`;
            const labelColor = isJummah ? 'text-green-700 dark:text-green-300' : isSabt ? 'text-red-700 dark:text-red-300' : '';
            return (
              <>
                <h2 className={cn("text-base sm:text-2xl font-bold", labelColor)}>
                  {phase?.phaseEmoji} {dayLabel}
                  {isToday && <span className="ml-2 text-xs sm:text-sm font-medium text-primary">(Today)</span>}
                </h2>
                <p className="text-sm font-semibold text-foreground">{phase ? `${phase.dayInPhase} / ${phase.phaseDuration}` : 'Phase unavailable'}</p>
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

      <CalendarLocationControl location={geo} />
      {!loading && solar && <p className="text-center text-xs text-muted-foreground mb-3">
        {format(date, 'd MMM')} {formatChartTime(solar.start, solar.timeZone)} → {format(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1), 'd MMM')} {formatChartTime(solar.end, solar.timeZone)}
      </p>}

      <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground mb-3">
        <button onClick={() => navigate(`/year?year=${hijri.year}`)} className="hover:text-primary transition-colors">{hijri.year} AH</button>
        <span>›</span>
        <button onClick={() => navigate(`/quarter?q=${Math.ceil(hijri.month / 3)}&year=${hijri.year}`)} className="hover:text-primary transition-colors">Q{Math.ceil(hijri.month / 3)}</button>
        <span>›</span>
        <button onClick={() => navigate(`/?month=${hijri.month}&year=${hijri.year}`)} className="hover:text-primary transition-colors">{getHijriMonthName(hijri.month)}</button>
        <span>›</span>
        <button onClick={() => navigate('/moon-phases')} className="hover:text-primary transition-colors">{phase?.phase ?? 'Phase unavailable'}</button>
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
      ) : !solar ? (
        <p role="alert" className="text-center py-10 text-muted-foreground">Sunset times unavailable. Allow location access or try again.</p>
      ) : (
        <div className="flex justify-center">
            <SunsetDayChart days={[solar]} now={now} events={calendarEvents}
              onDay={date => setEventDialogState({ open: true, date })}
              onEvent={event => {
                if (user && event.user_id === user.id) setEventDialogState({ open: true, date: event.date, event });
              }}
            />
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
