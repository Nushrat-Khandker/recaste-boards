import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Hash, MessageSquare, Loader2, Forward } from 'lucide-react';
import { ChatMessage } from './types';

type Target = {
  key: string;
  label: string;
  contextType: 'channel' | 'dm';
  contextId: string;
};

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: ChatMessage | null;
}

export const ForwardMessageDialog = ({ open, onOpenChange, message }: ForwardMessageDialogProps) => {
  const { toast } = useToast();
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [{ data: channels }, { data: dmMemberships }, { data: profiles }] = await Promise.all([
          (supabase as any).from('chat_channels').select('id, name, archived_at').is('archived_at', null).order('name'),
          (supabase as any).from('dm_members').select('conversation_id').eq('user_id', user.id),
          (supabase as any).from('profiles').select('id, full_name, nickname'),
        ]);

        const nameById: Record<string, string> = {};
        for (const p of profiles || []) nameById[p.id] = p.nickname || p.full_name || 'Unknown';

        const convIds = (dmMemberships || []).map((m: any) => m.conversation_id);
        let dmTargets: Target[] = [];
        if (convIds.length) {
          const [{ data: convs }, { data: members }] = await Promise.all([
            (supabase as any).from('dm_conversations').select('id, name, is_group').in('id', convIds),
            (supabase as any).from('dm_members').select('conversation_id, user_id').in('conversation_id', convIds),
          ]);
          dmTargets = (convs || []).map((c: any) => {
            const others = (members || [])
              .filter((m: any) => m.conversation_id === c.id && m.user_id !== user.id)
              .map((m: any) => nameById[m.user_id] || 'Unknown');
            return {
              key: `dm:${c.id}`,
              label: c.name || others.join(', ') || 'Direct message',
              contextType: 'dm' as const,
              contextId: c.id,
            };
          });
        }

        const channelTargets: Target[] = (channels || []).map((c: any) => ({
          key: `channel:${c.id}`,
          label: c.name,
          contextType: 'channel' as const,
          contextId: c.id,
        }));

        if (!cancelled) setTargets([...channelTargets, ...dmTargets]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [open]);

  const forwardTo = async (target: Target) => {
    if (!message) return;
    setSendingKey(target.key);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await (supabase as any).from('chat_messages').insert({
        board_name: target.contextId,
        context_type: target.contextType,
        context_id: target.contextId,
        user_id: user.id,
        message_type: message.message_type,
        content: message.message_type === 'file' ? message.content : (message.content || ''),
        file_url: message.file_url,
        file_name: message.file_name,
      });
      if (error) throw error;

      const { data: senderProfile } = await (supabase as any)
        .from('profiles').select('full_name, nickname').eq('id', user.id).maybeSingle();

      supabase.functions.invoke('push-notifications', {
        body: {
          action: 'broadcast',
          senderId: user.id,
          senderName: senderProfile?.nickname || senderProfile?.full_name || 'Someone',
          messageContent: message.message_type === 'file'
            ? `📎 ${message.file_name || 'File'}`
            : (message.content || ''),
          contextType: target.contextType,
          contextId: target.contextId,
        },
      }).catch(() => {});

      toast({ title: 'Forwarded', description: `Sent to ${target.label}` });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to forward message', variant: 'destructive' });
    } finally {
      setSendingKey(null);
    }
  };

  const filtered = targets.filter(t => t.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Forward className="h-4 w-4" /> Forward message
          </DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Search channels and people..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9"
        />

        <div className="max-h-72 overflow-y-auto space-y-1">
          {loading && (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No destinations found</p>
          )}
          {filtered.map((t) => (
            <Button
              key={t.key}
              variant="ghost"
              className="w-full justify-start h-9 text-sm"
              disabled={sendingKey !== null}
              onClick={() => forwardTo(t)}
            >
              {t.contextType === 'channel'
                ? <Hash className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                : <MessageSquare className="h-3.5 w-3.5 mr-2 text-muted-foreground" />}
              <span className="truncate">{t.label}</span>
              {sendingKey === t.key && <Loader2 className="h-3.5 w-3.5 ml-auto animate-spin" />}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
