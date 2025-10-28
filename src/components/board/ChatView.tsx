import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Send, Paperclip, Mic, Video, Square, Plus, Smile, AtSign, Code, Image as ImageIcon, Trash2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  content: string | null;
  message_type: string;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string | null;
  };
}

interface ChatViewProps {
  contextType: 'board' | 'project' | 'general';
  contextId?: string;
  boardName?: string; // Deprecated, for backward compatibility
}

export const ChatView = ({ contextType, contextId, boardName }: ChatViewProps) => {
  // Use contextId if provided, otherwise fall back to boardName for backward compatibility
  const actualContextId = contextId || boardName || null;
  const actualContextType = contextType;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<'audio' | 'video' | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [profilesMap, setProfilesMap] = useState<Record<string, string | null>>({});
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string }>>([]);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadMessages();
    loadUsers();
    
    // Subscribe to new messages
    const channelName = actualContextId 
      ? `chat:${actualContextType}:${actualContextId}` 
      : `chat:${actualContextType}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: actualContextId 
            ? `context_type=eq.${actualContextType},context_id=eq.${actualContextId}`
            : `context_type=eq.${actualContextType},context_id=is.null`,
        },
        async (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
          const uid = (payload.new as any).user_id as string;
          if (!(uid in profilesMap)) {
            const { data: prof } = await (supabase as any)
              .from('profiles')
              .select('id, full_name')
              .eq('id', uid)
              .single();
            if (prof) {
              setProfilesMap((prev) => ({ ...prev, [prof.id]: prof.full_name }));
            }
          }
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [actualContextType, actualContextId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadUsers = async () => {
    const { data } = await (supabase as any)
      .from('profiles')
      .select('id, full_name');
    
    if (data) {
      setAllUsers(data.map((u: any) => ({ id: u.id, name: u.full_name || 'Unknown' })));
    }
  };

  const loadMessages = async () => {
    let query = (supabase as any)
      .from('chat_messages')
      .select('*')
      .eq('context_type', actualContextType);
    
    if (actualContextId) {
      query = query.eq('context_id', actualContextId);
    } else {
      query = query.is('context_id', null);
    }
    
    query = query.order('created_at', { ascending: true });
    
    const { data, error } = await query;

    if (error) {
      console.error('Error loading messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    } else {
      const msgs = (data || []) as ChatMessage[];
      setMessages(msgs);
      const uniqueIds = Array.from(new Set(msgs.map(m => m.user_id)));
      if (uniqueIds.length) {
        const { data: profs } = await (supabase as any)
          .from('profiles')
          .select('id, full_name')
          .in('id', uniqueIds);
        const map: Record<string, string | null> = {};
        (profs || []).forEach((p: any) => { map[p.id] = p.full_name; });
        setProfilesMap(map);
      }
    }
  };

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[2]); // Extract user ID
    }
    return mentions;
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to send messages',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const mentionedUserIds = extractMentions(newMessage);

    const { error } = await (supabase as any).from('chat_messages').insert({
      board_name: actualContextId, // Keep for backward compatibility
      context_type: actualContextType,
      context_id: actualContextId,
      user_id: user.id,
      content: newMessage,
      message_type: 'text',
      mentioned_users: mentionedUserIds,
    });

    if (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } else {
      setNewMessage('');
    }
    
    setIsLoading(false);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to upload files',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    for (const file of Array.from(files)) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${actualContextType}/${actualContextId || 'general'}/${Date.now()}-${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('board-files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('board-files')
          .getPublicUrl(fileName);

        const { error: dbError } = await (supabase as any).from('chat_messages').insert({
          board_name: actualContextId, // Keep for backward compatibility
          context_type: actualContextType,
          context_id: actualContextId,
          user_id: user.id,
          message_type: 'file',
          file_url: publicUrl,
          file_name: file.name,
        });

        if (dbError) throw dbError;

        toast({
          title: 'Success',
          description: `${file.name} uploaded successfully`,
        });
      } catch (error) {
        console.error('Error uploading file:', error);
        toast({
          title: 'Error',
          description: `Failed to upload ${file.name}`,
          variant: 'destructive',
        });
      }
    }

    setIsLoading(false);
  };

  const startRecording = async (type: 'audio' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: type === 'video' ? 'video/webm' : 'audio/webm',
        });
        
        stream.getTracks().forEach(track => track.stop());
        setRecordedBlob(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingType(type);

      toast({
        title: 'Recording started',
        description: `${type === 'video' ? 'Video' : 'Audio'} recording in progress`,
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Error',
        description: 'Failed to start recording. Please check your permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
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
    
    setRecordedBlob(null);
    setRecordingType(null);
  };

  const cancelRecording = () => {
    setRecordedBlob(null);
    setRecordingType(null);
  };

  const deleteMessage = async (messageId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await (supabase as any)
      .from('chat_messages')
      .delete()
      .eq('id', messageId)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive',
      });
    } else {
      setMessages(prev => prev.filter(m => m.id !== messageId));
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

  const saveEditMessage = async (messageId: string) => {
    if (!editContent.trim()) return;

    const { error } = await (supabase as any)
      .from('chat_messages')
      .update({ content: editContent })
      .eq('id', messageId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update message',
        variant: 'destructive',
      });
    } else {
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, content: editContent } : m
      ));
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

  const insertMention = (user: { id: string; name: string }) => {
    const beforeCursor = newMessage.substring(0, newMessage.lastIndexOf('@'));
    const afterCursor = newMessage.substring(newMessage.length);
    setNewMessage(`${beforeCursor}@[${user.name}](${user.id}) ${afterCursor}`);
    setShowMentionPicker(false);
    setMentionQuery('');
  };

  const handleMessageChange = (text: string) => {
    setNewMessage(text);
    
    // Check for @ mentions
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const afterAt = text.substring(lastAtIndex + 1);
      if (!afterAt.includes(' ') && !afterAt.includes(']')) {
        setMentionQuery(afterAt);
        setShowMentionPicker(true);
      } else {
        setShowMentionPicker(false);
      }
    } else {
      setShowMentionPicker(false);
    }
  };

  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

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
            <p className="text-lg font-medium">Drop files to upload</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages.map((message) => (
            <Card 
              key={message.id} 
              className="p-3 group relative"
              onMouseEnter={() => setHoveredMessageId(message.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {profilesMap[message.user_id] || message.profiles?.full_name || message.user_id.slice(0, 8)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(message.created_at), 'MMM d, HH:mm')}
                    </span>
                    {hoveredMessageId === message.id && (
                      <div className="flex gap-1">
                        {message.message_type === 'text' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => startEditMessage(message)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => deleteMessage(message.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                {editingMessageId === message.id ? (
                  <div className="flex gap-2">
                    <Input
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveEditMessage(message.id);
                        } else if (e.key === 'Escape') {
                          setEditingMessageId(null);
                        }
                      }}
                      autoFocus
                    />
                    <Button size="sm" onClick={() => saveEditMessage(message.id)}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingMessageId(null)}>Cancel</Button>
                  </div>
                ) : (
                  <>
                    {message.message_type === 'text' && message.content && (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                    {message.message_type === 'file' && message.file_url && (
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <Paperclip className="h-4 w-4" />
                        <a href={message.file_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {message.file_name || 'File attachment'}
                        </a>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t bg-background">
        {recordedBlob && (
          <div className="px-4 py-3 bg-muted border-b">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">{recordingType === 'video' ? '🎥' : '🎤'} Recording ready</span>
                {recordingType === 'audio' && (
                  <audio src={URL.createObjectURL(recordedBlob)} controls className="h-8" />
                )}
                {recordingType === 'video' && (
                  <video src={URL.createObjectURL(recordedBlob)} controls className="h-20" />
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={sendRecording}>Send</Button>
                <Button size="sm" variant="ghost" onClick={cancelRecording}>Cancel</Button>
              </div>
            </div>
          </div>
        )}
        <div className="px-4 py-3">
          <div className="border rounded-lg bg-background">
            <div className="relative">
              <Textarea
                value={newMessage}
                onChange={(e) => handleMessageChange(e.target.value)}
                placeholder={`Message ${getContextLabel()}`}
                className="min-h-[80px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !showMentionPicker) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              {showMentionPicker && filteredUsers.length > 0 && (
                <Card className="absolute bottom-full mb-2 left-0 max-h-48 overflow-y-auto z-50 w-64">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => insertMention(user)}
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                    >
                      {user.name}
                    </button>
                  ))}
                </Card>
              )}
            </div>
            
            <div className="flex items-center justify-between px-2 pb-2 pt-1 border-t">
              <div className="flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  title="Attach files"
                >
                  <Plus className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={isLoading}
                  title="Format text"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={isLoading}
                  title="Add emoji"
                >
                  <Smile className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    handleMessageChange(newMessage + '@');
                    setShowMentionPicker(true);
                  }}
                  className="h-8 w-8"
                  disabled={isLoading}
                  title="Mention someone"
                >
                  <AtSign className="h-4 w-4" />
                </Button>

                {!isRecording ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startRecording('video')}
                      disabled={isLoading}
                      title="Record video"
                    >
                      <Video className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startRecording('audio')}
                      disabled={isLoading}
                      title="Record audio"
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={stopRecording}
                    title={`Stop ${recordingType} recording`}
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={isLoading}
                  title="Code snippet"
                >
                  <Code className="h-4 w-4" />
                </Button>
              </div>

              <Button
                size="icon"
                className="h-8 w-8"
                onClick={sendMessage}
                disabled={isLoading || !newMessage.trim()}
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
