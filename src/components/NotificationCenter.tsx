import { useState, useEffect } from 'react';
import { Bell, AtSign, Reply, MessageSquare, Hash, UserCheck, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { isNative, showLocalNotification } from '@/lib/native-notifications';

const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.5;
    void audio.play().catch(() => {});
  } catch {}
};

// Native pop-up — works automatically in Electron desktop wrapper and in
// browsers/PWAs where the user has granted Notification permission.
const showDesktopNotification = (n: { title: string; message: string | null; link: string | null }) => {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (document.visibilityState === 'visible') return; // skip when tab is focused
    const fire = () => {
      const note = new Notification(n.title, {
        body: n.message || '',
        icon: '/placeholder.svg',
        tag: 'recaste-' + Math.random(),
      });
      note.onclick = () => {
        window.focus();
        if (n.link) window.location.href = n.link;
      };
    };
    if (Notification.permission === 'granted') fire();
    else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((p) => { if (p === 'granted') fire(); });
    }
  } catch {}
};

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

const typeIcon = (type: string) => {
  switch (type) {
    case 'mention': return <AtSign className="h-3.5 w-3.5 text-primary" />;
    case 'reply': return <Reply className="h-3.5 w-3.5 text-primary" />;
    case 'assignment': return <UserCheck className="h-3.5 w-3.5 text-primary" />;
    case 'channel_message': return <Hash className="h-3.5 w-3.5 text-primary" />;
    case 'dm_message': return <Send className="h-3.5 w-3.5 text-primary" />;
    default: return <MessageSquare className="h-3.5 w-3.5 text-primary" />;
  }
};

export const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let channel: any;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      loadNotifications();

      channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const n = payload.new as Notification;
            let isNew = false;
            setNotifications((prev) => {
              if (prev.some((p) => p.id === n.id)) return prev;
              isNew = true;
              return [n, ...prev].slice(0, 30);
            });
            if (!isNew) return;
            setUnreadCount((prev) => prev + (n.read ? 0 : 1));
            playNotificationSound();
            if (isNative()) {
              // iOS/Android (Capacitor): pop a native tray notification
              void showLocalNotification(n.title, n.message || '');
            } else {
              showDesktopNotification({ title: n.title, message: n.message, link: n.link });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const n = payload.new as Notification;
            setNotifications((prev) => prev.map((p) => (p.id === n.id ? n : p)));
            void refreshUnreadCount();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
          },
          (payload) => {
            const id = (payload.old as any)?.id;
            if (id) setNotifications((prev) => prev.filter((p) => p.id !== id));
            void refreshUnreadCount();
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Re-sync when the tab regains focus so the bell never shows a stale count
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === 'visible') loadNotifications(); };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const loadNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await (supabase as any)
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (data) setNotifications(data);
    await refreshUnreadCount();
  };

  // Count unread straight from the DB so the badge isn't capped by the 30-row list
  const refreshUnreadCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await (supabase as any)
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);
    setUnreadCount(count ?? 0);
  };

  const markAsRead = async (notificationId: string) => {
    await (supabase as any)
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    void refreshUnreadCount();
  };

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any)
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-10 sm:w-10">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between px-2 py-2">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`cursor-pointer ${
                !notification.read ? 'bg-muted/50' : ''
              }`}
            >
              <div className="flex flex-col gap-1 w-full">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex items-start gap-1.5 font-medium text-sm">
                    <span className="mt-0.5 flex-shrink-0">{typeIcon(notification.type)}</span>
                    {notification.title}
                  </span>
                  {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                  )}
                </div>
                {notification.message && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
