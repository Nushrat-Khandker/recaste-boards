import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, Loader2, Search, X } from 'lucide-react';
import { useChatMessages } from './useChatMessages';
import { useMediaRecording } from './useMediaRecording';
import { useReactions } from './useReactions';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInput } from './ChatInput';
import { RecordingPreview } from './RecordingPreview';
import { ChatMessage, ChatUser, MAX_FILE_SIZE } from './types';
import { CHAT_UPLOAD_BUCKET, createChatStoragePath, DB_WRITE_TIMEOUT_MS, uploadFileToStorage, withTimeout } from './uploadUtils';
import { format, isToday, isYesterday } from 'date-fns';

interface ChatViewProps {
  contextType: 'board' | 'project' | 'general';
  contextId?: string;
  boardName?: string;
}

// Group messages by date
const getDateLabel = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
};

export const ChatView = ({ contextType, contextId, boardName }: ChatViewProps) => {
  const actualContextId = contextId || boardName || null;
  const actualContextType = contextType;

  const {
    messages, profilesMap, isLoading, hasMore, loadingMore,
    loadMore, addOptimisticMessage, updateMessage, removeMessage,
  } = useChatMessages({ contextType: actualContextType, contextId: actualContextId });

  const {
    isRecording, recordingType, recordedBlob,
    startRecording, stopRecording, clearRecording, getRecordingExtension,
  } = useMediaRecording();

  const [isDragging, setIsDragging] = useState(false);
  const [allUsers, setAllUsers] = useState<ChatUser[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const hasScrolledInitialRef = useRef(false);

  const scrollToBottom = useCallback((instant = false) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (instant) {
      container.scrollTop = container.scrollHeight;
    } else {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  // On initial load, scroll to bottom after messages are rendered (isLoading must be false)
  useEffect(() => {
    if (isLoading || messages.length === 0) return;

    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      hasScrolledInitialRef.current = false;
      
      const doScroll = () => {
        scrollToBottom(true);
        hasScrolledInitialRef.current = true;
      };

      // Multiple attempts to handle layout shifts from images/media
      doScroll();
      requestAnimationFrame(doScroll);
      requestAnimationFrame(() => requestAnimationFrame(doScroll));
      setTimeout(doScroll, 100);
      setTimeout(doScroll, 300);
      setTimeout(doScroll, 600);
    } else if (hasScrolledInitialRef.current) {
      scrollToBottom();
    }
  }, [messages, isLoading, scrollToBottom]);
  useEffect(() => { loadUsers(); getCurrentUser(); }, []);
  useEffect(() => { isInitialLoadRef.current = true; }, [actualContextType, actualContextId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadUsers = async () => {
    try {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('id, full_name')
        .not('full_name', 'is', null);
      if (data) {
        setAllUsers(data.map((u: any) => ({ id: u.id, name: u.full_name || 'Unknown' })));
      }
    } catch (e) {
      console.warn('Failed to load users:', e);
    }
  };

  const sendMessage = async (content: string, mentionedUserIds: string[], replyToId?: string) => {
    if (!content.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in to send messages', variant: 'destructive' });
      return;
    }

    // Convert @Name mentions back to @[Name](id) format for storage/rendering
    let formattedContent = content;
    for (const userId of mentionedUserIds) {
      const mentionedUser = allUsers.find(u => u.id === userId);
      if (mentionedUser) {
        formattedContent = formattedContent.replace(
          new RegExp(`@${mentionedUser.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`, 'g'),
          `@[${mentionedUser.name}](${userId})`
        );
      }
    }

    setIsSending(true);
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId, content: formattedContent, message_type: 'text', file_url: null, file_name: null,
      created_at: new Date().toISOString(), user_id: user.id, reply_to: replyToId || null, pending: true,
    };
    addOptimisticMessage(optimisticMessage);
    setReplyingTo(null);

    const { data, error } = await (supabase as any).from('chat_messages').insert({
      board_name: actualContextId, context_type: actualContextType, context_id: actualContextId,
      user_id: user.id, content: formattedContent, message_type: 'text', mentioned_users: mentionedUserIds,
      reply_to: replyToId || null,
    }).select().single();

    if (error) {
      console.error('Failed to send message:', error, JSON.stringify(error));
      updateMessage(tempId, { failed: true, pending: false });
      toast({ title: 'Error', description: `Failed to send message: ${error.message || error.details || error.code || 'Unknown error'}`, variant: 'destructive' });
    } else if (data) {
      updateMessage(tempId, { ...data, pending: false, failed: false });
      
      // Send push notification to all other users (fire and forget)
      const senderProfile = allUsers.find(u => u.id === user.id);
      supabase.functions.invoke('push-notifications', {
        body: {
          action: 'broadcast',
          senderId: user.id,
          senderName: senderProfile?.name || 'Someone',
          messageContent: formattedContent,
          contextType: actualContextType,
          contextId: actualContextId,
        },
      }).catch((e: any) => console.warn('Push broadcast failed:', e));
    }
    setIsSending(false);
  };

  const retryMessage = async (message: ChatMessage) => {
    if (!message.content) return;
    removeMessage(message.id);
    await sendMessage(message.content, [], message.reply_to || undefined);
  };

  const handleFileUpload = async (files: FileList) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: 'Error', description: 'You must be logged in', variant: 'destructive' }); return; }
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) { toast({ title: 'File too large', description: `${file.name} exceeds 50MB limit`, variant: 'destructive' }); continue; }
      try {
        setUploadProgress(0);
        const fileName = createChatStoragePath(actualContextType, actualContextId, file.name);
        await uploadFileToStorage(CHAT_UPLOAD_BUCKET, fileName, file, (p) => setUploadProgress(p));
        setUploadProgress(97);
        const { data: { publicUrl } } = supabase.storage.from(CHAT_UPLOAD_BUCKET).getPublicUrl(fileName);
        const { error: dbError } = await withTimeout((supabase as any).from('chat_messages').insert({
          board_name: actualContextId, context_type: actualContextType, context_id: actualContextId,
          user_id: user.id, message_type: 'file', file_url: publicUrl, file_name: file.name,
        }), DB_WRITE_TIMEOUT_MS, 'Upload succeeded, but saving the chat attachment timed out.');
        if (dbError) throw dbError;
        setUploadProgress(100);
        setTimeout(() => setUploadProgress(null), 500);
        toast({ title: 'Success', description: `${file.name} uploaded` });
        
        // Send push notification for file upload
        const senderProfile = allUsers.find(u => u.id === user.id);
        supabase.functions.invoke('push-notifications', {
          body: {
            action: 'broadcast',
            senderId: user.id,
            senderName: senderProfile?.name || 'Someone',
            messageContent: `📎 ${file.name}`,
            contextType: actualContextType,
            contextId: actualContextId,
          },
        }).catch((e: any) => console.warn('Push broadcast failed:', e));
      } catch (error: any) {
        setUploadProgress(null);
        toast({ title: 'Upload Failed', description: error?.message || `Failed to upload ${file.name}`, variant: 'destructive' });
      }
    }
  };

  const sendRecording = async () => {
    if (!recordedBlob || !recordingType) return;
    const ext = getRecordingExtension();
    const file = new File([recordedBlob], `${recordingType}-${Date.now()}.${ext}`, { type: recordedBlob.type });
    const dt = new DataTransfer(); dt.items.add(file);
    await handleFileUpload(dt.files);
    clearRecording();
  };

  const deleteMessage = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message?.pending || message?.failed) { removeMessage(messageId); return; }
    const { error } = await (supabase as any).from('chat_messages').delete().eq('id', messageId).eq('user_id', currentUserId);
    if (error) { toast({ title: 'Error', description: 'Failed to delete message', variant: 'destructive' }); }
    else { removeMessage(messageId); }
  };

  const startEditMessage = (message: ChatMessage) => { setEditingMessageId(message.id); setEditContent(message.content || ''); };

  const saveEditMessage = async (messageId: string, content: string) => {
    if (!content.trim()) return;
    const { error } = await (supabase as any).from('chat_messages').update({ content }).eq('id', messageId);
    if (error) { toast({ title: 'Error', description: 'Failed to update message', variant: 'destructive' }); }
    else { updateMessage(messageId, { content }); setEditingMessageId(null); }
  };

  const handleReply = (message: ChatMessage) => { setReplyingTo(message); };

  const getContextLabel = () => {
    if (actualContextType === 'general') return 'General Chat';
    if (actualContextType === 'project') return actualContextId || 'Project';
    return actualContextId || 'Board';
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = async (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); await handleFileUpload(e.dataTransfer.files); };

  // Build a map of message id -> message for reply lookups
  const messagesById = new Map(messages.map(m => [m.id, m]));
  const messageIds = messages.filter(m => !m.pending && !m.failed).map(m => m.id);
  const { reactionsMap, toggleReaction } = useReactions(messageIds);

  // Filter messages by search
  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()) || m.file_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  // Group messages by date
  const groupedMessages: { label: string; msgs: ChatMessage[] }[] = [];
  let lastLabel = '';
  for (const msg of filteredMessages) {
    const label = getDateLabel(msg.created_at);
    if (label !== lastLabel) {
      groupedMessages.push({ label, msgs: [msg] });
      lastLabel = label;
    } else {
      groupedMessages[groupedMessages.length - 1].msgs.push(msg);
    }
  }

  return (
    <div
      className="flex flex-col h-[calc(100vh-200px)] bg-[hsl(35,30%,95%)] dark:bg-[hsl(30,10%,15%)] rounded-xl overflow-hidden border"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Search bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-background/50">
        {isSearchOpen ? (
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="ml-auto h-8 px-2" onClick={() => setIsSearchOpen(true)}>
            <Search className="h-4 w-4 mr-1" />
            <span className="text-xs">Search</span>
          </Button>
        )}
      </div>

      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary z-50 flex items-center justify-center rounded-xl">
          <div className="text-center">
            <Paperclip className="h-12 w-12 mx-auto mb-2 text-primary" />
            <p className="text-lg font-medium">Drop files to upload (max 50MB)</p>
          </div>
        </div>
      )}

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {hasMore && !isLoading && (
          <div className="text-center py-2">
            <Button variant="ghost" size="sm" onClick={loadMore} disabled={loadingMore} className="rounded-full text-xs">
              {loadingMore ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Loading...</> : 'Load older messages'}
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <p className="text-lg mb-1">💬</p>
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.label}>
              <div className="flex justify-center my-3">
                <span className="text-[11px] bg-muted/80 text-muted-foreground px-3 py-1 rounded-full font-medium shadow-sm">
                  {group.label}
                </span>
              </div>
              <div className="space-y-1.5">
                {group.msgs.map((message) => {
                  const replyMsg = message.reply_to ? messagesById.get(message.reply_to) || null : null;
                  const replyUserName = replyMsg ? (profilesMap[replyMsg.user_id] || 'Unknown') : undefined;
                  return (
                    <ChatMessageItem
                      key={message.id}
                      message={message}
                      userName={profilesMap[message.user_id] || message.profiles?.full_name || message.user_id.slice(0, 8)}
                      currentUserId={currentUserId}
                      onEdit={startEditMessage}
                      onDelete={deleteMessage}
                      onRetry={retryMessage}
                      onSaveEdit={saveEditMessage}
                      onReply={handleReply}
                      isEditing={editingMessageId === message.id}
                      editContent={editContent}
                      setEditContent={setEditContent}
                      onCancelEdit={() => setEditingMessageId(null)}
                      replyToMessage={replyMsg}
                      replyToUserName={replyUserName}
                      profilesMap={profilesMap}
                      reactions={reactionsMap[message.id] || []}
                      onToggleReaction={toggleReaction}
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {recordedBlob && recordingType && (
        <RecordingPreview recordedBlob={recordedBlob} recordingType={recordingType} onSend={sendRecording} onCancel={clearRecording} />
      )}

      <ChatInput
        onSendMessage={sendMessage}
        onFileUpload={handleFileUpload}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        isRecording={isRecording}
        recordingType={recordingType}
        isLoading={isSending}
        uploadProgress={uploadProgress}
        allUsers={allUsers}
        contextLabel={getContextLabel()}
        replyingTo={replyingTo}
        replyingToUserName={replyingTo ? (profilesMap[replyingTo.user_id] || 'Unknown') : null}
        onCancelReply={() => setReplyingTo(null)}
      />
    </div>
  );
};
