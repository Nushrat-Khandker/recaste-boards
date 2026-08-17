import { useState, useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Send, Mic, Video, Square, Smile, AtSign, Code, X, Reply 
} from 'lucide-react';
import { ChatUser, ChatMessage } from './types';
import { AttachmentMenu } from './AttachmentMenu';

interface ChatInputProps {
  onSendMessage: (content: string, mentionedUserIds: string[], replyToId?: string) => void;
  onFileUpload: (files: FileList) => void;
  onStartRecording: (type: 'audio' | 'video') => void;
  onStopRecording: () => void;
  isRecording: boolean;
  recordingType: 'audio' | 'video' | null;
  isLoading: boolean;
  uploadProgress: number | null;
  allUsers: ChatUser[];
  contextLabel: string;
  replyingTo: ChatMessage | null;
  replyingToUserName: string | null;
  onCancelReply: () => void;
  draftKey?: string;
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
  replyingTo,
  replyingToUserName,
  onCancelReply,
  draftKey,
}: ChatInputProps) => {
  const isMobile = useIsMobile();
  const [newMessage, setNewMessage] = useState('');
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);

  // Slack-style draft persistence per channel/DM/board context
  const draftStorageKey = draftKey ? `chat-draft:${draftKey}` : null;
  const draftLoadedRef = useRef(false);

  useEffect(() => {
    draftLoadedRef.current = false;
    if (!draftStorageKey) { setNewMessage(''); return; }
    try {
      const saved = localStorage.getItem(draftStorageKey);
      setNewMessage(saved || '');
    } catch { setNewMessage(''); }
    draftLoadedRef.current = true;
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftStorageKey || !draftLoadedRef.current) return;
    try {
      if (newMessage) localStorage.setItem(draftStorageKey, newMessage);
      else localStorage.removeItem(draftStorageKey);
    } catch {}
  }, [newMessage, draftStorageKey]);

  const commonEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗',
    '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🫡', '🤐', '🤨',
    '😐', '😑', '😶', '🫥', '😏', '😒', '🙄', '😬', '🤥', '🫨', '😌', '😔', '😪', '🤤', '😴', '😷',
    '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕',
    '🫤', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '🥹', '😦', '😧', '😨', '😰', '😥', '😢', '😭',
    '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️',
    '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾',
    '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟',
    '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏',
    '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗',
    '💖', '💘', '💝', '💟', '🔥', '⭐', '🌟', '✨', '⚡', '💥', '💫', '🎉', '🎊', '🎈', '🎁', '🏆',
    '🥇', '🥈', '🥉', '⚽', '🏀', '🎯', '🎮', '🎲', '🔔', '🎵', '🎶', '🎤', '🎧', '📱', '💻', '⌨️',
    '📷', '📹', '📞', '📧', '📝', '📌', '📎', '🔗', '📁', '🗂️', '✅', '❌', '⭕', '❗', '❓', '💯',
    '🚀', '🛸', '🌍', '🌙', '☀️', '🌈', '☁️', '🌊', '🌸', '🌺', '🌻', '🌹', '🍀', '🌳', '🍎', '🍕',
    '🍔', '🍟', '🌮', '🍣', '🍩', '🍪', '🎂', '🍰', '☕', '🍵', '🥤', '🍺', '🍷', '🥂', '👀', '💬',
  ];

  const handleSend = () => {
    if (!newMessage.trim()) return;
    onSendMessage(newMessage, mentionedUserIds, replyingTo?.id);
    setNewMessage('');
    setMentionedUserIds([]);
    if (draftStorageKey) {
      try { localStorage.removeItem(draftStorageKey); } catch {}
    }
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
    setNewMessage(`${beforeCursor}@${user.name} `);
    setMentionedUserIds(prev => prev.includes(user.id) ? prev : [...prev, user.id]);
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

  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  return (
    <div className="border-t bg-background/95 backdrop-blur-sm">
      {uploadProgress !== null && (
        <div className="px-4 py-2 border-b">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Uploading...</span>
            <Progress value={uploadProgress} className="flex-1 h-2" />
            <span>{uploadProgress}%</span>
          </div>
        </div>
      )}

      {/* Reply preview bar */}
      {replyingTo && (
        <div className="px-4 pt-2 pb-1">
          <div className="flex items-center gap-2 bg-muted/60 rounded-lg px-3 py-2 border-l-3 border-primary">
            <Reply className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-primary block">{replyingToUserName || 'Unknown'}</span>
              <span className="text-xs text-muted-foreground line-clamp-1">
                {replyingTo.message_type === 'file' 
                  ? `📎 ${replyingTo.file_name || 'File'}`
                  : replyingTo.content?.slice(0, 100) || ''
                }
              </span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={onCancelReply}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
      
      <div className="px-3 py-2">
        <div className="flex items-end gap-2">
          <div className="flex items-center gap-0.5">
            <AttachmentMenu onFileUpload={onFileUpload} disabled={isLoading} />
          </div>

          <div className="flex-1 relative">
            <Textarea
              value={newMessage}
              onChange={(e) => handleMessageChange(e.target.value)}
              placeholder={`Type a message...`}
              className="min-h-[42px] max-h-[120px] resize-none rounded-2xl bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:ring-offset-0 py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground"
              onPaste={(e) => {
                const items = Array.from(e.clipboardData?.items || []);
                const files = items
                  .filter((it) => it.kind === 'file')
                  .map((it) => it.getAsFile())
                  .filter((f): f is File => !!f);
                if (files.length === 0) return;
                e.preventDefault();
                const dt = new DataTransfer();
                files.forEach((f) => {
                  const named = f.name && f.name !== 'image.png'
                    ? f
                    : new File([f], `pasted-${Date.now()}.${(f.type.split('/')[1] || 'png')}`, { type: f.type });
                  dt.items.add(named);
                });
                onFileUpload(dt.files);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
                  e.preventDefault();
                  if (showMentionPicker && filteredUsers.length > 0) {
                    insertMention(filteredUsers[0]);
                  } else {
                    handleSend();
                  }
                }
              }}
            />
            
            {showMentionPicker && filteredUsers.length > 0 && (
              <Card className="absolute bottom-full mb-2 left-0 max-h-48 overflow-y-auto z-50 w-64 shadow-lg">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => insertMention(user)}
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm transition-colors"
                  >
                    {user.name}
                  </button>
                ))}
              </Card>
            )}

            {showEmojiPicker && (
              <Card className="absolute bottom-full mb-2 left-0 z-50 p-2 shadow-lg max-h-64 overflow-y-auto w-72">
                <div className="grid grid-cols-8 gap-0.5">
                  {commonEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => insertEmoji(emoji)}
                      className="text-lg hover:bg-muted rounded p-1 transition-colors h-8 w-8 flex items-center justify-center"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={isLoading}
              title="Add emoji"
            >
              <Smile className="h-5 w-5 text-muted-foreground" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                handleMessageChange(newMessage + '@');
                setShowMentionPicker(true);
              }}
              className="h-9 w-9 rounded-full"
              disabled={isLoading}
              title="Mention someone"
            >
              <AtSign className="h-5 w-5 text-muted-foreground" />
            </Button>

            {!isRecording ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => onStartRecording('audio')}
                disabled={isLoading}
                title="Record audio"
              >
                <Mic className="h-5 w-5 text-muted-foreground" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-destructive"
                onClick={onStopRecording}
                title={`Stop ${recordingType} recording`}
              >
                <Square className="h-5 w-5 fill-current" />
              </Button>
            )}

            {newMessage.trim() ? (
              <Button
                size="icon"
                className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90"
                onClick={handleSend}
                disabled={isLoading}
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => onStartRecording('video')}
                disabled={isLoading || isRecording}
                title="Record video"
              >
                <Video className="h-5 w-5 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
