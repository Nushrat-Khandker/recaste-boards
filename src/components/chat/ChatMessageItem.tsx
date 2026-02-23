import { useState } from 'react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, Trash2, Edit2, RefreshCw, Loader2, Download } from 'lucide-react';
import { ChatMessage } from './types';
import { isImageFile, isVideoFile, isAudioFile, isPdfFile, getFileTypeInfo, getFileExtension } from './fileUtils';

interface ChatMessageItemProps {
  message: ChatMessage;
  userName: string;
  currentUserId: string | null;
  onEdit: (message: ChatMessage) => void;
  onDelete: (messageId: string) => void;
  onRetry: (message: ChatMessage) => void;
  onSaveEdit: (messageId: string, content: string) => void;
  isEditing: boolean;
  editContent: string;
  setEditContent: (content: string) => void;
  onCancelEdit: () => void;
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
      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50 hover:bg-muted transition-colors max-w-xs"
    >
      <div className={`p-2 rounded-md bg-background ${info.color}`}>
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

export const ChatMessageItem = ({
  message,
  userName,
  currentUserId,
  onEdit,
  onDelete,
  onRetry,
  onSaveEdit,
  isEditing,
  editContent,
  setEditContent,
  onCancelEdit,
}: ChatMessageItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const isOwnMessage = message.user_id === currentUserId;

  return (
    <Card 
      className={`p-3 group relative ${message.pending ? 'opacity-70' : ''} ${message.failed ? 'border-destructive' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{userName}</span>
            {message.pending && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Sending...
              </span>
            )}
            {message.failed && (
              <span className="text-xs text-destructive">Failed to send</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {format(new Date(message.created_at), 'MMM d, HH:mm')}
            </span>
            {isHovered && isOwnMessage && !message.pending && (
              <div className="flex gap-1">
                {message.failed && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onRetry(message)}
                    title="Retry sending"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
                {message.message_type === 'text' && !message.failed && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onEdit(message)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={() => onDelete(message.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="flex gap-2">
            <Input
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSaveEdit(message.id, editContent);
                } else if (e.key === 'Escape') {
                  onCancelEdit();
                }
              }}
              autoFocus
            />
            <Button size="sm" onClick={() => onSaveEdit(message.id, editContent)}>Save</Button>
            <Button size="sm" variant="ghost" onClick={onCancelEdit}>Cancel</Button>
          </div>
        ) : (
          <>
            {message.message_type === 'text' && message.content && (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}
            {message.message_type === 'file' && message.file_url && (
              <div className="mt-1">
                {isImageFile(message.file_name, message.file_url) ? (
                  <div className="space-y-1">
                    <img 
                      src={message.file_url} 
                      alt={message.file_name || 'Image'} 
                      className="max-w-xs max-h-64 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(message.file_url!, '_blank')}
                    />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Paperclip className="h-3 w-3" />
                      <span>{message.file_name}</span>
                    </div>
                  </div>
                ) : isVideoFile(message.file_name, message.file_url) ? (
                  <div className="space-y-1">
                    <video 
                      src={message.file_url} 
                      controls 
                      className="max-w-xs max-h-64 rounded-lg"
                    />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Paperclip className="h-3 w-3" />
                      <span>{message.file_name}</span>
                    </div>
                  </div>
                ) : isAudioFile(message.file_name, message.file_url) ? (
                  <div className="space-y-1">
                    <audio 
                      src={message.file_url} 
                      controls 
                      className="max-w-xs"
                    />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Paperclip className="h-3 w-3" />
                      <span>{message.file_name}</span>
                    </div>
                  </div>
                ) : isPdfFile(message.file_name, message.file_url) ? (
                  <div className="space-y-1">
                    <iframe
                      src={message.file_url}
                      className="w-full max-w-md h-64 rounded-lg border"
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
      </div>
    </Card>
  );
};
