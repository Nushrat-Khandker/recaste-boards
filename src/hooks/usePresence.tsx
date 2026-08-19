import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Module-level singleton so the entire app shares ONE presence channel.
let channel: ReturnType<typeof supabase.channel> | null = null;
let currentUserId: string | null = null;
let onlineIds: Set<string> = new Set();
/** userId -> last announced timestamp (ms). Used to expire stale presence entries. */
let lastSeenMap: Map<string, number> = new Map();
const STALE_MS = 75_000;
const listeners = new Set<(ids: Set<string>) => void>();
let heartbeat: ReturnType<typeof setInterval> | null = null;
let sweeper: ReturnType<typeof setInterval> | null = null;
let lifecycleBound = false;

const emit = () => {
  const snapshot = new Set(onlineIds);
  listeners.forEach(l => l(snapshot));
};

/** Rebuild the online set from presence state, dropping entries whose heartbeat went stale. */
const recompute = (state: Record<string, any[]>) => {
  const now = Date.now();
  const next = new Set<string>();
  Object.entries(state).forEach(([userId, metas]) => {
    const stamps = (metas || [])
      .map(m => Date.parse(m?.online_at ?? ''))
      .filter(n => !Number.isNaN(n));
    const latest = stamps.length ? Math.max(...stamps) : lastSeenMap.get(userId) ?? 0;
    if (latest) lastSeenMap.set(userId, latest);
    const seen = lastSeenMap.get(userId) ?? 0;
    if (seen && now - seen < STALE_MS) next.add(userId);
  });
  // forget users no longer in presence state at all
  Array.from(lastSeenMap.keys()).forEach(id => {
    if (!(id in state)) lastSeenMap.delete(id);
  });
  onlineIds = next;
  emit();
};

const track = async () => {
  if (!channel) return;
  try {
    const stamp = new Date().toISOString();
    if (currentUserId) lastSeenMap.set(currentUserId, Date.parse(stamp));
    await channel.track({ online_at: stamp });
  } catch {}
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
    recompute(ch.presenceState() as Record<string, any[]>);
  });
  ch.on('presence', { event: 'join' }, () => {
    recompute(ch.presenceState() as Record<string, any[]>);
  });
  ch.on('presence', { event: 'leave' }, ({ key }: any) => {
    if (key) lastSeenMap.delete(key);
    recompute(ch.presenceState() as Record<string, any[]>);
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
  if (!sweeper) {
    // Expire stale dots even when no presence event arrives
    sweeper = setInterval(() => {
      if (channel) recompute((channel as any).presenceState() as Record<string, any[]>);
    }, 15_000);
  }
};

/** Stop broadcasting presence (call on sign out). */
export const leavePresence = async () => {
  if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
  if (sweeper) { clearInterval(sweeper); sweeper = null; }
  if (channel) {
    try { await channel.untrack(); } catch {}
    supabase.removeChannel(channel);
    channel = null;
  }
  currentUserId = null;
  onlineIds = new Set();
  lastSeenMap = new Map();
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