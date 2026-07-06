import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Module-level singleton so the entire app shares ONE presence channel.
let channel: ReturnType<typeof supabase.channel> | null = null;
let currentUserId: string | null = null;
let onlineIds: Set<string> = new Set();
const listeners = new Set<(ids: Set<string>) => void>();

const emit = () => {
  const snapshot = new Set(onlineIds);
  listeners.forEach(l => l(snapshot));
};

const ensureChannel = (userId: string) => {
  if (channel && currentUserId === userId) return;
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
  currentUserId = userId;
  const ch = supabase.channel('presence:global', {
    config: { presence: { key: userId } },
  });
  ch.on('presence', { event: 'sync' }, () => {
    const state = ch.presenceState() as Record<string, unknown[]>;
    onlineIds = new Set(Object.keys(state));
    emit();
  });
  ch.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await ch.track({ online_at: new Date().toISOString() });
    }
  });
  channel = ch;
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