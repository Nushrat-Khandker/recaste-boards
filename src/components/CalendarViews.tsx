import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HijriCalendar } from '@/components/HijriCalendar';
import { YearView } from '@/components/YearView';
import { QuarterView } from '@/components/QuarterView';
import MoonPhaseView from '@/components/MoonPhaseView';
import { DayView } from '@/components/DayView';
import { getCurrentHijriMonth } from '@/lib/hijri-calendar-engine';
import type { CalendarSubView } from '@/hooks/useCalendarNav';

const SUB_VIEWS: { value: CalendarSubView; label: string }[] = [
  { value: 'year', label: 'Year' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'month', label: 'Month' },
  { value: 'phase', label: 'Phase' },
  { value: 'day', label: 'Day' },
];

export default function CalendarViews() {
  const [searchParams, setSearchParams] = useSearchParams();
  const current = getCurrentHijriMonth();

  const raw = searchParams.get('sub');
  const sub: CalendarSubView = SUB_VIEWS.some(s => s.value === raw)
    ? (raw as CalendarSubView)
    : 'month';

  const hijriYear = Number(searchParams.get('year')) || current.year;
  const quarter = Math.min(4, Math.max(1, Number(searchParams.get('q')) || Math.ceil(current.month / 3)));
  const month = Math.min(12, Math.max(1, Number(searchParams.get('month')) || current.month));
  const dateParam = searchParams.get('date');
  const dayDate = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date();

  const setSub = (value: string) => {
    const next = new URLSearchParams();
    next.set('view', 'calendar');
    next.set('sub', value);
    setSearchParams(next);
  };

  return (
    <div className="w-full">
      <div className="flex justify-center mb-2">
        <Tabs value={sub} onValueChange={setSub}>
          <TabsList>
            {SUB_VIEWS.map(s => (
              <TabsTrigger key={s.value} value={s.value} className="text-xs sm:text-sm px-2 sm:px-3">
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {sub === 'year' && <YearView hijriYear={hijriYear} />}
      {sub === 'quarter' && <QuarterView quarter={quarter} hijriYear={hijriYear} />}
      {sub === 'month' && <HijriCalendar targetYear={hijriYear} targetMonth={month} />}
      {sub === 'phase' && <MoonPhaseView />}
      {sub === 'day' && <DayView date={isNaN(dayDate.getTime()) ? new Date() : dayDate} />}
    </div>
  );
}
