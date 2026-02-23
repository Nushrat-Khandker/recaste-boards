import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus, Image, FileVideo, FileAudio, FileText, File } from 'lucide-react';
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
    accept: 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml',
    description: 'JPG, PNG, GIF, WebP, SVG',
  },
  {
    label: 'Video',
    icon: FileVideo,
    accept: 'video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska',
    description: 'MP4, WebM, MOV, AVI, MKV',
  },
  {
    label: 'Audio',
    icon: FileAudio,
    accept: 'audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/webm',
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
    description: 'All file types (max 10MB)',
  },
];

export const AttachmentMenu = ({ onFileUpload, disabled }: AttachmentMenuProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

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

  const triggerFileInput = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={disabled}
            title="Attach file"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-56 p-1">
          {ATTACHMENT_OPTIONS.map((option) => (
            <button
              key={option.label}
              onClick={() => triggerFileInput(option.accept)}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-md hover:bg-muted transition-colors"
            >
              <option.icon className="h-4 w-4 text-muted-foreground" />
              <div className="text-left">
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground">{option.description}</div>
              </div>
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </>
  );
};
