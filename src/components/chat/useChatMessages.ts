import { useState, useEffect, useCallback } from 'react';
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
      
      // Load profiles for new messages
      const uniqueIds = Array.from(new Set(msgs.map(m => m.user_id)));
      const newIds = uniqueIds.filter(id => !(id in profilesMap));
      
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
    }
    
    setIsLoading(false);
    setLoadingMore(false);
  }, [contextType, contextId, profilesMap, toast]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadMessages(messages.length, true);
    }
  }, [loadMessages, messages.length, loadingMore, hasMore]);

  // Subscribe to realtime updates
  useEffect(() => {
    loadMessages();
    
    const channelName = contextId 
      ? `chat:${contextType}:${contextId}` 
      : `chat:${contextType}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: contextId 
            ? `context_type=eq.${contextType},context_id=eq.${contextId}`
            : `context_type=eq.${contextType},context_id=is.null`,
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          // Check if this is our optimistic message
          setMessages(prev => {
            const existingIndex = prev.findIndex(m => m.id === newMessage.id);
            if (existingIndex >= 0) {
              // Replace optimistic message with real one
              const updated = [...prev];
              updated[existingIndex] = { ...newMessage, pending: false, failed: false };
              return updated;
            }
            return [...prev, newMessage];
          });

          // Load profile if needed
          const uid = newMessage.user_id;
          if (!(uid in profilesMap)) {
            const { data: prof } = await (supabase as any)
              .from('profiles')
              .select('id, full_name')
              .eq('id', uid)
              .single();
            if (prof) {
              setProfilesMap(prev => ({ ...prev, [prof.id]: prof.full_name }));
            }
          }
        }
      )
      .subscribe();

    return () => {
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
