import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

const EVENT_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
];

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  color: string;
  user_id: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  event?: CalendarEvent | null;
  date: string; // yyyy-MM-dd
  onSaved: () => void;
}

export default function CalendarEventDialog({ isOpen, onClose, event, date, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setColor(event.color);
    } else {
      setTitle('');
      setDescription('');
      setColor(EVENT_COLORS[0]);
    }
  }, [event, isOpen]);

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Not authenticated'); return; }

      if (event && event.id) {
        await supabase.from('calendar_events').update({
          title: title.trim(), description: description.trim() || null, color
        }).eq('id', event.id);
        toast.success('Event updated');
      } else {
        await supabase.from('calendar_events').insert({
          title: title.trim(), description: description.trim() || null, date, color, user_id: user.id
        });
        toast.success('Event created');
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error('Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    try {
      await supabase.from('calendar_events').delete().eq('id', event.id);
      toast.success('Event deleted');
      onSaved();
      onClose();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit Event' : 'New Calendar Event'}</DialogTitle>
          <DialogDescription>
            {event ? 'Update this calendar event.' : 'Add a standalone event to the calendar (no task board card).'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Details..." rows={3} />
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex gap-2 mt-1">
              {EVENT_COLORS.map(c => (
                <button
                  key={c}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  type="button"
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          {event && (
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
