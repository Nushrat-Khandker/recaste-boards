import React, { useEffect, useState } from 'react';
import { gregorianToHijri, getHijriMonthName, getHijriWeekdays, hijriToGregorian } from '@/lib/hijri-utils';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useKanban } from '@/context/KanbanContext';
interface KanbanCard {
  id: string;
  title: string;
  due_date?: string;
  start_date?: string;
  tags?: any;
  project_name?: string;
}

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
  const { selectedTags, selectedProject } = useKanban();
  const [newMoons, setNewMoons] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [monthRange, setMonthRange] = useState<{ start: Date; end: Date } | null>(null);
  const [hijriTitle, setHijriTitle] = useState<{ year: number; monthName: string }>({ year: 1447, monthName: getHijriMonthName(1) });

  const [moonPhases, setMoonPhases] = useState<Map<string, string>>(new Map());
  const [solarEvents, setSolarEvents] = useState<Map<string, string>>(new Map());
  const [cards, setCards] = useState<KanbanCard[]>([]);

  useEffect(() => {
    loadNewMoons();
    fetchCards();
  }, []);

  // Anchor new moon for 1 Muharram 1447 AH
  const ANCHOR_NEW_MOON = '2025-06-25';

  function addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function computeHijriFromIndex(index: number) {
    const anchorIdx = newMoons.findIndex((d) => d === ANCHOR_NEW_MOON);
    if (anchorIdx === -1) {
      return { year: 1447, month: 1 };
    }
    const offset = index - anchorIdx;
    const month = ((1 - 1 + offset) % 12 + 12) % 12 + 1; // 1..12
    const year = 1447 + Math.floor((1 - 1 + offset) / 12);
    return { year, month };
  }

  const loadNewMoons = async () => {
    try {
      const { data, error } = await supabase
        .from('moon_phases')
        .select('date, phase')
        .eq('phase', 'new_moon')
        .gte('date', '2024-01-01')
        .lte('date', '2028-12-31')
        .order('date', { ascending: true });

      if (error) throw error;

      const dates = (data || []).map((r: any) => r.date as string);
      if (!dates.length) return;
      setNewMoons(dates);

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      let idx = dates.findIndex((d) => d > todayStr) - 1;
      if (idx < 0) idx = dates.length - 1;

      const start = new Date(dates[idx]);
      const end = idx + 1 < dates.length ? new Date(dates[idx + 1]) : addDays(start, 30);
      setMonthRange({ start, end });
      setCurrentIndex(idx);

      const { year, month } = computeHijriFromIndex(idx);
      setHijriTitle({ year, monthName: getHijriMonthName(month) });

      await fetchAstronomicalData(start, end);
    } catch (e) {
      console.error('Error loading new moons:', e);
    }
  };

  const fetchAstronomicalData = async (start: Date, end: Date) => {
    try {
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      const { data: moonData } = await supabase
        .from('moon_phases')
        .select('date, phase')
        .gte('date', startStr)
        .lt('date', endStr);

      const { data: solarData } = await supabase
        .from('solar_events')
        .select('date, type')
        .gte('date', startStr)
        .lt('date', endStr);

      const moonMap = new Map<string, string>();
      moonData?.forEach((item: any) => {
        const emoji = MOON_PHASE_EMOJIS[item.phase] || '';
        if (emoji) moonMap.set(item.date, emoji);
      });
      setMoonPhases(moonMap);

      const solarMap = new Map<string, string>();
      solarData?.forEach((item: any) => {
        const emoji = SOLAR_EVENT_EMOJIS[item.type] || '';
        if (emoji) solarMap.set(item.date, emoji);
      });
      setSolarEvents(solarMap);
    } catch (error) {
      console.error('Error fetching astronomical data:', error);
    }
  };

  const fetchCards = async () => {
    try {
      const { data } = await supabase
        .from('kanban_cards')
        .select('id, title, due_date, start_date, tags, project_name');
      
      if (data) {
        setCards(data);
      }
    } catch (error) {
      console.error('Error fetching cards:', error);
    }
  };

  const filterCards = (cards: KanbanCard[]) => {
    return cards.filter(card => {
      // Filter by project
      if (selectedProject && card.project_name !== selectedProject) {
        return false;
      }

      // Filter by tags
      if (selectedTags.length > 0) {
        const cardTags = Array.isArray(card.tags) 
          ? card.tags.map((t: any) => typeof t === 'string' ? t : t.text)
          : [];
        
        const hasMatchingTag = selectedTags.some(selectedTag => 
          cardTags.includes(selectedTag)
        );
        
        if (!hasMatchingTag) {
          return false;
        }
      }

      return true;
    });
  };

  const getCardsForDate = (gregorianDate: Date) => {
    const dateKey = format(gregorianDate, 'yyyy-MM-dd');
    const filteredCards = filterCards(cards);
    
    const result: Array<{ card: KanbanCard; type: 'start' | 'due' }> = [];
    
    filteredCards.forEach(card => {
      if (card.start_date) {
        const startDateKey = format(new Date(card.start_date), 'yyyy-MM-dd');
        if (startDateKey === dateKey) {
          result.push({ card, type: 'start' });
        }
      }
      if (card.due_date) {
        const dueDateKey = format(new Date(card.due_date), 'yyyy-MM-dd');
        if (dueDateKey === dateKey) {
          result.push({ card, type: 'due' });
        }
      }
    });
    
    return result;
  };

  const getDaysInMonth = () => {
    const days: { hijriDay: number; gregorianDate: Date; weekday: number }[] = [];
    if (!monthRange) return days;
    for (let d = new Date(monthRange.start), i = 1; d < monthRange.end; d.setDate(d.getDate() + 1), i++) {
      const g = new Date(d);
      days.push({ hijriDay: i, gregorianDate: g, weekday: g.getDay() });
    }
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentIndex((prev) => {
      const newIndex = prev + (direction === 'next' ? 1 : -1);
      if (newIndex < 0 || newIndex >= newMoons.length) return prev;
      const start = new Date(newMoons[newIndex]);
      const end = newIndex + 1 < newMoons.length ? new Date(newMoons[newIndex + 1]) : addDays(start, 30);
      setMonthRange({ start, end });
      const { year, month } = computeHijriFromIndex(newIndex);
      setHijriTitle({ year, monthName: getHijriMonthName(month) });
      fetchAstronomicalData(start, end);
      return newIndex;
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
          {hijriTitle.monthName} {hijriTitle.year}
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
          const cardsForDate = getCardsForDate(gregorianDate);

          return (
            <div
              key={hijriDay}
              className={cn(
                "aspect-square border-2 border-border/70 rounded-lg p-2 relative flex flex-col overflow-hidden bg-white dark:bg-slate-800",
                weekday === 5 && "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700",
                weekday === 6 && "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700",
                isToday && "ring-2 ring-primary"
              )}
            >
              {/* Moon phase and solar events */}
              <div className="flex gap-1 mb-1">
                {moonEmoji && <span className="text-lg">{moonEmoji}</span>}
                {solarEmoji && <span className="text-lg">{solarEmoji}</span>}
              </div>

              {/* Card titles */}
              <div className="flex-1 overflow-y-auto space-y-1">
                {cardsForDate.map(({ card, type }) => (
                  <div 
                    key={`${card.id}-${type}`}
                    className={cn(
                      "text-xs p-1 rounded border truncate",
                      type === 'start' 
                        ? "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700" 
                        : "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700"
                    )}
                    title={`${card.title} (${type === 'start' ? 'Start' : 'Due'})`}
                  >
                    {card.title}
                  </div>
                ))}
              </div>

              {/* Gregorian date - only on Jumuah */}
              {weekday === 5 && (
                <div className="text-xs text-muted-foreground mt-auto pt-1 border-t">
                  {format(gregorianDate, 'MMM d, yyyy')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
