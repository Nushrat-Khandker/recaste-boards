import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Module-level singleton so the entire app shares ONE presence channel.
let channel: ReturnType<typeof supabase.channel> | null = null;
let currentUserId: string | null = null;
let onlineIds: Set<string> = new Set();
const listeners = new Set<(ids: Set<string>) => void>();
let heartbeat: ReturnType<typeof setInterval> | null = null;
let lifecycleBound = false;

const emit = () => {
  const snapshot = new Set(onlineIds);
  listeners.forEach(l => l(snapshot));
};

const track = async () => {
  if (!channel) return;
  try { await channel.track({ online_at: new Date().toISOString() }); } catch {}
};

const bindLifecycle = () => {
  if (lifecycleBound || typeof window === 'undefined') return;
  lifecycleBound = true;
  // Re-announce presence when the tab comes back (mobile browsers freeze sockets)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && currentUserId) {
      ensureChannel(currentUserId);
      void track();
    }
  });
  window.addEventListener('online', () => {
    if (currentUserId) { ensureChannel(currentUserId); void track(); }
  });
  // Leave cleanly so others stop seeing a stale green dot
  window.addEventListener('pagehide', () => { try { channel?.untrack(); } catch {} });
};

const ensureChannel = (userId: string) => {
  if (channel && currentUserId === userId && (channel as any).state === 'joined') return;
  if (channel && currentUserId === userId && (channel as any).state === 'joining') return;
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
  currentUserId = userId;
  bindLifecycle();
  const ch = supabase.channel('presence:global', {
    config: { presence: { key: userId } },
  });
  ch.on('presence', { event: 'sync' }, () => {
    const state = ch.presenceState() as Record<string, unknown[]>;
    onlineIds = new Set(Object.keys(state));
    emit();
  });
  ch.on('presence', { event: 'join' }, () => {
    onlineIds = new Set(Object.keys(ch.presenceState() as Record<string, unknown[]>));
    emit();
  });
  ch.on('presence', { event: 'leave' }, () => {
    onlineIds = new Set(Object.keys(ch.presenceState() as Record<string, unknown[]>));
    emit();
  });
  ch.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await track();
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      // Drop the dead channel so the next tick rebuilds it
      if (channel === ch) {
        supabase.removeChannel(ch);
        channel = null;
      }
    }
  });
  channel = ch;
  if (!heartbeat) {
    heartbeat = setInterval(() => {
      if (!currentUserId) return;
      ensureChannel(currentUserId);
      void track();
    }, 30_000);
  }
};

/** Stop broadcasting presence (call on sign out). */
export const leavePresence = async () => {
  if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
  if (channel) {
    try { await channel.untrack(); } catch {}
    supabase.removeChannel(channel);
    channel = null;
  }
  currentUserId = null;
  onlineIds = new Set();
  emit();
};

/** Registers the current user as online and returns the live set of online user ids. */
export const usePresence = (userId: string | null | undefined): Set<string> => {
  const [ids, setIds] = useState<Set<string>>(() => new Set(onlineIds));

  useEffect(() => {
    if (!userId) return;
    ensureChannel(userId);
    listeners.add(setIds);
    setIds(new Set(onlineIds));
    return () => {
      listeners.delete(setIds);
    };
  }, [userId]);

  return ids;
};

/** Read-only presence subscription — does NOT alter tracking. */
export const useOnlineUsers = (): Set<string> => {
  const [ids, setIds] = useState<Set<string>>(() => new Set(onlineIds));
  useEffect(() => {
    listeners.add(setIds);
    setIds(new Set(onlineIds));
    return () => { listeners.delete(setIds); };
  }, []);
  return ids;
};

/** Small green dot overlay for avatars. */
export const OnlineDot = ({ online, className = '' }: { online: boolean; className?: string }) => {
  if (!online) return null;
  return (
    <span
      aria-label="Online"
      className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background ${className}`}
    />
  );
};