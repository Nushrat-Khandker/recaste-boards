import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export type CalendarSubView = 'year' | 'quarter' | 'month' | 'phase' | 'day';

/**
 * Drop-in replacement for `useNavigate` inside the calendar views.
 * The ported TimeTools views navigate with paths like `/year?year=1447`;
 * here those become search params on the current Calendar tab instead.
 */
export function useCalendarNav() {
  const [, setSearchParams] = useSearchParams();

  return useCallback((to: string) => {
    const [path, qs] = to.split('?');
    const q = new URLSearchParams(qs || '');
    const sub: CalendarSubView =
      path === '/year' ? 'year'
      : path === '/quarter' ? 'quarter'
      : path === '/day' ? 'day'
      : path === '/moon-phases' ? 'phase'
      : 'month';

    const next = new URLSearchParams();
    next.set('view', 'calendar');
    next.set('sub', sub);
    ['year', 'q', 'month', 'date'].forEach((k) => {
      const v = q.get(k);
      if (v) next.set(k, v);
    });
    setSearchParams(next);
  }, [setSearchParams]);
}
