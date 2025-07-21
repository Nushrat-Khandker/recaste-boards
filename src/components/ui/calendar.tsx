
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import type { Locale } from "date-fns";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

// Moon phase emoji mapping
const MOON_PHASE_EMOJIS = {
  'new': '🌑',
  'first_quarter': '🌓', 
  'full': '🌕',
  'last_quarter': '🌗'
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const [moonPhases, setMoonPhases] = React.useState<Record<string, string>>({});

  // Fetch moon phases for the current month
  React.useEffect(() => {
    const fetchMoonPhases = async () => {
      console.log('Fetching moon phases...');
      const { data, error } = await supabase
        .from('moon_phases')
        .select('date, phase');
      
      console.log('Moon phases data:', data, 'Error:', error);
      
      if (data && !error) {
        const phaseMap: Record<string, string> = {};
        data.forEach(({ date, phase }) => {
          const emoji = MOON_PHASE_EMOJIS[phase as keyof typeof MOON_PHASE_EMOJIS];
          if (emoji) {
            phaseMap[date] = emoji;
          }
          console.log(`Date: ${date}, Phase: ${phase}, Emoji: ${emoji}`);
        });
        console.log('Final phase map:', phaseMap);
        setMoonPhases(phaseMap);
      }
    };
    
    fetchMoonPhases();
  }, []);

  // Custom formatter for day labels (to show Gregorian date)
  const formatCaption = (date: Date, options?: { locale?: Locale }): string => {
    return format(date, 'MMMM yyyy');
  };

  // Custom day content renderer to show moon phases
  const renderDayContent = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const moonPhase = moonPhases[dateStr];
    
    console.log(`Rendering date: ${dateStr}, Moon phase: ${moonPhase}`);
    
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <span>{date.getDate()}</span>
        {moonPhase && (
          <span className="absolute top-0 right-0 text-xs leading-none" style={{ fontSize: '10px' }}>
            {moonPhase}
          </span>
        )}
      </div>
    );
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
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
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
