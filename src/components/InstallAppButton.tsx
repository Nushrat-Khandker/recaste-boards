import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Download, Share, Plus } from 'lucide-react';

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS
    (window.navigator as any).standalone === true);

const isIOS = () =>
  typeof navigator !== 'undefined' &&
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !(window as any).MSStream;

export function InstallAppButton({
  variant = 'outline',
  size = 'sm',
  className,
}: {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;
  // Hide entirely if no native prompt and not iOS (e.g. desktop Firefox)
  if (!deferred && !isIOS()) return null;

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      return;
    }
    setShowIOSHelp(true);
  };

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={handleClick}>
        <Download className="h-4 w-4 mr-2" />
        Install app
      </Button>

      <Dialog open={showIOSHelp} onOpenChange={setShowIOSHelp}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Install on iPhone</DialogTitle>
            <DialogDescription>
              Safari doesn't show an install button, so add it manually:
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="font-semibold">1.</span>
              <span className="flex items-center gap-1">
                Tap the <Share className="h-4 w-4 inline" /> Share icon at the bottom of Safari
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">2.</span>
              <span className="flex items-center gap-1">
                Choose <Plus className="h-4 w-4 inline" /> <strong>Add to Home Screen</strong>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">3.</span>
              <span>Tap <strong>Add</strong> — the app icon will appear on your home screen.</span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}