import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface YearWheelProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function YearWheel({ value, onValueChange, placeholder = "Select year", className }: YearWheelProps) {
  // Generate years starting from 1446 (current Hijri year) and going 10 years into the future
  const currentHijriYear = 1446;
  const years = Array.from({ length: 20 }, (_, i) => currentHijriYear + i);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[200px]">
        {years.map((year) => (
          <SelectItem key={year} value={year.toString()}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}