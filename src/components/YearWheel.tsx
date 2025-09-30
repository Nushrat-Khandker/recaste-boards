import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface YearWheelProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function YearWheel({ value, onValueChange, placeholder = "Select year", className }: YearWheelProps) {
  // Specific Hijri years: 1447, 1448, 1449, and 1449+
  const years = ['1447', '1448', '1449', '1449+'];

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={`${className} cursor-default`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[200px]">
        {years.map((year) => (
          <SelectItem key={year} value={year}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}