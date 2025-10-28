import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from 'lucide-react';

interface QuarterSelectorProps {
  selectedQuarter: string;
  selectedYear: string;
  onQuarterChange: (quarter: string) => void;
  onYearChange: (year: string) => void;
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const YEARS = ['1447', '1448', '1449', '1449+'];

export function QuarterSelector({ 
  selectedQuarter, 
  selectedYear, 
  onQuarterChange, 
  onYearChange 
}: QuarterSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-1">
          {QUARTERS.map((quarter) => (
            <Button
              key={quarter}
              variant={selectedQuarter === quarter ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs font-medium min-w-[2rem]"
              onClick={(e) => {
                e.stopPropagation();
                onQuarterChange(selectedQuarter === quarter ? '' : quarter);
              }}
            >
              {quarter}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 ml-1"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Calendar className="h-3.5 w-3.5" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-3">Select Year</h4>
            <Carousel className="w-full max-w-xs mx-auto">
              <CarouselContent>
                {YEARS.map((year) => (
                  <CarouselItem key={year} className="basis-1/3">
                    <Button
                      variant={selectedYear === year ? "default" : "outline"}
                      className="w-full"
                      onClick={() => {
                        onYearChange(selectedYear === year ? '' : year);
                      }}
                    >
                      {year}
                    </Button>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-3">Select Quarter</h4>
            <div className="grid grid-cols-4 gap-2">
              {QUARTERS.map((quarter) => (
                <Button
                  key={quarter}
                  variant={selectedQuarter === quarter ? "default" : "outline"}
                  onClick={() => {
                    onQuarterChange(selectedQuarter === quarter ? '' : quarter);
                  }}
                >
                  {quarter}
                </Button>
              ))}
            </div>
          </div>

          {(selectedYear || selectedQuarter) && (
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => {
                onYearChange('');
                onQuarterChange('');
                setIsOpen(false);
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
