
import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"

interface DatePickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  label?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({ date, setDate, label, className, disabled = false }: DatePickerProps) {
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
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      )}
    </Popover>
  )
}
