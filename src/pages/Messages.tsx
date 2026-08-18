import { useEffect, useState, useMemo } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { KanbanProvider } from '@/context/KanbanContext';
import Header from '@/components/Header';
import { ChatView } from '@/components/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Hash, Plus, MessageSquarePlus, Loader2, Users, Lock, LogIn,
  MoreVertical, Settings, UserPlus, Archive, ArchiveRestore, Trash2, Pencil, X as XIcon, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useOnlineUsers } from '@/hooks/usePresence';
import { useIsMobile } from '@/hooks/use-mobile';

const LAST_READ_KEY = 'messages_last_read_v1';
const loadLastRead = (): Record<string, number> => {
  try { return JSON.parse(localStorage.getItem(LAST_READ_KEY) || '{}'); } catch { return {}; }
};
const saveLastRead = (m: Record<string, number>) => {
  try { localStorage.setItem(LAST_READ_KEY, JSON.stringify(m)); } catch {}
};

type Channel = {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  created_by: string;
  archived_at: string | null;
  is_member?: boolean;
};

type DmConv = {
  id: string;
  is_group: boolean;
  name: string | null;
  members: { user_id: string; name: string }[];
};

type Profile = { id: string; full_name: string | null; email: string | null };

// Admin account is excluded from the DM picker (see memory: admin-role-access).
const ADMIN_EMAIL = 'mayordomo@recaste.com';
const isSelectableProfile = (p: Profile) =>
  !!p.full_name && (!p.email || p.email.toLowerCase() !== ADMIN_EMAIL);

type Selection =
  | { kind: 'channel'; id: string; label: string }
  | { kind: 'dm'; id: string; label: string }
  | null;

