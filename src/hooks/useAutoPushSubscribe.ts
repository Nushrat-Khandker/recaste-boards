import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import {
  isPushSupported,
  isPushSubscribed,
  subscribeToPush,
} from '@/lib/push-notifications';

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

        toast('Enable chat notifications?', {
          description: 'Get a ping for every new message, like WhatsApp.',
          duration: 12000,
          action: {
            label: 'Enable',
            onClick: async () => {
              const ok = await subscribeToPush();
              if (ok) toast.success('Notifications enabled');
              else toast.error('Could not enable. Allow notifications in browser settings.');
            },
          },
        });
        localStorage.setItem(PROMPT_KEY, String(Date.now()));
      } catch (e) {
        console.warn('Auto push subscribe failed:', e);
      }
    })();
  }, [user, loading]);
}