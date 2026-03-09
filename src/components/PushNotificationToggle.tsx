import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { isPushSupported, isPushSubscribed, subscribeToPush, unsubscribeFromPush } from '@/lib/push-notifications';

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

  if (!supported) return null;

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
