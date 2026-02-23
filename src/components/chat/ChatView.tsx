import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Paperclip, Loader2 } from 'lucide-react';
import { useChatMessages } from './useChatMessages';
import { useMediaRecording } from './useMediaRecording';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInput } from './ChatInput';
import { RecordingPreview } from './RecordingPreview';
import { ChatMessage, ChatUser, MAX_FILE_SIZE } from './types';

interface ChatViewProps {
  contextType: 'board' | 'project' | 'general';
  contextId?: string;
  boardName?: string; // Deprecated, for backward compatibility
}

export const ChatView = ({ contextType, contextId, boardName }: ChatViewProps) => {
  const actualContextId = contextId || boardName || null;
  const actualContextType = contextType;

  const {
    messages,
    profilesMap,
    isLoading,
    hasMore,
    loadingMore,
    loadMore,
    addOptimisticMessage,
    updateMessage,
    removeMessage,
  } = useChatMessages({ contextType: actualContextType, contextId: actualContextId });

  const {
    isRecording,
    recordingType,
    recordedBlob,
    startRecording,
    stopRecording,
    clearRecording,
  } = useMediaRecording();

  const [isDragging, setIsDragging] = useState(false);
  const [allUsers, setAllUsers] = useState<ChatUser[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadUsers();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadUsers = async () => {
    const { data } = await (supabase as any)
      .from('profiles')
      .select('id, full_name');
    
    if (data) {
      setAllUsers(data.map((u: any) => ({ id: u.id, name: u.full_name || 'Unknown' })));
    }
  };

  const sendMessage = async (content: string, mentionedUserIds: string[]) => {
    if (!content.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to send messages',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    // Create optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      content,
      message_type: 'text',
      file_url: null,
      file_name: null,
      created_at: new Date().toISOString(),
      user_id: user.id,
      pending: true,
    };

    addOptimisticMessage(optimisticMessage);

    const { data, error } = await (supabase as any).from('chat_messages').insert({
      board_name: actualContextId,
      context_type: actualContextType,
      context_id: actualContextId,
      user_id: user.id,
      content,
      message_type: 'text',
      mentioned_users: mentionedUserIds,
    }).select().single();

    if (error) {
      console.error('Error sending message:', error);
      updateMessage(tempId, { failed: true, pending: false });
      toast({
        title: 'Error',
        description: 'Failed to send message. Click retry to try again.',
        variant: 'destructive',
      });
    } else if (data) {
      // Step 3: Replace temp message with real server response immediately
      // This prevents duplicates when Realtime INSERT also arrives
      updateMessage(tempId, { ...data, pending: false, failed: false });
    }
    
    setIsSending(false);
  };

  const retryMessage = async (message: ChatMessage) => {
    if (!message.content) return;
    removeMessage(message.id);
    await sendMessage(message.content, []);
  };

  const uploadFileWithProgress = useCallback((
    bucket: string,
    path: string,
    file: File,
    onProgress: (percent: number) => void,
  ): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return reject(new Error('Not authenticated'));

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const url = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;

      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      xhr.setRequestHeader('x-upsert', 'false');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 95)); // 0-95% for upload
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          try {
            const resp = JSON.parse(xhr.responseText);
            reject(new Error(resp.message || resp.error || `Upload failed (${xhr.status})`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.ontimeout = () => reject(new Error('Upload timed out'));
      xhr.timeout = 600000; // 10 min timeout for large files

      xhr.send(file);
    });
  }, []);

  const handleFileUpload = async (files: FileList) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to upload files',
        variant: 'destructive',
      });
      return;
    }

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds the 200MB limit`,
          variant: 'destructive',
        });
        continue;
      }

      try {
        setUploadProgress(0);
        const fileName = `${actualContextType}/${actualContextId || 'general'}/${Date.now()}-${file.name}`;

        await uploadFileWithProgress('board-files', fileName, file, (percent) => {
          setUploadProgress(percent);
        });

        setUploadProgress(97);

        const { data: { publicUrl } } = supabase.storage
          .from('board-files')
          .getPublicUrl(fileName);

        const { error: dbError } = await (supabase as any).from('chat_messages').insert({
          board_name: actualContextId,
          context_type: actualContextType,
          context_id: actualContextId,
          user_id: user.id,
          message_type: 'file',
          file_url: publicUrl,
          file_name: file.name,
        });

        if (dbError) throw dbError;

        setUploadProgress(100);
        setTimeout(() => setUploadProgress(null), 500);

        toast({
          title: 'Success',
          description: `${file.name} uploaded successfully`,
        });
      } catch (error: any) {
        console.error('Error uploading file:', error);
        setUploadProgress(null);
        const errorMsg = error?.message || `Failed to upload ${file.name}`;
        toast({
          title: 'Upload Failed',
          description: errorMsg,
          variant: 'destructive',
        });
      }
    }
  };

  const sendRecording = async () => {
    if (!recordedBlob || !recordingType) return;

    const file = new File(
      [recordedBlob],
      `${recordingType}-${Date.now()}.webm`,
      { type: recordedBlob.type }
    );
    
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    await handleFileUpload(dataTransfer.files);
    
    clearRecording();
  };

  const deleteMessage = async (messageId: string) => {
    // Handle optimistic/failed messages
    const message = messages.find(m => m.id === messageId);
    if (message?.pending || message?.failed) {
      removeMessage(messageId);
      return;
    }

    const { error } = await (supabase as any)
      .from('chat_messages')
      .delete()
      .eq('id', messageId)
      .eq('user_id', currentUserId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive',
      });
    } else {
      removeMessage(messageId);
      toast({
        title: 'Success',
        description: 'Message deleted',
      });
    }
  };

  const startEditMessage = (message: ChatMessage) => {
    setEditingMessageId(message.id);
    setEditContent(message.content || '');
  };

  const saveEditMessage = async (messageId: string, content: string) => {
    if (!content.trim()) return;

    const { error } = await (supabase as any)
      .from('chat_messages')
      .update({ content })
      .eq('id', messageId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update message',
        variant: 'destructive',
      });
    } else {
      updateMessage(messageId, { content });
      setEditingMessageId(null);
      toast({
        title: 'Success',
        description: 'Message updated',
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    await handleFileUpload(e.dataTransfer.files);
  };

  const getContextLabel = () => {
    if (actualContextType === 'general') return 'General Chat';
    if (actualContextType === 'project') return actualContextId || 'Project';
    return actualContextId || 'Board';
  };

  return (
    <div
      className="flex flex-col h-[calc(100vh-200px)]"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary z-50 flex items-center justify-center">
          <div className="text-center">
            <Paperclip className="h-12 w-12 mx-auto mb-2 text-primary" />
            <p className="text-lg font-medium">Drop files to upload (max 200MB)</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {hasMore && !isLoading && (
          <div className="text-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load older messages'
              )}
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessageItem
              key={message.id}
              message={message}
              userName={profilesMap[message.user_id] || message.profiles?.full_name || message.user_id.slice(0, 8)}
              currentUserId={currentUserId}
              onEdit={startEditMessage}
              onDelete={deleteMessage}
              onRetry={retryMessage}
              onSaveEdit={saveEditMessage}
              isEditing={editingMessageId === message.id}
              editContent={editContent}
              setEditContent={setEditContent}
              onCancelEdit={() => setEditingMessageId(null)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {recordedBlob && recordingType && (
        <RecordingPreview
          recordedBlob={recordedBlob}
          recordingType={recordingType}
          onSend={sendRecording}
          onCancel={clearRecording}
        />
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
      />
    </div>
  );
};
