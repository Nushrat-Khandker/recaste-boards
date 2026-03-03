import { useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Paperclip, Trash2, Edit2, RefreshCw, Loader2, Download, 
  Reply, Check, CheckCheck 
} from 'lucide-react';
import { ChatMessage } from './types';
import { isImageFile, isVideoFile, isAudioFile, isPdfFile, getFileTypeInfo, getFileExtension } from './fileUtils';
import { EmojiReactions, EmojiPickerButton } from './EmojiReactions';
import { Reaction } from './useReactions';

interface ChatMessageItemProps {
  message: ChatMessage;
  userName: string;
  currentUserId: string | null;
  onEdit: (message: ChatMessage) => void;
  onDelete: (messageId: string) => void;
  onRetry: (message: ChatMessage) => void;
  onSaveEdit: (messageId: string, content: string) => void;
  onReply: (message: ChatMessage) => void;
  isEditing: boolean;
  editContent: string;
  setEditContent: (content: string) => void;
  onCancelEdit: () => void;
  replyToMessage?: ChatMessage | null;
  replyToUserName?: string;
  profilesMap: Record<string, string | null>;
  reactions?: Reaction[];
  onToggleReaction?: (messageId: string, emoji: string) => void;
}

const FileAttachmentCard = ({ fileName, fileUrl }: { fileName: string | null; fileUrl: string }) => {
  const info = getFileTypeInfo(fileName, fileUrl);
  const ext = getFileExtension(fileName);
  const IconComponent = info.icon;

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-2.5 rounded-lg bg-background/50 hover:bg-background/80 transition-colors max-w-xs"
    >
      <div className={`p-2 rounded-md bg-muted ${info.color}`}>
        <IconComponent className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{fileName || 'File attachment'}</p>
        <p className="text-xs text-muted-foreground">{ext || info.label}</p>
      </div>
      <Download className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </a>
  );
};

// URL regex for detecting links in text
const URL_REGEX = /(https?:\/\/[^\s<>\"')\]]+)/gi;

const renderMessageContent = (content: string) => {
  // First split by mentions
  const mentionParts = content.split(/(@\[([^\]]+)\]\([^)]+\))/g);
  const elements: React.ReactNode[] = [];
  let i = 0;
  let keyIdx = 0;
  while (i < mentionParts.length) {
    const mentionMatch = mentionParts[i].match(/^@\[([^\]]+)\]\(([^)]+)\)$/);
    if (mentionMatch) {
      elements.push(
        <span 
          key={`mention-${keyIdx++}`} 
          className="inline-flex items-center bg-primary/20 text-primary font-semibold rounded-full px-2 py-0.5 text-[13px] mx-0.5 cursor-default"
        >
          @{mentionMatch[1]}
        </span>
      );
      i += 3;
    } else {
      // For non-mention text, detect and render URLs as clickable links
      if (mentionParts[i]) {
        const textWithLinks = renderTextWithLinks(mentionParts[i], keyIdx);
        elements.push(...textWithLinks.elements);
        keyIdx = textWithLinks.nextKey;
      }
      i++;
    }
  }
  return elements;
};

const renderTextWithLinks = (text: string, startKey: number) => {
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyIdx = startKey;
  let match: RegExpExecArray | null;
  
  // Reset regex state
  URL_REGEX.lastIndex = 0;
  
  while ((match = URL_REGEX.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index));
    }
    
    const url = match[1];
    // Clean trailing punctuation that's likely not part of the URL
    const cleanUrl = url.replace(/[.,;:!?]+$/, '');
    const trailing = url.slice(cleanUrl.length);
    
    elements.push(
      <a
        key={`link-${keyIdx++}`}
        href={cleanUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 break-all hover:opacity-80 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        {cleanUrl}
      </a>
    );
    
    if (trailing) elements.push(trailing);
    lastIndex = match.index + url.length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }
  
  return { elements, nextKey: keyIdx };
};

