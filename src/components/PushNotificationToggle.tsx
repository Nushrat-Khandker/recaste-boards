import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { isPushSupported, isPushSubscribed, subscribeToPush, unsubscribeFromPush } from '@/lib/push-notifications';

const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1));

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true);

export const PushNotificationToggle = () => {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const check = async () => {
      const sup = isPushSupported();
      setSupported(sup);
      if (sup) {
        const sub = await isPushSubscribed();
        setSubscribed(sub);
      }
    };
    check();
  }, []);

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    try {
      if (checked) {
        const success = await subscribeToPush();
        setSubscribed(success);
        toast({
          title: success ? 'Notifications enabled' : 'Failed to enable',
          description: success ? 'You will receive push notifications' : 'Please allow notifications in your browser settings',
          variant: success ? 'default' : 'destructive',
        });
      } else {
        await unsubscribeFromPush();
        setSubscribed(false);
        toast({ title: 'Notifications disabled' });
      }
    } finally {
      setLoading(false);
    }
  };

  // On iPhone/iPad, Safari AND Chrome both run WebKit: web push only works
  // once the app is installed to the Home Screen (iOS 16.4+).
  if (isIOS() && !isStandalone()) {
    return (
      <div className="flex items-start gap-2 px-2 py-1">
        <BellOff className="h-4 w-4 mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground leading-snug">
          On iPhone, add this app to your Home Screen (Share → Add to Home Screen),
          then open it from there to turn on push notifications.
        </p>
      </div>
    );
  }

  if (!supported) {
    return (
      <div className="flex items-center gap-2 px-2 py-1">
        <BellOff className="h-4 w-4" />
        <p className="text-xs text-muted-foreground">Push not supported in this browser</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1">
      {subscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
      <Label htmlFor="push-toggle" className="text-sm cursor-pointer flex-1">
        Push Notifications
      </Label>
      <Switch
        id="push-toggle"
        checked={subscribed}
        onCheckedChange={handleToggle}
        disabled={loading}
      />
    </div>
  );
};
