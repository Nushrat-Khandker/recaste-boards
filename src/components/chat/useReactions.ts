import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Reaction {
  emoji: string;
  users: string[];
}

export const QUICK_EMOJIS = ['👍', '👌', '❤️', '😂', '😮', '😢', '🙏'];

export const useReactions = (messageIds: string[]) => {
  const [reactionsMap, setReactionsMap] = useState<Record<string, Reaction[]>>({});

  const loadReactions = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    const { data } = await (supabase as any)
      .from('chat_reactions')
      .select('message_id, emoji, user_id')
      .in('message_id', ids);

    if (data) {
      const map: Record<string, Record<string, string[]>> = {};
      for (const r of data) {
        if (!map[r.message_id]) map[r.message_id] = {};
        if (!map[r.message_id][r.emoji]) map[r.message_id][r.emoji] = [];
        map[r.message_id][r.emoji].push(r.user_id);
      }
      const result: Record<string, Reaction[]> = {};
      for (const [msgId, emojis] of Object.entries(map)) {
        result[msgId] = Object.entries(emojis).map(([emoji, users]) => ({ emoji, users }));
      }
      setReactionsMap(prev => ({ ...prev, ...result }));
      // Clear reactions for messages that had reactions removed
      for (const id of ids) {
        if (!result[id]) {
          setReactionsMap(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }
      }
    }
  }, []);

  useEffect(() => {
    if (messageIds.length) loadReactions(messageIds);
  }, [messageIds.join(',')]);

  // Realtime subscription for reactions
  useEffect(() => {
    const channel = supabase
      .channel('chat-reactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_reactions' }, () => {
        // Reload all current message reactions on any change
        if (messageIds.length) loadReactions(messageIds);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [messageIds.join(','), loadReactions]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existing = reactionsMap[messageId]?.find(r => r.emoji === emoji);
    const hasReacted = existing?.users.includes(user.id);

    if (hasReacted) {
      // Optimistic removal
      setReactionsMap(prev => {
        const next = { ...prev };
        const reactions = (next[messageId] || []).map(r => {
          if (r.emoji === emoji) {
            return { ...r, users: r.users.filter(uid => uid !== user.id) };
          }
          return r;
        }).filter(r => r.users.length > 0);
        if (reactions.length) next[messageId] = reactions;
        else delete next[messageId];
        return next;
      });

      const { error } = await (supabase as any).from('chat_reactions').delete()
        .eq('message_id', messageId).eq('user_id', user.id).eq('emoji', emoji);
      if (error) {
        console.error('Failed to remove reaction:', error);
        loadReactions([messageId]);
      }
    } else {
      // Optimistic add
      setReactionsMap(prev => {
        const next = { ...prev };
        const reactions = [...(next[messageId] || [])];
        const existingReaction = reactions.find(r => r.emoji === emoji);
        if (existingReaction) {
          existingReaction.users = [...existingReaction.users, user.id];
        } else {
          reactions.push({ emoji, users: [user.id] });
        }
        next[messageId] = reactions;
        return next;
      });

      const { error } = await (supabase as any).from('chat_reactions').insert({
        message_id: messageId, user_id: user.id, emoji,
      });
      if (error) {
        console.error('Failed to add reaction:', error);
        loadReactions([messageId]);
      }
    }
  }, [reactionsMap, loadReactions]);

  return { reactionsMap, toggleReaction };
};
