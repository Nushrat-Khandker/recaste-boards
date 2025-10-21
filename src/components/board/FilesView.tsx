import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { FileIcon, Download, Trash2, Upload } from 'lucide-react';
import { format } from 'date-fns';

interface BoardFile {
  id: string;
  board_name: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

interface FilesViewProps {
  boardName: string;
}

export function FilesView({ boardName }: FilesViewProps) {
  const [files, setFiles] = useState<BoardFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchFiles();
  }, [boardName]);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('board_files')
        .select('*')
        .eq('board_name', boardName)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error: any) {
      console.error('Error fetching files:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('board-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('board-files')
        .getPublicUrl(fileName);

      // Create database record
      const { error: dbError } = await supabase
        .from('board_files')
        .insert({
          board_name: boardName,
          user_id: user.id,
          file_name: file.name,
          file_url: fileName,
          file_type: file.type,
          file_size: file.size,
        });

      if (dbError) throw dbError;

      toast({
        title: "File uploaded",
        description: `${file.name} has been uploaded successfully.`,
      });

      fetchFiles();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (fileId: string, fileUrl: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('board-files')
        .remove([fileUrl]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('board_files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      toast({
        title: "File deleted",
        description: "The file has been removed.",
      });

      fetchFiles();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Board Files</h3>
          <p className="text-sm text-muted-foreground">Upload and manage files for this board</p>
        </div>
        <div>
          <Input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          <Button asChild disabled={isUploading}>
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload File'}
            </label>
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {files.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <FileIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No files uploaded yet</p>
          </Card>
        ) : (
          files.map((file) => (
            <Card key={file.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{file.file_name}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span>•</span>
                      <span>{format(new Date(file.created_at), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      const { data } = supabase.storage
                        .from('board-files')
                        .getPublicUrl(file.file_url);
                      window.open(data.publicUrl, '_blank');
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {file.user_id === user?.id && (
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleDelete(file.id, file.file_url)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
