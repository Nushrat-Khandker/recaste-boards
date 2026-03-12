import React, { useEffect, useState } from 'react';
import { gregorianToHijri, getHijriMonthName, getHijriWeekdays, hijriToGregorian } from '@/lib/hijri-utils';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useKanban, KanbanCard } from '@/context/KanbanContext';
import EditCardDialog from '@/components/EditCardDialog';
import CalendarEventDialog from '@/components/CalendarEventDialog';
import { Plus, CalendarPlus } from 'lucide-react';

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
  'equinox_spring': '🌸',
  'solstice_summer': '☀️',
  'equinox_autumn': '🍂',
  'solstice_winter': '❄️',
};

export function HijriCalendar() {
  const { selectedTags, selectedProject, updateCard, addCard, columns } = useKanban();
  const [newMoons, setNewMoons] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [monthRange, setMonthRange] = useState<{ start: Date; end: Date } | null>(null);
  const [hijriTitle, setHijriTitle] = useState<{ year: number; month: number; monthName: string }>({ year: 1447, month: 1, monthName: getHijriMonthName(1) });

  const [moonPhases, setMoonPhases] = useState<Map<string, string>>(new Map());
  const [solarEvents, setSolarEvents] = useState<Map<string, string>>(new Map());
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<{ card: KanbanCard; columnId: string } | null>(null);
  const [newCardDate, setNewCardDate] = useState<Date | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  useEffect(() => {
    loadNewMoons();
    fetchCards();
  }, []);

  useEffect(() => {
    fetchCards();
  }, [selectedTags, selectedProject]);

  // Anchor new moon for 1 Muharram 1447 AH
  const ANCHOR_NEW_MOON = '2025-06-25';

  function addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function computeHijriFromIndex(index: number, moons: string[]) {
    const anchorIdx = moons.findIndex((d) => d === ANCHOR_NEW_MOON);
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

      const { year, month } = computeHijriFromIndex(idx, dates);
      setHijriTitle({ year, month, monthName: getHijriMonthName(month) });

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
        .select('id, title, due_date, start_date, tags, project_name, is_holiday, card_emoji, column_id, description, priority, assigned_to, number, quarter, checklist, file_attachments, owner_id');
      
      if (data) {
        const mapped: KanbanCard[] = data.map((c: any) => ({
          id: c.id,
          title: c.title,
          description: c.description || '',
          projectName: c.project_name || '',
          tags: Array.isArray(c.tags) ? c.tags : (typeof c.tags === 'string' ? (() => { try { return JSON.parse(c.tags); } catch { return []; } })() : []),
          priority: c.priority || 'medium',
          number: c.number,
          quarter: c.quarter,
          startDate: c.start_date ? new Date(c.start_date) : undefined,
          dueDate: c.due_date ? new Date(c.due_date) : undefined,
          isHoliday: c.is_holiday,
          cardEmoji: c.card_emoji,
          assignedTo: c.assigned_to,
          ownerId: c.owner_id,
          checklist: c.checklist,
          fileAttachments: c.file_attachments,
          _columnId: c.column_id,
        }));
        setCards(mapped);
      }
    } catch (error) {
      console.error('Error fetching cards:', error);
    }
  };

  const filterCards = (cards: KanbanCard[]) => {
    return cards.filter(card => {
      // Filter by project
      if (selectedProject && card.projectName !== selectedProject) {
        return false;
      }

      // Filter by tags
      if (selectedTags.length > 0) {
        const selectedTagTexts = selectedTags.map((t: any) => (typeof t === 'string' ? t : t.text));

        // Normalize card tags: handle array, stringified JSON, or null
        let cardTagsArray: any[] = [];
        if (Array.isArray(card.tags)) {
          cardTagsArray = card.tags;
        } else if (typeof card.tags === 'string') {
          try {
            const parsed = JSON.parse(card.tags);
            if (Array.isArray(parsed)) cardTagsArray = parsed;
          } catch {
            cardTagsArray = [];
          }
        }

        const cardTagTexts = cardTagsArray
          .map((t: any) => (typeof t === 'string' ? t : t.text))
          .filter(Boolean);

        const hasMatchingTag = selectedTagTexts.some((tag: string) =>
          cardTagTexts.includes(tag)
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
      if (card.startDate) {
        const startDateKey = format(new Date(card.startDate), 'yyyy-MM-dd');
        if (startDateKey === dateKey) {
          result.push({ card, type: 'start' });
        }
      }
      if (card.dueDate) {
        const dueDateKey = format(new Date(card.dueDate), 'yyyy-MM-dd');
        if (dueDateKey === dateKey) {
          result.push({ card, type: 'due' });
        }
      }
    });
    
    return result;
  };

  const getEmojisForDate = (gregorianDate: Date) => {
    const dateKey = format(gregorianDate, 'yyyy-MM-dd');
    const filteredCards = filterCards(cards);
    const emojis: string[] = [];
    filteredCards.forEach(card => {
      const emoji = card.cardEmoji || (card.isHoliday ? '🏖️' : null);
      if (!emoji || !card.startDate) return;
      const start = format(new Date(card.startDate), 'yyyy-MM-dd');
      const end = card.dueDate ? format(new Date(card.dueDate), 'yyyy-MM-dd') : start;
      if (dateKey > start && dateKey < end) {
        emojis.push(emoji);
      }
    });
    return emojis;
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
      const { year, month } = computeHijriFromIndex(newIndex, newMoons);
      setHijriTitle({ year, month, monthName: getHijriMonthName(month) });
      fetchAstronomicalData(start, end);
      return newIndex;
    });
  };

  const days = getDaysInMonth();
  const weekdays = getHijriWeekdays();

  // Find the first day of the month to determine offset
  const firstDayWeekday = days[0]?.weekday || 0;

  return (
    <div className="w-full max-w-6xl mx-auto p-2 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-6">
        <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')} className="text-xs sm:text-sm px-2 sm:px-3">
          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        
        <h2 className="text-base sm:text-2xl font-bold text-center">
          {hijriTitle.month}. {hijriTitle.monthName} {hijriTitle.year}
        </h2>
        
        <Button variant="outline" size="sm" onClick={() => navigateMonth('next')} className="text-xs sm:text-sm px-2 sm:px-3">
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
        {weekdays.map((day, index) => (
          <div
            key={day}
            className={cn(
              "text-center font-semibold py-1 sm:py-2 rounded-lg text-[10px] sm:text-sm",
              index === 5 && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300", // Jumuah
              index === 6 && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" // As-sabt
            )}
          >
            <span className="hidden sm:inline">{index === 5 ? 'Jumuah' : index === 6 ? 'As-sabt' : `Day ${index + 1}`}</span>
            <span className="sm:hidden">{index === 5 ? 'Jum' : index === 6 ? 'Sab' : `D${index + 1}`}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
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
          const isHovered = hoveredDate === dateKey;
          const dateEmojis = getEmojisForDate(gregorianDate);
          const isHoliday = dateEmojis.includes('🏖️');

          return (
            <div
              key={hijriDay}
              className={cn(
                "aspect-square border border-border/70 sm:border-2 rounded-sm sm:rounded-lg p-0.5 sm:p-2 relative flex flex-col overflow-hidden bg-white dark:bg-slate-800 group",
                weekday === 5 && "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700",
                weekday === 6 && "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700",
                isToday && "ring-1 sm:ring-2 ring-primary"
              )}
              onMouseEnter={() => setHoveredDate(dateKey)}
              onMouseLeave={() => setHoveredDate(null)}
            >
              {/* Add card button - shown on hover */}
              <button
                onClick={() => setNewCardDate(gregorianDate)}
                className={cn(
                  "absolute top-1 right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground flex items-center justify-center transition-opacity duration-200 z-10",
                  isHovered ? "opacity-100" : "opacity-0"
                )}
                title="Add card"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>

              <div className="flex flex-wrap gap-0.5 sm:gap-1 mb-0.5 sm:mb-1">
                {dateEmojis.map((emoji, i) => (
                  <span key={i} className="text-[10px] sm:text-base leading-none">{emoji}</span>
                ))}
                {moonEmoji && <span className="text-[10px] sm:text-base leading-none">{moonEmoji}</span>}
                {solarEmoji && <span className="text-[10px] sm:text-base leading-none">{solarEmoji}</span>}
              </div>

              {/* Card titles */}
              <div className="flex-1 overflow-y-auto space-y-0.5 sm:space-y-1">
                {cardsForDate.map(({ card, type }) => {
                  // Find which column the card belongs to
                  const cardColumn = columns.find(col => 
                    col.cards.some(c => c.id === card.id)
                  );
                  
                  return (
                    <div 
                      key={`${card.id}-${type}`}
                      className={cn(
                        "text-[8px] sm:text-xs p-0.5 sm:p-1 rounded border truncate cursor-pointer hover:opacity-80 transition-opacity",
                        type === 'start' 
                          ? "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700" 
                          : "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700"
                      )}
                      title={`${card.title} (${type === 'start' ? 'Start' : 'Due'})`}
                      onClick={() => setSelectedCard({ card, columnId: cardColumn?.id || (card as any)._columnId || 'todo' })}
                    >
                      {card.title}
                    </div>
                  );
                })}
              </div>

              {/* Gregorian date - only on Jumuah */}
              {weekday === 5 && (
                <div className="text-[8px] sm:text-xs text-muted-foreground mt-auto pt-0.5 sm:pt-1 border-t">
                  {format(gregorianDate, 'MMM d, yyyy')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Card Dialog */}
      {selectedCard && (
        <EditCardDialog
          card={selectedCard.card}
          columnId={selectedCard.columnId}
          isOpen={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          onSave={(columnId, updatedCard) => {
            updateCard(columnId, updatedCard);
            setSelectedCard(null);
          }}
        />
      )}

      {/* New Card Dialog */}
      {newCardDate && (
        <EditCardDialog
          card={{
            id: 'new',
            title: '',
            description: '',
            projectName: selectedProject || '',
            tags: [],
            priority: 'medium',
            startDate: newCardDate,
            dueDate: newCardDate,
          } as KanbanCard}
          columnId="todo"
          isOpen={!!newCardDate}
          onClose={() => setNewCardDate(null)}
          onSave={(columnId, newCard) => {
            addCard(columnId, {
              title: newCard.title,
              description: newCard.description,
              projectName: newCard.projectName,
              tags: newCard.tags,
              startDate: newCard.startDate,
              dueDate: newCard.dueDate,
              assignedTo: newCard.assignedTo,
            });
            setNewCardDate(null);
            fetchCards();
          }}
          isNew={true}
        />
      )}
    </div>
  );
}
