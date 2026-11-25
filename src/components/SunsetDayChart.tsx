import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { chartHour, formatChartTime, calendarEventInterval, sunsetDayDisplayDate, type ChartCalendarEvent, type SunsetDay } from '@/lib/sunset-day';
import PhasePrintSheet from '@/components/PhasePrintSheet';

interface Props {
  days: SunsetDay[];
  now: Date;
  zoom?: number;
  events: ChartCalendarEvent[];
  onDay: (dateKey: string) => void;
  onEvent: (event: ChartCalendarEvent) => void;
  phaseChange?: { instant: Date; icon: string; name: string };
  jumuahDatePair?: boolean;
}

const styles = {
  start: 'stroke-[hsl(var(--chart-sunset))] fill-[hsl(var(--chart-sunset))]',
  end: 'stroke-[hsl(var(--chart-sunset))] fill-[hsl(var(--chart-sunset))]',
  sunrise: 'stroke-[hsl(var(--chart-sunrise))] fill-[hsl(var(--chart-sunrise))]',
  meridian: 'stroke-[hsl(var(--chart-meridian))] fill-[hsl(var(--chart-meridian))]',
};
const labels = { start: 'Sunset', end: 'Next sunset', sunrise: 'Sunrise', meridian: 'Meridian' };

export default function SunsetDayChart({ days, now, zoom = 1, events, onDay, onEvent, phaseChange, jumuahDatePair = false }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(700);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setAvailableWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  if (!days.length) return <p role="alert">Sunset times unavailable.</p>;
  const left = 12, right = 12, top = 68;
  const chartWidth = availableWidth;
  const chartZoom = zoom;
  const col = Math.max(jumuahDatePair ? 132 : 0, Math.max(78, (chartWidth - left - right) / days.length) * chartZoom);
  const width = left + days.length * col + right;
  const minimum = Math.floor(Math.min(...days.map(day => chartHour(day, day.start))));
  const maximum = Math.ceil(Math.max(...days.map(day => chartHour(day, day.end))));
  const hourRowHeight = 32 * chartZoom;
  const height = (maximum - minimum) * hourRowHeight;
  const y = (hour: number) => top + (hour - minimum) * hourRowHeight;
  const position = (day: SunsetDay, instant: Date) => y(chartHour(day, instant));
  const gridHours = Array.from({ length: maximum - minimum + 1 }, (_, i) => minimum + i);
  const totalHeight = top + height + 24;
  return (
    <>
    <div ref={host} data-print-sunset-chart className="w-full overflow-x-auto border border-border rounded-md bg-background">
      <svg width={width} height={totalHeight} viewBox={`0 0 ${width} ${totalHeight}`} role="img" aria-label="Sunset-to-sunset calendar chart" className="block font-sans">
        {gridHours.map(hour => <g key={hour} className="pointer-events-none" data-grid-hour={hour}>
          <line x1={left} x2={width - right} y1={y(hour)} y2={y(hour)} className="stroke-border" strokeWidth={1} />
        </g>)}
        {days.map((day, index) => {
          const x = left + index * col;
          const showSolarTimes = index === 0 || index === days.length - 1;
          const startY = position(day, day.start), endY = position(day, day.end);
          const displayDate = sunsetDayDisplayDate(day.date);
          const wd = displayDate.getDay();
          const active = now >= day.start && now < day.end;
          const dayLabel = wd === 5 ? 'Jumuah' : wd === 6 ? 'As-sabt' : `${wd + 1}`;
          const dateLabel = displayDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          const eveningDateLabel = day.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          const summary = `${day.dateKey} ${formatChartTime(day.start, day.timeZone)} → ${day.nextDateKey} ${formatChartTime(day.end, day.timeZone)}`;
          return <g key={day.dateKey} data-sunset-day={day.dateKey} data-start={day.start.toISOString()} data-end={day.end.toISOString()}>
            <foreignObject x={x} y={4} width={col} height={55}>
              <Button variant="ghost" onClick={() => onDay(day.dateKey)} title={summary} className="w-full h-full flex flex-col gap-0 px-1 text-xs rounded-none">
                {jumuahDatePair && wd === 5 ? (
                  <span className="flex items-baseline justify-center gap-1 whitespace-nowrap">
                    <span className="text-[9px] text-muted-foreground">{eveningDateLabel}</span>
                    <span className={active ? 'text-primary font-semibold' : ''}>{dayLabel}</span>
                    <span className="text-[9px] text-muted-foreground">{dateLabel}</span>
                  </span>
                ) : (
                  <span className={active ? 'text-primary font-semibold' : ''}>{dayLabel}</span>
                )}
                {active && <span className="text-[10px] text-primary">Today</span>}
              </Button>
            </foreignObject>
            <rect x={x} y={startY} width={col} height={endY - startY} className={wd === 5 ? 'fill-[hsl(var(--chart-friday))]' : wd === 6 ? 'fill-[hsl(var(--chart-saturday))]' : 'fill-background'} />
            {day.sunrise && <rect x={x} y={startY} width={col} height={position(day, day.sunrise) - startY} className="fill-[hsl(var(--chart-night))]" opacity={0.5} />}
            {gridHours.filter(hour => y(hour) > startY && y(hour) < endY).map(hour => <line key={hour} x1={x} x2={x + col} y1={y(hour)} y2={y(hour)} className="stroke-border pointer-events-none" strokeWidth={1} />)}
            <foreignObject x={x} y={startY} width={col} height={endY - startY}>
              <Button variant="ghost" aria-label={`Open ${day.dateKey}`} title={summary} onClick={() => onDay(day.dateKey)} className="w-full h-full rounded-none p-0 hover:bg-primary/5" />
            </foreignObject>
            <line x1={x} x2={x} y1={startY} y2={endY} className="stroke-border pointer-events-none" />
            {active && <rect x={x + 1} y={startY} width={col - 2} height={endY - startY} fill="none" className="stroke-primary pointer-events-none" strokeDasharray="4 4" />}
            {(Object.keys(styles) as Array<keyof typeof styles>).map(key => {
              const instant = day[key];
              if (!instant) return null;
              const eventY = position(day, instant);
              const time = formatChartTime(instant, day.timeZone);
              return <g key={key} className={`${styles[key]} pointer-events-none`} data-event={key} data-instant={instant.toISOString()} data-hour={chartHour(day, instant)}>
                <title>{labels[key]} · {time} · {instant.toLocaleDateString('en-GB', { timeZone: day.timeZone })}</title>
                <line x1={x} x2={x + col} y1={eventY} y2={eventY} strokeWidth={2.5} />
                {showSolarTimes && <text x={x + col / 2} y={eventY + (key === 'start' ? 13 : -6)} textAnchor="middle" stroke="none" fontSize={10}>{time}</text>}
              </g>;
            })}
            {events.flatMap((event, eventIndex) => {
              const interval = calendarEventInterval(event, day);
              if (!interval) return [];
              const eventY = interval.allDay ? startY + 24 + eventIndex * 27 : position(day, interval.start);
              const eventHeight = interval.allDay ? 24 : Math.max(24, position(day, interval.end) - eventY);
              return [<foreignObject data-sunset-event key={event.id} x={x + 3} y={eventY} width={col - 6} height={Math.min(eventHeight, Math.max(0, endY - eventY))}>
                <Button variant="secondary" size="sm" className="w-full h-full text-[10px] justify-start px-1 rounded-sm border-l-4 overflow-hidden" style={{ borderLeftColor: event.color }} onClick={() => onEvent(event)} title={`${event.title} · ${event.date} ${event.start_time ?? ''}`}>
                  <span className="truncate">{event.title}</span>
                </Button>
              </foreignObject>];
            })}
            {phaseChange && phaseChange.instant >= day.start && phaseChange.instant < day.end &&
              <text x={x + col / 2} y={position(day, phaseChange.instant)} dominantBaseline="central" textAnchor="middle" fontSize={18} className="pointer-events-none" data-phase-change={phaseChange.instant.toISOString()}>
                <title>{phaseChange.name} · {formatChartTime(phaseChange.instant, day.timeZone)}</title>
                {phaseChange.icon}
              </text>}
          </g>;
        })}
      </svg>
    </div>
    {/* Print-only sheet: same boxed style as the printed Month view, filling the page. */}
    <PhasePrintSheet days={days} phaseChange={phaseChange} jumuahDatePair={jumuahDatePair} />
    </>
  );
}