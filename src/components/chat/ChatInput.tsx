import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Send, Paperclip, Mic, Video, Square, Plus, Smile, AtSign, Code 
} from 'lucide-react';
import { ChatUser, MAX_FILE_SIZE } from './types';
import { useToast } from '@/components/ui/use-toast';

interface ChatInputProps {
  onSendMessage: (content: string, mentionedUserIds: string[]) => void;
  onFileUpload: (files: FileList) => void;
  onStartRecording: (type: 'audio' | 'video') => void;
  onStopRecording: () => void;
  isRecording: boolean;
  recordingType: 'audio' | 'video' | null;
  isLoading: boolean;
  uploadProgress: number | null;
  allUsers: ChatUser[];
  contextLabel: string;
}

export const ChatInput = ({
  onSendMessage,
  onFileUpload,
  onStartRecording,
  onStopRecording,
  isRecording,
  recordingType,
  isLoading,
  uploadProgress,
  allUsers,
  contextLabel,
}: ChatInputProps) => {
  const [newMessage, setNewMessage] = useState('');
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const commonEmojis = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '✅', '👀', '🙌', '💯', '🚀', '💪'];

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[2]);
    }
    return mentions;
  };

  const handleSend = () => {
    if (!newMessage.trim()) return;
    const mentionedUserIds = extractMentions(newMessage);
    onSendMessage(newMessage, mentionedUserIds);
    setNewMessage('');
  };

  const handleMessageChange = (text: string) => {
    setNewMessage(text);
    
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

  const insertMention = (user: ChatUser) => {
    const beforeCursor = newMessage.substring(0, newMessage.lastIndexOf('@'));
    setNewMessage(`${beforeCursor}@[${user.name}](${user.id}) `);
    setShowMentionPicker(false);
    setMentionQuery('');
  };

  const insertEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const insertCodeBlock = () => {
    setNewMessage(prev => prev + '\n```\n\n```');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Check file sizes
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds the 10MB limit`,
          variant: 'destructive',
        });
        return;
      }
    }
    
    onFileUpload(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  return (
    <div className="border-t bg-background">
      {uploadProgress !== null && (
        <div className="px-4 py-2 border-b">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Uploading...</span>
            <Progress value={uploadProgress} className="flex-1 h-2" />
            <span>{uploadProgress}%</span>
          </div>
        </div>
      )}
      
      <div className="px-4 py-3">
        <div className="border rounded-lg bg-background">
          <div className="relative">
            <Textarea
              value={newMessage}
              onChange={(e) => handleMessageChange(e.target.value)}
              placeholder={`Message ${contextLabel}`}
              className="min-h-[80px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !showMentionPicker) {
                  e.preventDefault();
                  handleSend();
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

            {showEmojiPicker && (
              <Card className="absolute bottom-full mb-2 left-0 z-50 p-2">
                <div className="grid grid-cols-6 gap-1">
                  {commonEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => insertEmoji(emoji)}
                      className="text-xl hover:bg-muted rounded p-1"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
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
                onChange={handleFileSelect}
              />
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                title="Attach files (max 10MB)"
              >
                <Plus className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
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
                    onClick={() => onStartRecording('video')}
                    disabled={isLoading}
                    title="Record video"
                  >
                    <Video className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onStartRecording('audio')}
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
                  onClick={onStopRecording}
                  title={`Stop ${recordingType} recording`}
                >
                  <Square className="h-4 w-4 fill-current" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={insertCodeBlock}
                disabled={isLoading}
                title="Code snippet"
              >
                <Code className="h-4 w-4" />
              </Button>
            </div>

            <Button
              size="icon"
              className="h-8 w-8"
              onClick={handleSend}
              disabled={isLoading || !newMessage.trim()}
              title="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
