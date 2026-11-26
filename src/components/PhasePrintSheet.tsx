import SunsetDayChart from '@/components/SunsetDayChart';
import type { SunsetDay } from '@/lib/sunset-day';

interface Props {
  days: SunsetDay[];
  phaseChange?: { instant: Date; icon: string; name: string };
  jumuahDatePair?: boolean;
  title?: string;
  phaseLabel?: string;
}

const noop = () => {};
const NEVER = new Date(0);

/** Whole-month print page: reuses the exact app chart so print always matches the app. */
export default function PhasePrintSheet({ days, phaseChange, jumuahDatePair = false, title, phaseLabel }: Props) {
  if (!days.length) return null;
  return (
    <div data-print-month-phase-sheet="" aria-hidden="true" className="hidden">
      {title && (
        <div className="pb-[2mm] text-center text-[11pt] font-semibold">
          {title}
          {phaseLabel && <span className="font-normal text-muted-foreground"> · {phaseLabel}</span>}
        </div>
      )}
      <SunsetDayChart days={days} now={NEVER} events={[]} onDay={noop} onEvent={noop} phaseChange={phaseChange} jumuahDatePair={jumuahDatePair} />
    </div>
  );
}
