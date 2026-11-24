import { LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CalendarLocationState } from '@/hooks/useGeolocation';

export default function CalendarLocationControl({ location }: { location: CalendarLocationState }) {
  if (!location.error) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground mb-3">
      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Use current location" title="Use current location" disabled={location.loading} onClick={location.requestLocation}>
        <LocateFixed className="h-4 w-4" />
      </Button>
      {location.error && <span className="w-full text-center" role="status">{location.error}</span>}
    </div>
  );
}