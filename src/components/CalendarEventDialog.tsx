import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2, Briefcase, User, Clock, Palmtree } from 'lucide-react';
import { cn } from '@/lib/utils';

const EVENT_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
];

const EVENT_TYPES = [
  { value: 'personal', label: 'Personal', icon: User, description: 'Only visible to you' },
  { value: 'out_of_office', label: 'Out of Office', icon: Palmtree, description: 'Team sees you\'re away' },
  { value: 'focus_time', label: 'Focus Time', icon: Clock, description: 'Block time for deep work' },
  { value: 'work', label: 'Work Event', icon: Briefcase, description: 'Shared team event' },
];

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  color: string;
  user_id: string;
  event_type?: string;
  visibility?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  event?: CalendarEvent | null;
  date: string;
  onSaved: () => void;
}

export default function CalendarEventDialog({ isOpen, onClose, event, date, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [eventType, setEventType] = useState('personal');
  const [shareWithTeam, setShareWithTeam] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setColor(event.color);
      setEventType(event.event_type || 'personal');
      setShareWithTeam(event.visibility === 'team');
    } else {
      setTitle('');
      setDescription('');
      setColor(EVENT_COLORS[0]);
      setEventType('personal');
      setShareWithTeam(false);
    }
  }, [event, isOpen]);

  // Auto-share for out_of_office and work events
  useEffect(() => {
    if (eventType === 'out_of_office' || eventType === 'work') {
      setShareWithTeam(true);
    }
  }, [eventType]);

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Not authenticated'); return; }

      const visibility = shareWithTeam ? 'team' : 'private';

      if (event && event.id) {
        await supabase.from('calendar_events').update({
          title: title.trim(),
          description: description.trim() || null,
          color,
          event_type: eventType,
          visibility,
        }).eq('id', event.id);
        toast.success('Event updated');
      } else {
        await supabase.from('calendar_events').insert({
          title: title.trim(),
          description: description.trim() || null,
          date,
          color,
          user_id: user.id,
          event_type: eventType,
          visibility,
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
            {event ? 'Update this calendar event.' : 'Add a personal or team event to the calendar.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Event Type Picker */}
          <div>
            <Label>Event Type</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {EVENT_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setEventType(type.value)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border text-left text-sm transition-all",
                      eventType === type.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <div>
                      <div className="font-medium text-xs">{type.label}</div>
                      <div className="text-[10px] text-muted-foreground">{type.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Details..." rows={3} />
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label className="text-sm">Share with team</Label>
              <p className="text-xs text-muted-foreground">Team members can see this event title</p>
            </div>
            <Switch
              checked={shareWithTeam}
              onCheckedChange={setShareWithTeam}
              disabled={eventType === 'out_of_office' || eventType === 'work'}
            />
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
