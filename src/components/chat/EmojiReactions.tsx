import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SmilePlus } from 'lucide-react';
import { Reaction, QUICK_EMOJIS } from './useReactions';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

const ALL_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏', '🎉', '💯', '👎', '🤔', '😍', '🥳', '💪', '✅'];

interface EmojiReactionsProps {
  reactions: Reaction[];
  currentUserId: string | null;
  onToggle: (emoji: string) => void;
  profilesMap: Record<string, string | null>;
  isOwnMessage: boolean;
}

export const EmojiReactions = ({ reactions, currentUserId, onToggle, profilesMap, isOwnMessage }: EmojiReactionsProps) => {
  if (!reactions.length) return null;

  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <TooltipProvider delayDuration={300}>
        {reactions.map(({ emoji, users }) => {
          const isMine = currentUserId ? users.includes(currentUserId) : false;
          const names = users.map(id => profilesMap[id] || 'Unknown').join(', ');
          return (
            <Tooltip key={emoji}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onToggle(emoji)}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors
                    ${isMine 
                      ? 'bg-primary/15 border-primary/30 text-foreground' 
                      : 'bg-muted/50 border-border hover:bg-muted text-foreground'
                    }`}
                >
                  <span className="text-sm leading-none">{emoji}</span>
                  {users.length > 1 && <span className="text-[10px] font-medium">{users.length}</span>}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-[200px]">
                {names}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
};

interface EmojiPickerButtonProps {
  onSelect: (emoji: string) => void;
}

export const EmojiPickerButton = ({ onSelect }: EmojiPickerButtonProps) => {
  const [open, setOpen] = useState(false);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" title="React">
          <SmilePlus className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" side="top" align="center">
        <div className="grid grid-cols-8 gap-0.5">
          {ALL_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => { onSelect(emoji); setOpen(false); }}
              className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-lg transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
