import React from 'react';
import { useCalendarNav as useNavigate } from '@/hooks/useCalendarNav';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getHijriMonthName } from '@/lib/hijri-utils';
import { cn } from '@/lib/utils';
import { getCurrentHijriMonth } from '@/lib/hijri-calendar-engine';

interface YearViewProps {
  hijriYear: number;
}

export const YearView: React.FC<YearViewProps> = ({ hijriYear }) => {
  const navigate = useNavigate();
  const current = getCurrentHijriMonth();

  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const name = getHijriMonthName(month);
    const isCurrent = current.year === hijriYear && current.month === month;
    const isRamadan = month === 9;
    return { month, name, isCurrent, isRamadan };
  });

  const radius = 140;
  const centerX = 200;
  const centerY = 200;

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:p-6">
      {/* Year nav with arrows */}
      <div className="flex items-center justify-center gap-3 mb-6 sm:mb-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/year?year=${hijriYear - 1}`)}
          className="h-8 w-8 sm:h-10 sm:w-10"
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        <h2 className="text-xl sm:text-3xl font-bold text-center">
          {hijriYear} AH
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/year?year=${hijriYear + 1}`)}
          className="h-8 w-8 sm:h-10 sm:w-10"
        >
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>

      {/* Circular arrangement */}
      <div className="relative mx-auto" style={{ width: '400px', height: '400px', maxWidth: '100%' }}>
        <svg viewBox="0 0 400 400" className="w-full h-full">
          {/* Connecting ring */}
          <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="4 4" />

          {months.map(({ month, name, isCurrent, isRamadan }, i) => {
            const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            const moonR = isCurrent ? 28 : 22;

            return (
              <g
                key={month}
                className="cursor-pointer"
                onClick={() => navigate(`/?month=${month}&year=${hijriYear}`)}
                style={{ transition: 'transform 0.2s' }}
              >
                {/* Moon circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={moonR}
                  className="transition-all duration-200"
                  fill={
                    isCurrent
                      ? 'hsl(var(--primary))'
                      : isRamadan
                        ? 'hsl(152, 50%, 40%)'
                        : 'hsl(36, 30%, 85%)'
                  }
                  stroke={
                    isCurrent
                      ? 'hsl(var(--primary))'
                      : isRamadan
                        ? 'hsl(152, 60%, 32%)'
                        : 'hsl(36, 25%, 68%)'
                  }
                  strokeWidth={isCurrent ? 3 : 1.5}
                />

                {/* Moon crescent overlay for non-current months */}
                {!isCurrent && (
                  <circle
                    cx={x + moonR * 0.3}
                    cy={y - moonR * 0.1}
                    r={moonR * 0.75}
                    fill={isRamadan ? 'hsl(152, 40%, 30%)' : 'hsl(36, 28%, 75%)'}
                    opacity="0.5"
                  />
                )}

                {/* Current month - full moon glow */}
                {isCurrent && (
                  <circle
                    cx={x}
                    cy={y}
                    r={moonR + 4}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="1"
                    opacity="0.4"
                  />
                )}

                {/* Month number */}
                <text
                  x={x}
                  y={y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-bold pointer-events-none select-none"
                  fontSize={isCurrent ? '14' : '12'}
                  fill={
                    isCurrent
                      ? 'hsl(var(--primary-foreground))'
                      : isRamadan
                        ? 'white'
                        : 'hsl(36, 20%, 25%)'
                  }
                >
                  {month}
                </text>

                {/* Month name below */}
                <text
                  x={x}
                  y={y + moonR + 14}
                  textAnchor="middle"
                  className="pointer-events-none select-none"
                  fontSize="9"
                  fontWeight={isCurrent || isRamadan ? '700' : '500'}
                  fill={
                    isRamadan
                      ? 'hsl(152, 60%, 32%)'
                      : isCurrent
                        ? 'hsl(var(--primary))'
                        : 'hsl(var(--muted-foreground))'
                  }
                >
                  {name.length > 12 ? name.slice(0, 10) + '…' : name}
                </text>
              </g>
            );
          })}

          {/* Center label */}
          <text
            x={centerX}
            y={centerY - 8}
            textAnchor="middle"
            className="font-bold pointer-events-none select-none"
            fontSize="20"
            fill="hsl(var(--foreground))"
          >
            {hijriYear}
          </text>
          <text
            x={centerX}
            y={centerY + 12}
            textAnchor="middle"
            className="pointer-events-none select-none"
            fontSize="11"
            fill="hsl(var(--muted-foreground))"
          >
            Hijri Year
          </text>
        </svg>
      </div>

      {/* Quarter indicators */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4 mt-6 sm:mt-10 max-w-2xl mx-auto">
        {[1, 2, 3, 4].map(q => {
          const startMonth = (q - 1) * 3 + 1;
          const endMonth = q * 3;
          const containsCurrent = current.year === hijriYear && current.month >= startMonth && current.month <= endMonth;
          return (
            <button
              key={q}
              onClick={() => navigate(`/quarter?q=${q}&year=${hijriYear}`)}
              className={cn(
                'rounded-lg border p-3 sm:p-4 text-center transition-all hover:shadow-md',
                containsCurrent
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:bg-accent/50'
              )}
            >
              <div className={cn(
                'text-sm sm:text-base font-bold',
                containsCurrent ? 'text-primary' : 'text-foreground'
              )}>
                Q{q}
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                {getHijriMonthName(startMonth).split(' ')[0]} – {getHijriMonthName(endMonth).split(' ')[0]}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
