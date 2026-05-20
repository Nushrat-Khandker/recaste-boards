import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';

export const isNative = () => Capacitor.isNativePlatform();

/**
 * Initialise native notifications on iOS / Android (Capacitor).
 * Falls back to LocalNotifications so chat pings work even without FCM/APNs.
 */
export async function initNativeNotifications() {
  if (!isNative()) return;

  try {
    const local = await LocalNotifications.requestPermissions();
    if (local.display === 'granted') {
      try { await LocalNotifications.createChannel({
        id: 'chat',
        name: 'Chat',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
      }); } catch {}
    }

    const push = await PushNotifications.requestPermissions();
    if (push.receive === 'granted') {
      await PushNotifications.register();

      PushNotifications.addListener('registration', async (token) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        try {
          await supabase.functions.invoke('push-notifications', {
            body: {
              action: 'subscribe_native',
              platform: Capacitor.getPlatform(),
              token: token.value,
            },
          });
        } catch (e) {
          console.warn('native push token store failed', e);
        }
      });

      PushNotifications.addListener('pushNotificationReceived', async (n) => {
        // Foreground push: show as local notification so it pops up
        try {
          await LocalNotifications.schedule({
            notifications: [{
              id: Math.floor(Math.random() * 1_000_000),
              title: n.title || 'New message',
              body: n.body || '',
              channelId: 'chat',
            }],
          });
        } catch {}
      });
    }
  } catch (e) {
    console.warn('native notifications init failed', e);
  }
}

/** Manually fire a local notification (used as a fallback when no FCM token). */
export async function showLocalNotification(title: string, body: string) {
  if (!isNative()) return;
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: Math.floor(Math.random() * 1_000_000),
        title,
        body,
        channelId: 'chat',
      }],
    });
  } catch {}
}