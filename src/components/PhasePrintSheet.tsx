import { chartHour, formatChartTime, sunsetDayDisplayDate, type SunsetDay } from '@/lib/sunset-day';

interface Props {
  days: SunsetDay[];
  phaseChange?: { instant: Date; icon: string; name: string };
  jumuahDatePair?: boolean;
  /** Whole-month sheets print one page per phase and carry their own title. */
  month?: boolean;
  title?: string;
  phaseLabel?: string;
}

const COLOURS = {
  start: '--chart-sunset',
  end: '--chart-sunset',
  sunrise: '--chart-sunrise',
  meridian: '--chart-meridian',
} as const;

const KEYS = Object.keys(COLOURS) as Array<keyof typeof COLOURS>;

export default function PhasePrintSheet({ days, phaseChange, jumuahDatePair = false, month = false, title, phaseLabel }: Props) {
  if (!days.length) return null;
  const minimum = Math.floor(Math.min(...days.map(day => chartHour(day, day.start))));
  const maximum = Math.ceil(Math.max(...days.map(day => chartHour(day, day.end))));
  const span = Math.max(1, maximum - minimum);
  const percent = (day: SunsetDay, instant: Date) => ((chartHour(day, instant) - minimum) / span) * 100;
  const gridHours = Array.from({ length: maximum - minimum + 1 }, (_, i) => minimum + i);
  return (
    <div {...(month ? { 'data-print-month-phase-sheet': '' } : { 'data-print-phase-sheet': '' })} aria-hidden="true" className="hidden">
      {title && (
        <div className="pb-[2mm] text-center text-[11pt] font-semibold">
          {title}
          {phaseLabel && <span className="font-normal text-muted-foreground"> · {phaseLabel}</span>}
        </div>
      )}
      <div className="grid gap-[2mm]" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
        {days.map(day => {
          const displayDate = sunsetDayDisplayDate(day.date);
          const wd = displayDate.getDay();
          const dayLabel = wd === 5 ? 'Jumuah' : wd === 6 ? 'As-sabt' : `Day ${wd + 1}`;
          const dateLabel = displayDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          const eveningDateLabel = day.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          return <div key={day.dateKey} data-print-phase-head={wd} className="rounded-lg py-[1.5mm] text-center font-semibold text-[9pt]">
            {wd === 5 && jumuahDatePair
              ? <span className="whitespace-nowrap"><span className="text-[7pt] font-normal">{eveningDateLabel}</span> {dayLabel} <span className="text-[7pt] font-normal">{dateLabel}</span></span>
              : dayLabel}
          </div>;
        })}
        {days.map((day, index) => {
          const wd = sunsetDayDisplayDate(day.date).getDay();
          const showSolarTimes = index === 0 || index === days.length - 1;
          const top = percent(day, day.start), bottom = percent(day, day.end);
          return <div key={day.dateKey} data-print-phase-col={wd} className="relative">
            <div className="absolute inset-x-0 rounded-lg border border-border overflow-hidden" style={{ top: `${top}%`, height: `${bottom - top}%` }}>
              {gridHours.filter(hour => hour > chartHour(day, day.start) && hour < chartHour(day, day.end)).map(hour =>
                <div key={hour} className="absolute inset-x-0 border-t border-border/40" style={{ top: `${((hour - chartHour(day, day.start)) / (chartHour(day, day.end) - chartHour(day, day.start))) * 100}%` }} />)}
            </div>
            {KEYS.map(key => {
              const instant = day[key];
              if (!instant) return null;
              const at = percent(day, instant);
              const colour = COLOURS[key];
              return <div key={key} className="absolute inset-x-0" style={{ top: `${at}%` }}>
                <div className="h-[2px] -translate-y-1/2" style={{ background: `hsl(var(${colour}))` }} />
                {showSolarTimes && <span className="absolute left-0 right-0 text-center text-[7pt]" style={{ color: `hsl(var(${colour}))`, top: key === 'end' ? '-11pt' : '1pt' }}>{formatChartTime(instant, day.timeZone)}</span>}
              </div>;
            })}
            {phaseChange && phaseChange.instant >= day.start && phaseChange.instant < day.end &&
              <span className="absolute left-0 right-0 text-center text-[13pt] -translate-y-1/2" style={{ top: `${percent(day, phaseChange.instant)}%` }}>{phaseChange.icon}</span>}
          </div>;
        })}
      </div>
    </div>
  );
}