export const ChatMessageItem = ({
  message,
  userName,
  currentUserId,
  onEdit,
  onDelete,
  onRetry,
  onSaveEdit,
  onReply,
  isEditing,
  editContent,
  setEditContent,
  onCancelEdit,
  replyToMessage,
  replyToUserName,
  profilesMap,
  reactions = [],
  onToggleReaction,
}: ChatMessageItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOwnMessage = message.user_id === currentUserId;

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => setIsHovered(false), 150);
  }, []);

  return (
    <div 
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} relative`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        className={`relative max-w-[75%] min-w-[140px] rounded-2xl px-3.5 py-2 shadow-sm transition-all
          ${isOwnMessage 
            ? 'bg-primary text-primary-foreground rounded-br-md' 
            : 'bg-card border border-border rounded-bl-md'
          }
          ${message.pending ? 'opacity-70' : ''}
          ${message.failed ? 'ring-2 ring-destructive' : ''}
        `}
      >
        {/* Reply preview */}
        {replyToMessage && (
          <div 
            className={`mb-1.5 px-2.5 py-1.5 rounded-lg border-l-3 text-xs
              ${isOwnMessage 
                ? 'bg-primary-foreground/10 border-primary-foreground/40 text-primary-foreground/80' 
                : 'bg-muted/60 border-primary/40 text-muted-foreground'
              }
            `}
          >
            <span className={`font-semibold block text-[11px] ${isOwnMessage ? 'text-primary-foreground/90' : 'text-primary'}`}>
              {replyToUserName || 'Unknown'}
            </span>
            <span className="line-clamp-1">
              {replyToMessage.message_type === 'file' 
                ? `📎 ${replyToMessage.file_name || 'File'}` 
                : replyToMessage.content?.slice(0, 80) || ''
              }
            </span>
          </div>
        )}

        {/* Sender name (for others' messages) */}
        {!isOwnMessage && (
          <p className="text-xs font-semibold text-primary mb-0.5">{userName}</p>
        )}

        {/* Message content */}
        {isEditing ? (
          <div className="flex gap-2">
            <Input
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 h-8 text-sm bg-background text-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveEdit(message.id, editContent);
                else if (e.key === 'Escape') onCancelEdit();
              }}
              autoFocus
            />
            <Button size="sm" variant="secondary" className="h-8" onClick={() => onSaveEdit(message.id, editContent)}>Save</Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={onCancelEdit}>Cancel</Button>
          </div>
        ) : (
          <>
            {message.message_type === 'text' && message.content && (
              <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                {renderMessageContent(message.content)}
              </p>
            )}
            {message.message_type === 'file' && message.file_url && (
              <div className="mt-0.5">
                {isImageFile(message.file_name, message.file_url) ? (
                  <div className="space-y-1">
                    <img 
                      src={message.file_url} 
                      alt={message.file_name || 'Image'} 
                      className="max-w-full max-h-64 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(message.file_url!, '_blank')}
                    />
                    <div className="flex items-center gap-1.5 text-xs opacity-70">
                      <Paperclip className="h-3 w-3" />
                      <span className="truncate">{message.file_name}</span>
                    </div>
                  </div>
                ) : isVideoFile(message.file_name, message.file_url) ? (
                  <div className="space-y-1">
                    <video src={message.file_url} controls className="max-w-full max-h-64 rounded-lg" />
                    <div className="flex items-center gap-1.5 text-xs opacity-70">
                      <Paperclip className="h-3 w-3" />
                      <span className="truncate">{message.file_name}</span>
                    </div>
                  </div>
                ) : isAudioFile(message.file_name, message.file_url) ? (
                  <div className="space-y-1">
                    <audio src={message.file_url} controls className="max-w-full" />
                    <div className="flex items-center gap-1.5 text-xs opacity-70">
                      <Paperclip className="h-3 w-3" />
                      <span className="truncate">{message.file_name}</span>
                    </div>
                  </div>
                ) : isPdfFile(message.file_name, message.file_url) ? (
                  <div className="space-y-1">
                    <iframe
                      src={message.file_url}
                      className="w-full max-w-md h-48 rounded-lg border"
                      title={message.file_name || 'PDF'}
                    />
                    <FileAttachmentCard fileName={message.file_name} fileUrl={message.file_url} />
                  </div>
                ) : (
                  <FileAttachmentCard fileName={message.file_name} fileUrl={message.file_url} />
                )}
              </div>
            )}
          </>
        )}

        {/* Timestamp + status row */}
        <div className={`flex items-center gap-1 mt-0.5 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-[10px] ${isOwnMessage ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
            {format(new Date(message.created_at), 'HH:mm')}
          </span>
          {isOwnMessage && !message.pending && !message.failed && (
            <CheckCheck className={`h-3.5 w-3.5 ${isOwnMessage ? 'text-primary-foreground/60' : 'text-muted-foreground'}`} />
          )}
          {message.pending && (
            <Loader2 className="h-3 w-3 animate-spin text-primary-foreground/60" />
          )}
          {message.failed && (
            <span className="text-[10px] text-destructive font-medium">Failed</span>
          )}
        </div>

        {/* Emoji reactions */}
        <EmojiReactions
          reactions={reactions}
          currentUserId={currentUserId}
          onToggle={(emoji) => onToggleReaction?.(message.id, emoji)}
          profilesMap={profilesMap}
          isOwnMessage={isOwnMessage}
        />

        {/* Action buttons on hover */}
        {isHovered && !message.pending && (
          <div 
            className={`absolute -top-3 ${isOwnMessage ? 'right-1' : 'left-1'} 
              flex items-center gap-0.5 bg-popover border border-border rounded-full shadow-md px-1 py-0.5 z-10`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full"
              onClick={() => onReply(message)}
              title="Reply"
            >
              <Reply className="h-3 w-3" />
            </Button>
            {onToggleReaction && (
              <EmojiPickerButton onSelect={(emoji) => onToggleReaction(message.id, emoji)} />
            )}
            {message.failed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full"
                onClick={() => onRetry(message)}
                title="Retry"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            {isOwnMessage && message.message_type === 'text' && !message.failed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full"
                onClick={() => onEdit(message)}
                title="Edit"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
            {isOwnMessage && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full text-destructive hover:text-destructive"
                onClick={() => onDelete(message.id)}
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
