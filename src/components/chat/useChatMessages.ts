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

  // Use ref for profilesMap to avoid stale closures (Step 4)
  const profilesMapRef = useRef(profilesMap);
  profilesMapRef.current = profilesMap;

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
  }, []); // No profilesMap dependency - uses ref instead

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
  }, [contextType, contextId, toast, loadProfilesForMessages]); // No profilesMap dependency (Step 4)

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadMessages(messages.length, true);
    }
  }, [loadMessages, messages.length, loadingMore, hasMore]);

  // Realtime subscription + fallback polling (Steps 1, 2, 5)
  useEffect(() => {
    loadMessages();

    const channelName = contextId
      ? `chat:${contextType}:${contextId}`
      : `chat:${contextType}`;

    // Build filter - Step 5: avoid unreliable is.null filter
    const filter = contextId
      ? `context_type=eq.${contextType},context_id=eq.${contextId}`
      : `context_type=eq.${contextType}`;

    let pollInterval = 5000;
    let pollTimeoutId: ReturnType<typeof setTimeout>;
    let isActive = true;

    // Step 2: Listen for ALL events (INSERT, UPDATE, DELETE)
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // All events instead of just INSERT
          schema: 'public',
          table: 'chat_messages',
          filter,
        },
        async (payload) => {
          // Reset poll interval when realtime works (Step 1)
          pollInterval = 5000;

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

          // INSERT - Step 3: dedup check
          const newMessage = payload.new as ChatMessage;
          setMessages(prev => {
            // Check if already exists (dedup)
            if (prev.some(m => m.id === newMessage.id)) {
              return prev.map(m =>
                m.id === newMessage.id
                  ? { ...newMessage, pending: false, failed: false }
                  : m
              );
            }
            return [...prev, newMessage];
          });

          // Load profile if needed
          await loadProfilesForMessages([newMessage]);
        }
      )
      .subscribe();

    // Step 1: Fallback polling with exponential backoff
    const poll = async () => {
      if (!isActive) return;

      // Get the latest message timestamp from current state
      const currentMessages = messagesRef.current;
      const lastTimestamp = currentMessages.length > 0
        ? currentMessages[currentMessages.length - 1].created_at
        : null;

      if (!lastTimestamp) {
        // No messages yet, skip polling (initial load handles this)
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
        // Merge new messages, deduplicating
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs = (data as ChatMessage[]).filter(m => !existingIds.has(m.id));
          return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev;
        });
        await loadProfilesForMessages(data as ChatMessage[]);
        pollInterval = 5000; // Reset on new data
      } else {
        // Backoff when no changes
        pollInterval = Math.min(pollInterval * 1.5, 30000);
      }

      if (isActive) pollTimeoutId = setTimeout(poll, pollInterval);
    };

    // Start polling after a delay to let realtime connect first
    pollTimeoutId = setTimeout(poll, pollInterval);

    return () => {
      isActive = false;
      clearTimeout(pollTimeoutId);
      supabase.removeChannel(channel);
    };
  }, [contextType, contextId]); // Minimal dependencies

  // Ref to access current messages inside polling without stale closure
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

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
