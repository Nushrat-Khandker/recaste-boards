import { LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { CALENDAR_LOCATIONS } from '@/lib/calendar-locations';
import type { CalendarLocationState } from '@/hooks/useGeolocation';

export default function CalendarLocationControl({ location }: { location: CalendarLocationState }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground mb-3">
      <Select value={location.selection} onValueChange={location.selectCity}>
        <SelectTrigger aria-label="Calendar location" className="h-8 w-44 text-xs">
          <SelectValue>{location.loading ? 'Locating…' : location.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">Your location</SelectItem>
          {CALENDAR_LOCATIONS.map(city => <SelectItem key={city.id} value={city.id}>{city.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Use current location" title="Use current location" disabled={location.loading} onClick={location.requestLocation}>
        <LocateFixed className="h-4 w-4" />
      </Button>
      <span>{location.timeZone.replace(/_/g, ' ')}</span>
      {location.error && <span className="w-full text-center" role="status">{location.error}</span>}
    </div>
  );
}