const MessagesContent = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [dms, setDms] = useState<DmConv[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [loadingLists, setLoadingLists] = useState(true);

  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [newDmOpen, setNewDmOpen] = useState(false);
  const [channelSettingsFor, setChannelSettingsFor] = useState<Channel | null>(null);
  const [channelMembersFor, setChannelMembersFor] = useState<Channel | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Unread tracking — counts of messages since lastRead per context
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [lastRead, setLastRead] = useState<Record<string, number>>(() => loadLastRead());

  const loadAll = async () => {
    if (!user) return;
    setLoadingLists(true);

    const [{ data: allChannels }, { data: myMembership }, { data: profs }] = await Promise.all([
      (supabase as any).from('chat_channels').select('*').order('name'),
      (supabase as any).from('channel_members').select('channel_id').eq('user_id', user.id),
      (supabase as any).from('profiles').select('id, full_name, email').not('full_name', 'is', null),
    ]);

    const memberSet = new Set<string>((myMembership || []).map((m: any) => m.channel_id));
    const enriched: Channel[] = (allChannels || []).map((c: any) => ({ ...c, is_member: memberSet.has(c.id) }));
    setChannels(enriched);
    setProfiles(((profs || []) as Profile[]).filter(isSelectableProfile));

    // DMs: fetch conversations where I'm a member
    const { data: myDmMem } = await (supabase as any)
      .from('dm_members').select('conversation_id').eq('user_id', user.id);
    const convIds = (myDmMem || []).map((m: any) => m.conversation_id);
    if (convIds.length) {
      const [{ data: convs }, { data: allMems }] = await Promise.all([
        (supabase as any).from('dm_conversations').select('*').in('id', convIds),
        (supabase as any).from('dm_members').select('conversation_id, user_id').in('conversation_id', convIds),
      ]);
      const profMap = new Map<string, string>((profs || []).map((p: any) => [p.id, p.full_name || 'Unknown']));
      const memsByConv = new Map<string, { user_id: string; name: string }[]>();
      (allMems || []).forEach((m: any) => {
        const arr = memsByConv.get(m.conversation_id) || [];
        arr.push({ user_id: m.user_id, name: profMap.get(m.user_id) || 'Unknown' });
        memsByConv.set(m.conversation_id, arr);
      });
      setDms((convs || []).map((c: any) => ({
        id: c.id, is_group: c.is_group, name: c.name,
        members: memsByConv.get(c.id) || [],
      })));
    } else {
      setDms([]);
    }

    setLoadingLists(false);
  };

  useEffect(() => { loadAll(); }, [user?.id]);

  // Realtime: refresh when channels / memberships / dms change
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel('messages-lists')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_channels' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_members' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_conversations' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_members' }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  // Compute initial unread counts whenever channel/DM lists or lastRead change
  useEffect(() => {
    if (!user) return;
    const channelIds = channels.filter(c => c.is_member).map(c => c.id);
    const dmIds = dms.map(d => d.id);
    if (channelIds.length === 0 && dmIds.length === 0) return;

    (async () => {
      const counts: Record<string, number> = {};
      const ctxIds = [...channelIds, ...dmIds];
      const { data } = await (supabase as any)
        .from('chat_messages')
        .select('context_id, created_at, user_id, context_type')
        .in('context_id', ctxIds)
        .in('context_type', ['channel', 'dm'])
        .order('created_at', { ascending: false })
        .limit(500);
      (data || []).forEach((m: any) => {
        if (m.user_id === user.id) return;
        const last = lastRead[m.context_id] || 0;
        if (new Date(m.created_at).getTime() > last) {
          counts[m.context_id] = (counts[m.context_id] || 0) + 1;
        }
      });
      setUnread(counts);
    })();
  }, [user?.id, channels, dms, lastRead]);

  // Realtime: bump unread count on new messages in any of my channels/DMs
  useEffect(() => {
    if (!user) return;
    const myCtx = new Set<string>([
      ...channels.filter(c => c.is_member).map(c => c.id),
      ...dms.map(d => d.id),
    ]);
    if (myCtx.size === 0) return;

    const ch = supabase
      .channel('messages-unread')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload: any) => {
          const m = payload.new;
          if (!m || m.user_id === user.id) return;
          if (!['channel', 'dm'].includes(m.context_type)) return;
          if (!myCtx.has(m.context_id)) return;
          // If user is actively viewing this conversation, mark as read instead
          if (selection && selection.id === m.context_id) {
            const next = { ...lastRead, [m.context_id]: Date.now() };
            setLastRead(next); saveLastRead(next);
            return;
          }
          setUnread(prev => ({ ...prev, [m.context_id]: (prev[m.context_id] || 0) + 1 }));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, channels, dms, selection?.id]);

  // Mark current selection as read on open / switch
  useEffect(() => {
    if (!selection) return;
    const next = { ...lastRead, [selection.id]: Date.now() };
    setLastRead(next); saveLastRead(next);
    setUnread(prev => {
      if (!prev[selection.id]) return prev;
      const { [selection.id]: _, ...rest } = prev;
      return rest;
    });
  }, [selection?.id]);

  // Deep-link via ?channel=<id> or ?dm=<id>
  useEffect(() => {
    if (loadingLists) return;
    const channelId = searchParams.get('channel');
    const dmId = searchParams.get('dm');
    if (channelId) {
      const c = channels.find(x => x.id === channelId);
      if (c) {
        setSelection({ kind: 'channel', id: c.id, label: c.name });
        setSearchParams({}, { replace: true });
      }
    } else if (dmId) {
      const d = dms.find(x => x.id === dmId);
      if (d) {
        setSelection({ kind: 'dm', id: d.id, label: d.name || (d.members.find(m => m.user_id !== user?.id)?.name || 'Direct message') });
        setSearchParams({}, { replace: true });
      }
    }
  }, [loadingLists, channels, dms, searchParams]);

  const joinChannel = async (channelId: string) => {
    if (!user) return;
    const { error } = await (supabase as any)
      .from('channel_members').insert({ channel_id: channelId, user_id: user.id });
    if (error && !error.message?.includes('duplicate')) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    loadAll();
  };

  const dmLabel = (dm: DmConv) => {
    if (dm.name) return dm.name;
    const others = dm.members.filter(m => m.user_id !== user?.id);
    if (others.length === 0) return 'You';
    return others.map(o => o.name).join(', ');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const myChannels = channels.filter(c => c.is_member);
  const activeMyChannels = myChannels.filter(c => !c.archived_at);
  const archivedMyChannels = myChannels.filter(c => !!c.archived_at);
  const browseChannels = channels.filter(c => !c.is_member && !c.is_private && !c.archived_at);

  const currentChannel = selection?.kind === 'channel'
    ? channels.find(c => c.id === selection.id) || null
    : null;

  // Slack-style mobile: show either the list or the conversation, never both.
  const isMobile = useIsMobile();
  const showList = !isMobile || !selection;
  const showConversation = !isMobile || !!selection;

  const leaveOrDeleteDm = async (dm: DmConv) => {
    if (!user) return;
    // Delete own membership; if conversation becomes empty, hard-delete the conversation
    const { error } = await (supabase as any)
      .from('dm_members').delete().eq('conversation_id', dm.id).eq('user_id', user.id);
    if (error) {
      toast({ title: 'Could not leave', description: error.message, variant: 'destructive' });
      return;
    }
    if (selection?.kind === 'dm' && selection.id === dm.id) setSelection(null);
    toast({ title: dm.is_group ? 'Left conversation' : 'Conversation removed' });
    loadAll();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Header />
      <main className="container mx-auto px-2 sm:px-4 py-4 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
          {/* Sidebar */}
          <aside className="bg-background border rounded-xl flex flex-col overflow-hidden h-[calc(100vh-140px)]">
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-5">
                {/* Channels */}
                <div>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Channels</h3>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setNewChannelOpen(true)}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {loadingLists ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto my-2" />
                  ) : (
                    <div className="space-y-0.5">
                      {activeMyChannels.length === 0 && (
                        <p className="text-xs text-muted-foreground px-2 py-1">No channels yet</p>
                      )}
                      {activeMyChannels.map(c => (
                        <button
                          key={c.id}
                          onClick={() => setSelection({ kind: 'channel', id: c.id, label: c.name })}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors",
                            selection?.kind === 'channel' && selection.id === c.id && "bg-accent font-medium",
                            unread[c.id] > 0 && !(selection?.kind === 'channel' && selection.id === c.id) && "font-bold text-foreground"
                          )}
                        >
                          {c.is_private ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : <Hash className="h-3.5 w-3.5 text-muted-foreground" />}
                          <span className="truncate flex-1 text-left">{c.name}</span>
                          {unread[c.id] > 0 && (
                            <Badge variant="destructive" className="h-4 min-w-[1rem] px-1 text-[10px] rounded-full flex items-center justify-center">
                              {unread[c.id] > 9 ? '9+' : unread[c.id]}
                            </Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {archivedMyChannels.length > 0 && (
                    <div className="mt-3">
                      <button
                        onClick={() => setShowArchived(s => !s)}
                        className="text-[10px] uppercase tracking-wide text-muted-foreground px-1 mb-1 hover:text-foreground"
                      >
                        {showArchived ? '▼' : '▶'} Archived ({archivedMyChannels.length})
                      </button>
                      {showArchived && (
                        <div className="space-y-0.5">
                          {archivedMyChannels.map(c => (
                            <button
                              key={c.id}
                              onClick={() => setSelection({ kind: 'channel', id: c.id, label: c.name })}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent transition-colors italic"
                            >
                              <Archive className="h-3.5 w-3.5" />
                              <span className="truncate flex-1 text-left">{c.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {browseChannels.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-1 mb-1">Browse</p>
                      <div className="space-y-0.5">
                        {browseChannels.map(c => (
                          <div key={c.id} className="flex items-center gap-1 px-2 py-1 rounded-md text-sm text-muted-foreground">
                            <Hash className="h-3.5 w-3.5" />
                            <span className="truncate flex-1">{c.name}</span>
                            <button
                              onClick={() => joinChannel(c.id)}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <LogIn className="h-3 w-3" /> Join
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* DMs */}
                <div>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Direct Messages</h3>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setNewDmOpen(true)}>
                      <MessageSquarePlus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-0.5">
                    {dms.length === 0 && !loadingLists && (
                      <p className="text-xs text-muted-foreground px-2 py-1">No direct messages</p>
                    )}
                    {dms.map(dm => (
                      <div key={dm.id} className="group relative">
                        <button
                          onClick={() => setSelection({ kind: 'dm', id: dm.id, label: dmLabel(dm) })}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 pr-8 rounded-md text-sm hover:bg-accent transition-colors text-left",
                            selection?.kind === 'dm' && selection.id === dm.id && "bg-accent font-medium",
                            unread[dm.id] > 0 && !(selection?.kind === 'dm' && selection.id === dm.id) && "font-bold text-foreground"
                          )}
                        >
                          {dm.is_group ? <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" /> : <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />}
                          <span className="truncate flex-1">{dmLabel(dm)}</span>
                          {unread[dm.id] > 0 && (
                            <Badge variant="destructive" className="h-4 min-w-[1rem] px-1 text-[10px] rounded-full flex items-center justify-center">
                              {unread[dm.id] > 9 ? '9+' : unread[dm.id]}
                            </Badge>
                          )}
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md opacity-60 hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-opacity"
                              title={dm.is_group ? 'Leave conversation' : 'Remove conversation'}
                            >
                              <XIcon className="h-3.5 w-3.5" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{dm.is_group ? 'Leave group?' : 'Remove conversation?'}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {dm.is_group
                                  ? 'You will stop seeing messages from this group. Other members keep their copy.'
                                  : 'This will hide the conversation from your sidebar. Messages remain stored.'}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => leaveOrDeleteDm(dm)}>
                                {dm.is_group ? 'Leave' : 'Remove'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </aside>

          {/* Main pane */}
          <section>
            {selection ? (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  {selection.kind === 'channel'
                    ? (currentChannel?.is_private ? <Lock className="h-4 w-4 text-muted-foreground" /> : <Hash className="h-4 w-4 text-muted-foreground" />)
                    : <Users className="h-4 w-4 text-muted-foreground" />}
                  <h2 className="text-lg font-semibold truncate flex-1">
                    {selection.label}
                    {currentChannel?.archived_at && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">(archived)</span>
                    )}
                  </h2>
                  {selection.kind === 'channel' && currentChannel && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => setChannelMembersFor(currentChannel)}>
                          <UserPlus className="h-4 w-4 mr-2" /> Members
                        </DropdownMenuItem>
                        {currentChannel.created_by === user.id && (
                          <>
                            <DropdownMenuItem onClick={() => setChannelSettingsFor(currentChannel)}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit channel
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => {
                                const newVal = currentChannel.archived_at ? null : new Date().toISOString();
                                const { error } = await (supabase as any)
                                  .from('chat_channels').update({ archived_at: newVal }).eq('id', currentChannel.id);
                                if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
                                else { toast({ title: newVal ? 'Channel archived' : 'Channel unarchived' }); loadAll(); }
                              }}
                            >
                              {currentChannel.archived_at
                                ? <><ArchiveRestore className="h-4 w-4 mr-2" /> Unarchive</>
                                : <><Archive className="h-4 w-4 mr-2" /> Archive</>}
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={async () => {
                            const { error } = await (supabase as any)
                              .from('channel_members').delete().eq('channel_id', currentChannel.id).eq('user_id', user.id);
                            if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
                            else { toast({ title: 'Left channel' }); setSelection(null); loadAll(); }
                          }}
                        >
                          <LogOut className="h-4 w-4 mr-2" /> Leave channel
                        </DropdownMenuItem>
                        {currentChannel.created_by === user.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Delete channel
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete #{currentChannel.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This permanently removes the channel and all its messages. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={async () => {
                                    await (supabase as any).from('chat_messages').delete().eq('context_type', 'channel').eq('context_id', currentChannel.id);
                                    await (supabase as any).from('channel_members').delete().eq('channel_id', currentChannel.id);
                                    const { error } = await (supabase as any).from('chat_channels').delete().eq('id', currentChannel.id);
                                    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
                                    else { toast({ title: 'Channel deleted' }); setSelection(null); loadAll(); }
                                  }}
                                >Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <ChatView
                  key={`${selection.kind}-${selection.id}`}
                  contextType={selection.kind}
                  contextId={selection.id}
                />
              </div>
            ) : (
              <div className="bg-background border rounded-xl h-[calc(100vh-140px)] flex items-center justify-center text-center p-8">
                <div>
                  <MessageSquarePlus className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-medium mb-1">Pick a conversation</h3>
                  <p className="text-sm text-muted-foreground">Choose a channel or DM on the left, or start a new one.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <NewChannelDialog
        open={newChannelOpen}
        onOpenChange={setNewChannelOpen}
        onCreated={(channelId, label) => {
          loadAll();
          setSelection({ kind: 'channel', id: channelId, label });
        }}
      />
      <NewDmDialog
        open={newDmOpen}
        onOpenChange={setNewDmOpen}
        profiles={profiles.filter(p => p.id !== user.id)}
        existingDms={dms}
        onSelected={(conv) => {
          setSelection({ kind: 'dm', id: conv.id, label: dmLabel(conv) });
          loadAll();
        }}
      />
      {channelSettingsFor && (
        <ChannelSettingsDialog
          channel={channelSettingsFor}
          onClose={() => setChannelSettingsFor(null)}
          onSaved={() => { setChannelSettingsFor(null); loadAll(); }}
        />
      )}
      {channelMembersFor && (
        <ChannelMembersDialog
          channel={channelMembersFor}
          allProfiles={profiles}
          currentUserId={user.id}
          onClose={() => setChannelMembersFor(null)}
          onChanged={() => loadAll()}
        />
      )}
    </div>
  );
};

const NewChannelDialog = ({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string, name: string) => void;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user || !name.trim()) return;
    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-');
    setBusy(true);
    const { data, error } = await (supabase as any)
      .from('chat_channels')
      .insert({ name: cleanName, description: description.trim() || null, is_private: isPrivate, created_by: user.id })
      .select().single();
    if (error) {
      toast({ title: 'Could not create channel', description: error.message, variant: 'destructive' });
      setBusy(false);
      return;
    }
    await (supabase as any).from('channel_members').insert({ channel_id: data.id, user_id: user.id });
    toast({ title: 'Channel created', description: `#${cleanName}` });
    setName(''); setDescription(''); setIsPrivate(false);
    setBusy(false);
    onOpenChange(false);
    onCreated(data.id, cleanName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Create a channel</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="ch-name">Name</Label>
            <div className="flex items-center gap-2 mt-1">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <Input id="ch-name" value={name} onChange={(e) => setName(e.target.value)}
                     placeholder="e.g. design" maxLength={40} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Lowercase, no spaces. Hyphens are fine.</p>
          </div>
          <div>
            <Label htmlFor="ch-desc">Description (optional)</Label>
            <Textarea id="ch-desc" value={description} onChange={(e) => setDescription(e.target.value)}
                      placeholder="What's this channel for?" rows={2} className="mt-1" />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Private channel</p>
              <p className="text-xs text-muted-foreground">Only invited members can join</p>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!name.trim() || busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const NewDmDialog = ({
  open, onOpenChange, profiles, existingDms, onSelected,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profiles: Profile[];
  existingDms: DmConv[];
  onSelected: (conv: DmConv) => void;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const onlineIds = useOnlineUsers();

  useEffect(() => { if (!open) { setSelected(new Set()); setSearch(''); } }, [open]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = useMemo(
    () => profiles.filter(p => (p.full_name || '').toLowerCase().includes(search.toLowerCase())),
    [profiles, search]
  );

  const submit = async () => {
    if (!user || selected.size === 0) return;
    setBusy(true);
    const memberIds = Array.from(selected);
    const isGroup = memberIds.length > 1;

    // For 1:1, reuse existing conversation if present
    if (!isGroup) {
      const other = memberIds[0];
      const existing = existingDms.find(dm =>
        !dm.is_group && dm.members.length === 2 &&
        dm.members.some(m => m.user_id === other) &&
        dm.members.some(m => m.user_id === user.id)
      );
      if (existing) {
        setBusy(false);
        onOpenChange(false);
        onSelected(existing);
        return;
      }
    }

    const { data: conv, error } = await (supabase as any)
      .from('dm_conversations')
      .insert({ is_group: isGroup, created_by: user.id })
      .select().single();
    if (error || !conv) {
      toast({ title: 'Failed to start conversation', description: error?.message, variant: 'destructive' });
      setBusy(false); return;
    }
    const rows = [user.id, ...memberIds].map(uid => ({ conversation_id: conv.id, user_id: uid }));
    const { error: memErr } = await (supabase as any).from('dm_members').insert(rows);
    if (memErr) {
      toast({ title: 'Failed to add members', description: memErr.message, variant: 'destructive' });
      setBusy(false); return;
    }
    const members = rows.map(r => ({
      user_id: r.user_id,
      name: profiles.find(p => p.id === r.user_id)?.full_name || 'You',
    }));
    setBusy(false);
    onOpenChange(false);
    onSelected({ id: conv.id, is_group: isGroup, name: null, members });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New direct message</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people..." />
          <ScrollArea className="h-64 border rounded-md">
            <div className="p-1">
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No people found</p>
              )}
              {filtered.map(p => (
                <label key={p.id} className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent cursor-pointer">
                  <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                  <span className="text-sm flex-1 flex items-center gap-2">
                    {p.full_name || 'Unknown'}
                    {onlineIds.has(p.id) && (
                      <span className="h-2 w-2 rounded-full bg-green-500" aria-label="Online" />
                    )}
                  </span>
                </label>
              ))}
            </div>
          </ScrollArea>
          <p className="text-xs text-muted-foreground">
            Pick one person for a direct message, or multiple to start a group DM.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={selected.size === 0 || busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {selected.size > 1 ? 'Start group DM' : 'Start DM'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Messages = () => (
  <KanbanProvider>
    <MessagesContent />
  </KanbanProvider>
);

export default Messages;

const ChannelSettingsDialog = ({
  channel, onClose, onSaved,
}: {
  channel: Channel;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const { toast } = useToast();
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description || '');
  const [isPrivate, setIsPrivate] = useState(channel.is_private);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-');
    if (!cleanName) return;
    setBusy(true);
    const { error } = await (supabase as any)
      .from('chat_channels')
      .update({ name: cleanName, description: description.trim() || null, is_private: isPrivate })
      .eq('id', channel.id);
    setBusy(false);
    if (error) {
      toast({ title: 'Could not update channel', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Channel updated' });
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Edit channel</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="ed-name">Name</Label>
            <div className="flex items-center gap-2 mt-1">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <Input id="ed-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
            </div>
          </div>
          <div>
            <Label htmlFor="ed-desc">Description</Label>
            <Textarea id="ed-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1" />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Private channel</p>
              <p className="text-xs text-muted-foreground">Only invited members can join</p>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!name.trim() || busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ChannelMembersDialog = ({
  channel, allProfiles, currentUserId, onClose, onChanged,
}: {
  channel: Channel;
  allProfiles: Profile[];
  currentUserId: string;
  onClose: () => void;
  onChanged: () => void;
}) => {
  const { toast } = useToast();
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const onlineIds = useOnlineUsers();

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('channel_members').select('user_id').eq('channel_id', channel.id);
      setMemberIds(new Set((data || []).map((m: any) => m.user_id)));
      setLoading(false);
    })();
  }, [channel.id]);

  const addMember = async (userId: string) => {
    const { error } = await (supabase as any)
      .from('channel_members').insert({ channel_id: channel.id, user_id: userId });
    if (error) {
      toast({ title: 'Could not add', description: error.message, variant: 'destructive' });
      return;
    }
    setMemberIds(prev => new Set([...prev, userId]));
    onChanged();
  };

  const removeMember = async (userId: string) => {
    const { error } = await (supabase as any)
      .from('channel_members').delete().eq('channel_id', channel.id).eq('user_id', userId);
    if (error) {
      toast({ title: 'Could not remove', description: error.message, variant: 'destructive' });
      return;
    }
    setMemberIds(prev => { const n = new Set(prev); n.delete(userId); return n; });
    onChanged();
  };

  const filtered = allProfiles.filter(p =>
    (p.full_name || '').toLowerCase().includes(search.toLowerCase())
  );
  const isCreator = channel.created_by === currentUserId;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>#{channel.name} members</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search team..." />
          <ScrollArea className="h-72 border rounded-md">
            <div className="p-1">
              {loading && <Loader2 className="h-4 w-4 animate-spin mx-auto my-4 text-muted-foreground" />}
              {!loading && filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No people found</p>
              )}
              {!loading && filtered.map(p => {
                const inChannel = memberIds.has(p.id);
                const isSelf = p.id === currentUserId;
                return (
                  <div key={p.id} className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent">
                    <span className="text-sm flex-1 truncate">
                      {p.full_name || 'Unknown'}
                      {isSelf && <span className="text-xs text-muted-foreground"> (you)</span>}
                      {onlineIds.has(p.id) && (
                        <span className="ml-2 inline-block h-2 w-2 rounded-full bg-green-500 align-middle" aria-label="Online" />
                      )}
                    </span>
                    {inChannel ? (
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-destructive"
                        disabled={isSelf && !isCreator}
                        onClick={() => removeMember(p.id)}
                      >Remove</Button>
                    ) : (
                      <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={() => addMember(p.id)}>
                        Add
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <p className="text-xs text-muted-foreground">
            {channel.is_private
              ? 'Private channel — only added members can see and post.'
              : 'Public channel — anyone can join, but adding people brings them straight in.'}
          </p>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};