
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import type { Locale } from "date-fns";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation } from '@/hooks/useGeolocation';
import { getLocalPhaseMarkers } from '@/lib/moon-calculations';
import CalendarLocationControl from '@/components/CalendarLocationControl';

type CalendarProps = React.ComponentProps<typeof DayPicker>;
// Solar event emoji mapping
const SOLAR_EVENT_EMOJIS = {
  'equinox_spring': '🌼',
  'equinox_autumn': '🍂',
  'solstice_summer': '☀️',
  'solstice_winter': '❄️'
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  onMonthChange,
  ...props
}: CalendarProps) {
  const location = useGeolocation();
  const moonPhases = React.useMemo(() => getLocalPhaseMarkers(location.latitude, location.longitude), [location.latitude, location.longitude]);
  const [solarEvents, setSolarEvents] = React.useState<Record<string, string>>({});

  // Track current displayed month for dynamic fetching
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date());

  // Solar markers retain their stored dates; lunar markers are localized separately.
  React.useEffect(() => {
    const fetchAstronomicalData = async (month: Date) => {
      console.log('Fetching astronomical data for month:', format(month, 'MMMM yyyy'));
      
      // Get start and end of month
      const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      
      // Fetch solar events for the month
      const { data: solarData, error: solarError } = await supabase
        .from('solar_events')
        .select('date, type')
        .gte('date', format(startOfMonth, 'yyyy-MM-dd'))
        .lte('date', format(endOfMonth, 'yyyy-MM-dd'));
      
      if (solarData && !solarError) {
        const eventMap: Record<string, string> = {};
        solarData.forEach((item) => {
          const { date, type } = item;
          const emoji = SOLAR_EVENT_EMOJIS[type as keyof typeof SOLAR_EVENT_EMOJIS];
          if (emoji) {
            eventMap[date] = emoji;
          } else {
            console.warn(`Unknown solar event: ${type} for date: ${date}`);
          }
        });
        console.log('Final solar event map:', eventMap);
        setSolarEvents(eventMap);
      } else if (solarError) {
        console.error('Error fetching solar events:', solarError);
      }
    };
    
    fetchAstronomicalData(currentMonth);
  }, [currentMonth]);

  // Custom formatter for day labels (to show Gregorian date)
  const formatCaption = (date: Date, options?: { locale?: Locale }): string => {
    return format(date, 'MMMM yyyy');
  };

  // Custom day content renderer to show moon phases and solar events
  const renderDayContent = (date: Date) => {
    // Use ISO date string format to match Supabase date storage
    const dateStr = format(date, 'yyyy-MM-dd');
    const moonPhase = moonPhases.get(dateStr);
    const solarEvent = solarEvents[dateStr];
    
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <span className="relative z-10">{date.getDate()}</span>
        {moonPhase && (
          <span 
            className="absolute top-0 right-0 text-xs leading-none select-none" 
            style={{ fontSize: '10px', zIndex: 20 }}
            title={`Moon phase: ${moonPhase.name} · ${location.label}`}
          >
            {moonPhase.icon}
          </span>
        )}
        {solarEvent && (
          <span 
            className="absolute bottom-0 left-0 text-xs leading-none select-none" 
            style={{ fontSize: '10px', zIndex: 20 }}
            title={`Solar event: ${Object.keys(SOLAR_EVENT_EMOJIS).find(key => SOLAR_EVENT_EMOJIS[key as keyof typeof SOLAR_EVENT_EMOJIS] === solarEvent)?.replace('_', ' ') || 'unknown'}`}
          >
            {solarEvent}
          </span>
        )}
      </div>
    );
  };

  return (
    <div>
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      onMonthChange={(month) => {
        console.log('Month changed to:', format(month, 'MMMM yyyy'));
        setCurrentMonth(month);
        onMonthChange?.(month);
      }}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        DayContent: ({ date }) => renderDayContent(date),
      }}
      formatters={{ formatCaption }}
      weekStartsOn={0} // Start on Sunday for Gregorian calendar
      {...props}
    />
    <CalendarLocationControl location={location} />
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
