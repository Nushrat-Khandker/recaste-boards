import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Download, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import {
  isImageFile, isVideoFile, isAudioFile, isDocumentFile, getFileTypeInfo,
} from './fileUtils';

interface SharedFile {
  id: string;
  file_url: string;
  file_name: string;
  created_at: string;
  user_id: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextType: 'board' | 'project' | 'general' | 'channel' | 'dm';
  contextId: string | null;
}

type Category = 'all' | 'media' | 'docs' | 'audio';

const matchesCategory = (f: SharedFile, c: Category) => {
  if (c === 'all') return true;
  if (c === 'media') return isImageFile(f.file_name, f.file_url) || isVideoFile(f.file_name, f.file_url);
  if (c === 'docs') return isDocumentFile(f.file_name, f.file_url);
  if (c === 'audio') return isAudioFile(f.file_name, f.file_url);
  return true;
};

export const SharedFilesPanel = ({ open, onOpenChange, contextType, contextId }: Props) => {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<Category>('all');

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      let q = (supabase as any)
        .from('chat_messages')
        .select('id, file_url, file_name, created_at, user_id')
        .eq('context_type', contextType)
        .eq('message_type', 'file')
        .not('file_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500);
      if (contextId) q = q.eq('context_id', contextId);
      else q = q.is('context_id', null);
      const { data } = await q;
      const list = (data || []) as SharedFile[];
      setFiles(list);
      const ids = Array.from(new Set(list.map(f => f.user_id)));
      if (ids.length) {
        const { data: profs } = await (supabase as any)
          .from('profiles').select('id, full_name').in('id', ids);
        const map: Record<string, string> = {};
        (profs || []).forEach((p: any) => { map[p.id] = p.full_name || 'Unknown'; });
        setProfiles(map);
      }
      setLoading(false);
    };
    load();
  }, [open, contextType, contextId]);

  const filtered = files.filter(f => matchesCategory(f, category));
  const mediaFiles = filtered.filter(f => isImageFile(f.file_name, f.file_url) || isVideoFile(f.file_name, f.file_url));
  const otherFiles = filtered.filter(f => !(isImageFile(f.file_name, f.file_url) || isVideoFile(f.file_name, f.file_url)));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle>Shared files</SheetTitle>
        </SheetHeader>
        <Tabs value={category} onValueChange={(v) => setCategory(v as Category)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-3 grid grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="docs">Docs</TabsTrigger>
            <TabsTrigger value="audio">Audio</TabsTrigger>
          </TabsList>
          <TabsContent value={category} className="flex-1 overflow-hidden mt-3">
            <ScrollArea className="h-full px-4 pb-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center text-muted-foreground py-12 text-sm">
                  No files shared yet
                </div>
              ) : (
                <div className="space-y-4">
                  {mediaFiles.length > 0 && (
                    <div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {mediaFiles.map(f => (
                          <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                             className="relative aspect-square rounded-md overflow-hidden bg-muted group">
                            {isImageFile(f.file_name, f.file_url) ? (
                              <img src={f.file_url} alt={f.file_name} loading="lazy"
                                   className="w-full h-full object-cover" />
                            ) : (
                              <video src={f.file_url} className="w-full h-full object-cover" muted preload="metadata" />
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <ExternalLink className="h-5 w-5 text-white opacity-0 group-hover:opacity-100" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {otherFiles.length > 0 && (
                    <div className="space-y-1.5">
                      {otherFiles.map(f => {
                        const info = getFileTypeInfo(f.file_name, f.file_url);
                        const Icon = info.icon;
                        return (
                          <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                            <div className={`flex-shrink-0 ${info.color}`}>
                              <Icon className="h-8 w-8" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{f.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {profiles[f.user_id] || 'Unknown'} · {format(new Date(f.created_at), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <a href={f.file_url} target="_blank" rel="noopener noreferrer"
                               download={f.file_name}
                               className="flex-shrink-0 p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground">
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};