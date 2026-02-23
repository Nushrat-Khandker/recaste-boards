import { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Image, FileVideo, FileAudio, FileText, File, X } from 'lucide-react';
import { MAX_FILE_SIZE } from './types';
import { useToast } from '@/components/ui/use-toast';

interface AttachmentMenuProps {
  onFileUpload: (files: FileList) => void;
  disabled?: boolean;
}

const ATTACHMENT_OPTIONS = [
  {
    label: 'Photo',
    icon: Image,
    accept: 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.svg',
    description: 'JPG, PNG, GIF, WebP, SVG',
  },
  {
    label: 'Video',
    icon: FileVideo,
    accept: 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.avi,.mkv',
    description: 'MP4, WebM, MOV, AVI, MKV',
  },
  {
    label: 'Audio',
    icon: FileAudio,
    accept: 'audio/mpeg,audio/wav,audio/ogg,audio/mp4,.mp3,.wav,.ogg,.m4a,.aac',
    description: 'MP3, WAV, OGG, M4A',
  },
  {
    label: 'Document',
    icon: FileText,
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf',
    description: 'PDF, Word, Excel, PPT, TXT',
  },
  {
    label: 'Any File',
    icon: File,
    accept: '*/*',
    description: 'All file types (max 200MB)',
  },
];

export const AttachmentMenu = ({ onFileUpload, disabled }: AttachmentMenuProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds the 200MB limit`,
          variant: 'destructive',
        });
        return;
      }
    }

    onFileUpload(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileUpload, toast]);

  const handleOptionClick = useCallback((accept: string) => {
    setShowMenu(false);
    // Create a fresh file input, set accept, and click it
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = accept;
    input.style.display = 'none';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        // Validate sizes
        for (const file of Array.from(target.files)) {
          if (file.size > MAX_FILE_SIZE) {
            toast({
              title: 'File too large',
              description: `${file.name} exceeds the 200MB limit`,
              variant: 'destructive',
            });
            document.body.removeChild(input);
            return;
          }
        }
        onFileUpload(target.files);
      }
      document.body.removeChild(input);
    };
    document.body.appendChild(input);
    input.click();
  }, [onFileUpload, toast]);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={disabled}
        title="Attach file"
        onClick={() => setShowMenu(!showMenu)}
      >
        <Plus className="h-4 w-4" />
      </Button>

      {showMenu && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute bottom-full mb-2 left-0 z-50 w-56 rounded-lg border bg-popover p-1 shadow-md">
            {ATTACHMENT_OPTIONS.map((option) => (
              <button
                key={option.label}
                onClick={() => handleOptionClick(option.accept)}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-md hover:bg-muted transition-colors"
              >
                <option.icon className="h-4 w-4 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
