import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Tracks read state for a chat context.
 * - Marks the current context as read for the current user (on mount, new messages, tab focus)
 * - Returns the newest time ANY other participant read this context, so own messages
 *   can be shown as "seen" (blue double check) once created_at <= that time.
 */
export const useReadReceipts = (
  contextType: string,
  contextId: string | null,
  currentUserId: string | null,
  lastMessageAt?: string | null,
) => {
  const [othersLastReadAt, setOthersLastReadAt] = useState<string | null>(null);
  const markingRef = useRef(false);

  const fetchOthers = useCallback(async () => {
    if (!currentUserId) return;
    let q = (supabase as any)
      .from('chat_read_state')
      .select('user_id, last_read_at')
      .eq('context_type', contextType)
      .neq('user_id', currentUserId)
      .order('last_read_at', { ascending: false })
      .limit(1);
    q = contextId ? q.eq('context_id', contextId) : q.is('context_id', null);
    const { data } = await q;
    setOthersLastReadAt(data?.[0]?.last_read_at ?? null);
  }, [contextType, contextId, currentUserId]);

  const markRead = useCallback(async () => {
    if (!currentUserId || markingRef.current) return;
    markingRef.current = true;
    try {
      await (supabase as any).from('chat_read_state').upsert(
        {
          user_id: currentUserId,
          context_type: contextType,
          context_id: contextId,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,context_type,context_id' },
      );
    } catch {
      /* ignore */
    } finally {
      markingRef.current = false;
    }
  }, [contextType, contextId, currentUserId]);

  // Mark read on mount / context change / new message, and refresh others' state
  useEffect(() => {
    if (!currentUserId) return;
    if (document.visibilityState === 'visible') void markRead();
    void fetchOthers();
  }, [currentUserId, markRead, fetchOthers, lastMessageAt]);

  // Re-mark when the tab regains focus
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        void markRead();
        void fetchOthers();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
    };
  }, [markRead, fetchOthers]);

  // Live updates when others read the conversation
  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel(`read-state:${contextType}:${contextId ?? 'none'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_read_state' },
        (payload: any) => {
          const row = payload.new || payload.old;
          if (!row) return;
          if (row.context_type !== contextType) return;
          if ((row.context_id ?? null) !== (contextId ?? null)) return;
          if (row.user_id === currentUserId) return;
          void fetchOthers();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [contextType, contextId, currentUserId, fetchOthers]);

  return { othersLastReadAt, markRead };
};
