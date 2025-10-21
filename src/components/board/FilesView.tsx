import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, Trash2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface BoardFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  user_id: string;
  source: 'upload' | 'chat';
}

interface FilesViewProps {
  boardName: string;
}

export const FilesView = ({ boardName }: FilesViewProps) => {
  const [files, setFiles] = useState<BoardFile[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadFiles();
  }, [boardName]);

  const loadFiles = async () => {
    // Load files from board_files table
    const { data: uploadedFiles, error: uploadError } = await (supabase as any)
      .from('board_files')
      .select('*')
      .eq('board_name', boardName)
      .order('created_at', { ascending: false });

    // Load files from chat messages
    const { data: chatFiles, error: chatError } = await (supabase as any)
      .from('chat_messages')
      .select('*')
      .eq('board_name', boardName)
      .eq('message_type', 'file')
      .order('created_at', { ascending: false });

    if (uploadError || chatError) {
      console.error('Error loading files:', uploadError || chatError);
      toast({
        title: 'Error',
        description: 'Failed to load files',
        variant: 'destructive',
      });
    } else {
      // Combine both sources
      const allFiles: BoardFile[] = [
        ...(uploadedFiles || []).map((f: any) => ({ ...f, source: 'upload' as const })),
        ...(chatFiles || []).map((f: any) => ({
          id: f.id,
          file_name: f.file_name || 'File',
          file_url: f.file_url,
          file_type: null,
          file_size: null,
          created_at: f.created_at,
          user_id: f.user_id,
          source: 'chat' as const,
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setFiles(allFiles);
    }
  };

  const handleDeleteFile = async (file: BoardFile) => {
    // Only allow deletion of uploaded files, not chat files
    if (file.source === 'chat') {
      toast({
        title: 'Info',
        description: 'Chat files can only be deleted from the chat view',
        variant: 'default',
      });
      return;
    }

    const { error } = await (supabase as any)
      .from('board_files')
      .delete()
      .eq('id', file.id);

    if (error) {
      console.error('Error deleting file:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete file',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'File deleted successfully',
      });
      loadFiles();
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="p-4">
      {files.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <p className="text-lg font-medium mb-2">No files yet</p>
          <p className="text-sm">Share files in the chat to see them here!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {files.map((file) => (
            <Card key={file.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {file.source === 'chat' ? (
                    <MessageSquare className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline truncate"
                      >
                        {file.file_name}
                      </a>
                      {file.source === 'chat' && (
                        <Badge variant="secondary" className="text-xs">From Chat</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {file.source === 'upload' ? formatFileSize(file.file_size) + ' • ' : ''}{format(new Date(file.created_at), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteFile(file)}
                  disabled={file.source === 'chat'}
                  title={file.source === 'chat' ? 'Chat files can only be deleted from chat' : 'Delete file'}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
