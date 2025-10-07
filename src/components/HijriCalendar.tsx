import React, { useEffect, useState } from 'react';
import { gregorianToHijri, getHijriMonthName, getHijriWeekdays, hijriToGregorian } from '@/lib/hijri-utils';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MoonPhaseData {
  date: string;
  emoji: string;
}

interface SolarEventData {
  date: string;
  emoji: string;
}

const MOON_PHASE_EMOJIS: Record<string, string> = {
  'new_moon': '🌑',
  'waxing_crescent': '🌒',
  'first_quarter': '🌓',
  'waxing_gibbous': '🌔',
  'full_moon': '🌕',
  'waning_gibbous': '🌖',
  'last_quarter': '🌗',
  'waning_crescent': '🌘',
};

const SOLAR_EVENT_EMOJIS: Record<string, string> = {
  'spring_equinox': '🌸',
  'summer_solstice': '☀️',
  'autumn_equinox': '🍂',
  'winter_solstice': '❄️',
};

export function HijriCalendar() {
  const [currentHijriMonth, setCurrentHijriMonth] = useState(() => {
    const today = new Date();
    const hijri = gregorianToHijri(today);
    return { year: hijri.year, month: hijri.month };
  });

  const [moonPhases, setMoonPhases] = useState<Map<string, string>>(new Map());
  const [solarEvents, setSolarEvents] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    fetchAstronomicalData();
  }, [currentHijriMonth]);

  const fetchAstronomicalData = async () => {
    try {
      // Get first and last day of the Hijri month in Gregorian
      const firstDay = hijriToGregorian(currentHijriMonth.year, currentHijriMonth.month, 1);
      const lastDay = hijriToGregorian(currentHijriMonth.year, currentHijriMonth.month, 30);

      // Fetch moon phases
      const { data: moonData } = await supabase
        .from('moon_phases')
        .select('date, phase')
        .gte('date', firstDay.toISOString().split('T')[0])
        .lte('date', lastDay.toISOString().split('T')[0]);

      // Fetch solar events
      const { data: solarData } = await supabase
        .from('solar_events')
        .select('date, type')
        .gte('date', firstDay.toISOString().split('T')[0])
        .lte('date', lastDay.toISOString().split('T')[0]);

      // Process moon phases
      const moonMap = new Map<string, string>();
      moonData?.forEach((item) => {
        const emoji = MOON_PHASE_EMOJIS[item.phase] || '';
        if (emoji) moonMap.set(item.date, emoji);
      });
      setMoonPhases(moonMap);

      // Process solar events
      const solarMap = new Map<string, string>();
      solarData?.forEach((item) => {
        const emoji = SOLAR_EVENT_EMOJIS[item.type] || '';
        if (emoji) solarMap.set(item.date, emoji);
      });
      setSolarEvents(solarMap);
    } catch (error) {
      console.error('Error fetching astronomical data:', error);
    }
  };

  const getDaysInMonth = () => {
    const days = [];
    // Hijri months are typically 29 or 30 days
    // We'll generate 30 days and check which ones are valid
    for (let day = 1; day <= 30; day++) {
      const gregorianDate = hijriToGregorian(currentHijriMonth.year, currentHijriMonth.month, day);
      const hijriCheck = gregorianToHijri(gregorianDate);
      
      // Only include days that belong to this Hijri month
      if (hijriCheck.month === currentHijriMonth.month && hijriCheck.year === currentHijriMonth.year) {
        days.push({
          hijriDay: day,
          gregorianDate,
          weekday: gregorianDate.getDay()
        });
      }
    }
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentHijriMonth(prev => {
      let newMonth = prev.month + (direction === 'next' ? 1 : -1);
      let newYear = prev.year;

      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      } else if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      }

      return { year: newYear, month: newMonth };
    });
  };

  const days = getDaysInMonth();
  const weekdays = getHijriWeekdays();

  // Find the first day of the month to determine offset
  const firstDayWeekday = days[0]?.weekday || 0;

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        
        <h2 className="text-2xl font-bold">
          {getHijriMonthName(currentHijriMonth.month)} {currentHijriMonth.year}
        </h2>
        
        <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekdays.map((day, index) => (
          <div
            key={day}
            className={cn(
              "text-center font-semibold py-2 rounded-lg text-sm",
              index === 5 && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300", // Jumuah
              index === 6 && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" // As-sabt
            )}
          >
            {index === 5 ? 'Jumuah' : index === 6 ? 'As-sabt' : `Day ${index + 1}`}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Empty cells for offset */}
        {Array.from({ length: firstDayWeekday }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        
        {/* Day cells */}
        {days.map(({ hijriDay, gregorianDate, weekday }) => {
          const dateKey = format(gregorianDate, 'yyyy-MM-dd');
          const moonEmoji = moonPhases.get(dateKey);
          const solarEmoji = solarEvents.get(dateKey);
          const isToday = format(new Date(), 'yyyy-MM-dd') === dateKey;

          return (
            <div
              key={hijriDay}
              className={cn(
                "aspect-square border rounded-lg p-2 relative flex flex-col",
                weekday === 5 && "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
                weekday === 6 && "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
                isToday && "ring-2 ring-primary"
              )}
            >
              {/* Hijri day number */}
              <div className="font-medium text-sm mb-1">
                Day {hijriDay}
              </div>

              {/* Moon phase and solar events */}
              <div className="flex gap-1 mb-1">
                {moonEmoji && <span className="text-lg">{moonEmoji}</span>}
                {solarEmoji && <span className="text-lg">{solarEmoji}</span>}
              </div>

              {/* Gregorian date */}
              <div className="text-xs text-muted-foreground mt-auto">
                {format(gregorianDate, 'MMM d, yyyy')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
