import React from 'react';
import { useCalendarNav as useNavigate } from '@/hooks/useCalendarNav';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getHijriMonthName } from '@/lib/hijri-utils';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  PHASE_NAMES,
  getCurrentHijriMonth, getMonthStartDate, getMonthEndDate,
  getLunationForHijriMonth, getPhaseBoundariesForLunation,
} from '@/lib/hijri-calendar-engine';

interface QuarterViewProps {
  quarter: number;
  hijriYear: number;
}

export const QuarterView: React.FC<QuarterViewProps> = ({ quarter, hijriYear }) => {
  const navigate = useNavigate();
  const current = getCurrentHijriMonth();
  const startMonth = (quarter - 1) * 3 + 1;
  const months = [startMonth, startMonth + 1, startMonth + 2];

  return (
    <div className="w-full max-w-5xl mx-auto p-2 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-8">
        <Button
          variant="outline" size="sm"
          onClick={() => {
            if (quarter > 1) navigate(`/quarter?q=${quarter - 1}&year=${hijriYear}`);
            else navigate(`/quarter?q=4&year=${hijriYear - 1}`);
          }}
          className="text-xs sm:text-sm px-2 sm:px-3"
        >
          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <div className="text-center">
          <h2 className="text-base sm:text-2xl font-bold">Quarter {quarter}</h2>
          <p className="text-sm text-muted-foreground">
            {hijriYear} AH · {getHijriMonthName(startMonth)} – {getHijriMonthName(startMonth + 2)}
          </p>
        </div>

        <Button
          variant="outline" size="sm"
          onClick={() => {
            if (quarter < 4) navigate(`/quarter?q=${quarter + 1}&year=${hijriYear}`);
            else navigate(`/quarter?q=1&year=${hijriYear + 1}`);
          }}
          className="text-xs sm:text-sm px-2 sm:px-3"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        {months.map(m => {
          const monthName = getHijriMonthName(m);
          const isCurrent = current.year === hijriYear && current.month === m;
          const isRamadan = m === 9;
          const monthStart = getMonthStartDate(hijriYear, m);
          const monthEnd = getMonthEndDate(hijriYear, m);
          const monthLength = Math.round((monthEnd.getTime() - monthStart.getTime()) / 86400000);

          const days: { day: number; date: Date; weekday: number }[] = [];
          for (let d = 0; d < monthLength; d++) {
            const date = new Date(monthStart.getTime() + d * 86400000);
            days.push({ day: d + 1, date, weekday: date.getDay() });
          }

          // Phase markers from lookup table
          const lun = getLunationForHijriMonth(hijriYear, m);
          const phases = lun
            ? getPhaseBoundariesForLunation(lun).slice(0, 4).map((dayOffset, pi) => ({
                name: PHASE_NAMES[pi],
                day: dayOffset + 1,
              }))
            : [];

          return (
            <button
              key={m}
              onClick={() => navigate(`/?month=${m}&year=${hijriYear}`)}
              className={cn(
                'rounded-xl border p-4 text-left transition-all hover:shadow-lg group',
                isCurrent
                  ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary/20'
                  : isRamadan
                    ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10'
                    : 'border-border bg-card hover:bg-accent/30'
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-lg sm:text-xl font-bold">{m}.</span>
                  <span className={cn('ml-1.5 text-sm sm:text-base font-semibold', isRamadan && 'text-green-700 dark:text-green-300')}>
                    {monthName}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{monthLength}d</span>
              </div>

              <div className="grid grid-cols-7 gap-[2px] mb-3">
                {days.map(({ day, weekday }) => (
                  <div key={day} className={cn(
                    'aspect-square rounded-sm flex items-center justify-center text-[9px]',
                    weekday === 5 && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold',
                    weekday === 6 && 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-bold',
                    weekday !== 5 && weekday !== 6 && 'text-muted-foreground'
                  )}>
                    {day}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-1">
                {phases.map((p, pi) => (
                  <span key={pi} className="text-[10px] text-muted-foreground">
                    {p.name.split(' ')[0]}:{p.day}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/year?year=${hijriYear}`)} className="text-xs text-muted-foreground">
          ← Back to Year View
        </Button>
      </div>
    </div>
  );
};
