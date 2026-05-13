import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  isPushSupported,
  isPushSubscribed,
  subscribeToPush,
} from '@/lib/push-notifications';
import { toast } from '@/hooks/use-toast';

const PROMPT_KEY = 'push_prompt_dismissed_at';
const PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Auto-enable WhatsApp-style push notifications once the user is signed in.
 * - If the browser already has permission but no active subscription, silently
 *   re-subscribe (handles cleared service workers / new devices).
 * - If permission is "default", show a one-time prompt offering to enable.
 * - If "denied", do nothing (user must re-enable in browser settings).
 */
export function useAutoPushSubscribe() {
  const { user, loading } = useAuth();
  const ranFor = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    if (ranFor.current === user.id) return;
    ranFor.current = user.id;

    if (!isPushSupported()) return;

    (async () => {
      try {
        const permission = Notification.permission;
        const already = await isPushSubscribed();

        if (permission === 'granted') {
          if (!already) await subscribeToPush();
          return;
        }

        if (permission === 'denied') return;

        // permission === 'default' → soft prompt (cooldown to avoid nagging)
        const last = Number(localStorage.getItem(PROMPT_KEY) || 0);
        if (Date.now() - last < PROMPT_COOLDOWN_MS) return;

        toast({
          title: 'Enable chat notifications?',
          description: 'Get a ping for every new message, like WhatsApp.',
          action: {
            altText: 'Enable',
            onClick: async () => {
              const ok = await subscribeToPush();
              toast({
                title: ok ? 'Notifications enabled' : 'Could not enable',
                description: ok
                  ? 'You will be notified of new messages.'
                  : 'Allow notifications in your browser settings.',
                variant: ok ? 'default' : 'destructive',
              });
            },
          } as any,
        });
        localStorage.setItem(PROMPT_KEY, String(Date.now()));
      } catch (e) {
        console.warn('Auto push subscribe failed:', e);
      }
    })();
  }, [user, loading]);
}