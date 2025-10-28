import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"

interface DatePickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  label?: string
  className?: string
  disabled?: boolean
  quarter?: string
  setQuarter?: (quarter: string) => void
  number?: string
  setNumber?: (number: string) => void
  showQuarterYear?: boolean
}

export function DatePicker({ 
  date, 
  setDate, 
  label, 
  className, 
  disabled = false,
  quarter,
  setQuarter,
  number,
  setNumber,
  showQuarterYear = false
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          disabled={disabled}
          className={cn(
            "w-full justify-center text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          {date ? format(date, "MMM d, yy") : <span>{label || "Pick a date"}</span>}
        </Button>
      </PopoverTrigger>
      {!disabled && (
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
              className="p-3 pointer-events-auto"
            />
            {showQuarterYear && setQuarter && setNumber && (
              <div className="border-t p-3 space-y-2">
                <div className="text-sm font-medium mb-2">Year Planning</div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={quarter || "none"} onValueChange={(value) => setQuarter(value === "none" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Quarter</SelectItem>
                      <SelectItem value="Q1">Q1</SelectItem>
                      <SelectItem value="Q2">Q2</SelectItem>
                      <SelectItem value="Q3">Q3</SelectItem>
                      <SelectItem value="Q4">Q4</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={number || "none"} onValueChange={(value) => setNumber(value === "none" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Number" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Number</SelectItem>
                      {[...Array(12)].map((_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      )}
    </Popover>
  )
}
