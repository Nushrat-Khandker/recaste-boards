import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Video } from 'lucide-react';
import { format } from 'date-fns';

interface CallRecord {
  id: string;
  board_name: string;
  call_type: string;
  initiated_by: string;
  participants: string[];
  duration_seconds: number | null;
  created_at: string;
}

interface CallsViewProps {
  boardName: string;
}

export function CallsView({ boardName }: CallsViewProps) {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchCalls();
  }, [boardName]);

  const fetchCalls = async () => {
    try {
      const { data, error } = await supabase
        .from('call_history')
        .select('*')
        .eq('board_name', boardName)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCalls(data || []);
    } catch (error: any) {
      console.error('Error fetching calls:', error);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'No duration';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Call History</h3>
          <p className="text-sm text-muted-foreground">Past audio and video calls for this board</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Phone className="h-4 w-4" />
            Audio Call
          </Button>
          <Button className="gap-2">
            <Video className="h-4 w-4" />
            Video Call
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {calls.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Phone className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No calls made yet</p>
            <p className="text-sm mt-1">Start a call to collaborate with your team</p>
          </Card>
        ) : (
          calls.map((call) => (
            <Card key={call.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {call.call_type === 'video' ? (
                    <Video className="h-5 w-5 text-primary" />
                  ) : (
                    <Phone className="h-5 w-5 text-primary" />
                  )}
                  <div>
                    <p className="font-medium">
                      {call.call_type === 'video' ? 'Video Call' : 'Audio Call'}
                    </p>
                    <div className="flex gap-2 text-sm text-muted-foreground">
                      <span>{format(new Date(call.created_at), 'MMM d, yyyy HH:mm')}</span>
                      {call.duration_seconds && (
                        <>
                          <span>•</span>
                          <span>{formatDuration(call.duration_seconds)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
