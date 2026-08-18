import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, X } from 'lucide-react';

interface MediaCaptionDialogProps {
  files: File[] | null;
  onCancel: () => void;
  onSend: (caption: string) => void;
}

/** WhatsApp-style preview: shows the picked/pasted media and lets you add a caption. */
export const MediaCaptionDialog = ({ files, onCancel, onSend }: MediaCaptionDialogProps) => {
  const [caption, setCaption] = useState('');
  const [previews, setPreviews] = useState<{ url: string; isVideo: boolean; name: string }[]>([]);

  useEffect(() => {
    if (!files || files.length === 0) {
      setPreviews([]);
      return;
    }
    setCaption('');
    const made = files.map((f) => ({
      url: URL.createObjectURL(f),
      isVideo: f.type.startsWith('video/'),
      name: f.name,
    }));
    setPreviews(made);
    return () => made.forEach((p) => URL.revokeObjectURL(p.url));
  }, [files]);

  const open = !!files && files.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            {previews.length > 1 ? `Send ${previews.length} items` : 'Add a caption'}
          </DialogTitle>
        </DialogHeader>

        <div className={previews.length > 1 ? 'grid grid-cols-2 gap-2' : ''}>
          {previews.map((p) => (
            <div key={p.url} className="rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              {p.isVideo ? (
                <video src={p.url} controls className="max-h-64 w-full object-contain" />
              ) : (
                <img src={p.url} alt={p.name} className="max-h-64 w-full object-contain" />
              )}
            </div>
          ))}
        </div>

        <Textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a caption..."
          autoFocus
          className="min-h-[44px] max-h-[120px] resize-none rounded-2xl bg-muted/50 border-0 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend(caption.trim());
            }
          }}
        />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button size="sm" onClick={() => onSend(caption.trim())}>
            <Send className="h-4 w-4 mr-1" /> Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};