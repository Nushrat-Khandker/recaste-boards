import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { ChatMessage, ChatContextConfig, MESSAGES_PER_PAGE } from './types';

export const useChatMessages = (config: ChatContextConfig) => {
  const { contextType, contextId } = config;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const { toast } = useToast();

  // Refs to avoid stale closures
  const profilesMapRef = useRef(profilesMap);
  profilesMapRef.current = profilesMap;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const loadProfilesForMessages = useCallback(async (msgs: ChatMessage[]) => {
    const uniqueIds = Array.from(new Set(msgs.map(m => m.user_id)));
    const newIds = uniqueIds.filter(id => !(id in profilesMapRef.current));

    if (newIds.length) {
      const { data: profs } = await (supabase as any)
        .from('profiles')
        .select('id, full_name')
        .in('id', newIds);

      if (profs) {
        const newMap: Record<string, string | null> = {};
        profs.forEach((p: any) => { newMap[p.id] = p.full_name; });
        setProfilesMap(prev => ({ ...prev, ...newMap }));
      }
    }
  }, []);

  const loadMessages = useCallback(async (offset = 0, append = false) => {
    if (offset === 0) {
      setIsLoading(true);
    } else {
      setLoadingMore(true);
    }

    let query = (supabase as any)
      .from('chat_messages')
      .select('*')
      .eq('context_type', contextType);

    if (contextId) {
      query = query.eq('context_id', contextId);
    } else {
      query = query.is('context_id', null);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + MESSAGES_PER_PAGE - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error loading messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    } else {
      const msgs = ((data || []) as ChatMessage[]).reverse();

      if (append) {
        setMessages(prev => [...msgs, ...prev]);
      } else {
        setMessages(msgs);
      }

      setHasMore(data?.length === MESSAGES_PER_PAGE);
      await loadProfilesForMessages(msgs);
    }

    setIsLoading(false);
    setLoadingMore(false);
  }, [contextType, contextId, toast, loadProfilesForMessages]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadMessages(messages.length, true);
    }
  }, [loadMessages, messages.length, loadingMore, hasMore]);

  // Realtime + polling
  useEffect(() => {
    loadMessages();

    let pollInterval = 3000; // Start at 3s for snappy feel
    let pollTimeoutId: ReturnType<typeof setTimeout>;
    let isActive = true;
    let realtimeWorking = false;

    const channelName = contextId
      ? `chat:${contextType}:${contextId}`
      : `chat:${contextType}:general`;

    // Only use filter when contextId exists — avoids CHANNEL_ERROR with null filters
    const subscriptionConfig: any = {
      event: '*',
      schema: 'public',
      table: 'chat_messages',
    };
    if (contextId) {
      subscriptionConfig.filter = `context_id=eq.${contextId}`;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        subscriptionConfig,
        async (payload) => {
          realtimeWorking = true;
          pollInterval = 5000; // Relax polling when realtime works

          const newMsg = payload.new as ChatMessage;

          // For general chat without filter, manually check context_type
          if (!contextId && payload.eventType !== 'DELETE') {
            const msgContextType = (newMsg as any)?.context_type;
            if (msgContextType && msgContextType !== contextType) return;
          }

          if (payload.eventType === 'DELETE') {
            const oldMsg = payload.old as { id: string };
            setMessages(prev => prev.filter(m => m.id !== oldMsg.id));
            return;
          }

          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as ChatMessage;
            setMessages(prev => prev.map(m =>
              m.id === updated.id ? { ...m, ...updated } : m
            ));
            return;
          }

          // INSERT with dedup
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) {
              return prev.map(m =>
                m.id === newMsg.id
                  ? { ...newMsg, pending: false, failed: false }
                  : m
              );
            }
            return [...prev, newMsg];
          });

          await loadProfilesForMessages([newMsg]);
        }
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Realtime channel issue, relying on polling fallback');
          realtimeWorking = false;
          pollInterval = 3000; // Poll faster when realtime is down
        }
        if (status === 'SUBSCRIBED') {
          realtimeWorking = true;
        }
      });

    // Polling fallback
    const poll = async () => {
      if (!isActive) return;

      const currentMessages = messagesRef.current;
      const lastTimestamp = currentMessages.length > 0
        ? currentMessages[currentMessages.length - 1].created_at
        : null;

      if (!lastTimestamp) {
        if (isActive) pollTimeoutId = setTimeout(poll, pollInterval);
        return;
      }

      let query = (supabase as any)
        .from('chat_messages')
        .select('*')
        .eq('context_type', contextType)
        .gt('created_at', lastTimestamp)
        .order('created_at', { ascending: true })
        .limit(50);

      if (contextId) {
        query = query.eq('context_id', contextId);
      } else {
        query = query.is('context_id', null);
      }

      const { data } = await query;

      if (data && data.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs = (data as ChatMessage[]).filter(m => !existingIds.has(m.id));
          return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev;
        });
        await loadProfilesForMessages(data as ChatMessage[]);
        pollInterval = realtimeWorking ? 5000 : 3000;
      } else {
        pollInterval = Math.min(pollInterval * 1.5, realtimeWorking ? 30000 : 10000);
      }

      if (isActive) pollTimeoutId = setTimeout(poll, pollInterval);
    };

    pollTimeoutId = setTimeout(poll, pollInterval);

    return () => {
      isActive = false;
      clearTimeout(pollTimeoutId);
      supabase.removeChannel(channel);
    };
  }, [contextType, contextId]);

  const addOptimisticMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(m =>
      m.id === id ? { ...m, ...updates } : m
    ));
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  return {
    messages,
    setMessages,
    profilesMap,
    isLoading,
    hasMore,
    loadingMore,
    loadMore,
    addOptimisticMessage,
    updateMessage,
    removeMessage,
  };
};
