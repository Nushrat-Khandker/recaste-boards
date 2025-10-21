import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, FileText, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface BoardFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  user_id: string;
}

interface FilesViewProps {
  boardName: string;
}

export const FilesView = ({ boardName }: FilesViewProps) => {
  const [files, setFiles] = useState<BoardFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFiles();
  }, [boardName]);

  const loadFiles = async () => {
    const { data, error } = await (supabase as any)
      .from('board_files')
      .select('*')
      .eq('board_name', boardName)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading files:', error);
      toast({
        title: 'Error',
        description: 'Failed to load files',
        variant: 'destructive',
      });
    } else {
      setFiles(data || []);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to upload files',
        variant: 'destructive',
      });
      setIsUploading(false);
      return;
    }

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${boardName}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('board-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('board-files')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await (supabase as any).from('board_files').insert({
        board_name: boardName,
        user_id: user.id,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size,
      });

      if (dbError) throw dbError;

      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      });

      loadFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (file: BoardFile) => {
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
      <div className="mb-6">
        <label htmlFor="file-upload">
          <Button asChild disabled={isUploading}>
            <span className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload File'}
            </span>
          </Button>
        </label>
        <input
          id="file-upload"
          type="file"
          className="hidden"
          onChange={handleFileUpload}
          disabled={isUploading}
        />
      </div>

      {files.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          No files yet. Upload your first file!
        </div>
      ) : (
        <div className="grid gap-4">
          {files.map((file) => (
            <Card key={file.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline truncate block"
                    >
                      {file.file_name}
                    </a>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(file.file_size)} • {format(new Date(file.created_at), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteFile(file)}
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
