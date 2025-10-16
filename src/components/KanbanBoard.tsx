
import React, { useState } from 'react';
import KanbanColumn from './KanbanColumn';
import { useKanban } from '../context/KanbanContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Calendar as CalendarIcon, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { HijriCalendar } from './HijriCalendar';

const KanbanBoard: React.FC = () => {
  const { filteredColumns, selectedNumber, selectedQuarter, moveCard, reorderCard, loading } = useKanban();
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [sourceColumnId, setSourceColumnId] = useState<string | null>(null);
  const [showSlackInput, setShowSlackInput] = useState(false);
  const [slackChannel, setSlackChannel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'board' | 'calendar'>('board');
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="px-6 py-4 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your kanban board...</p>
        </div>
      </div>
    );
  }

  const handleDragStart = (e: React.DragEvent, cardId: string, columnId: string) => {
    setDraggingCardId(cardId);
    setSourceColumnId(columnId);
    e.dataTransfer.setData('text/plain', cardId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, destinationColumnId: string, dropIndex?: number) => {
    e.preventDefault();
    
    if (!draggingCardId || !sourceColumnId) return;
    
    if (sourceColumnId === destinationColumnId) {
      // Handle reordering within the same column
      if (dropIndex !== undefined) {
        reorderCard(destinationColumnId, draggingCardId, dropIndex);
      }
    } else {
      // Handle moving between columns
      moveCard(draggingCardId, sourceColumnId, destinationColumnId);
    }
    
    setDraggingCardId(null);
    setSourceColumnId(null);
  };

  const handleSendToSlack = async () => {
    if (!slackChannel.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Slack channel",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('slack-integration', {
        body: {
          action: 'send_board_summary',
          channel: slackChannel
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Board summary sent to Slack!",
      });
      
      setShowSlackInput(false);
      setSlackChannel('');
    } catch (error) {
      console.error('Error sending to Slack:', error);
      toast({
        title: "Error",
        description: "Failed to send board summary to Slack",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
      {filteredColumns.map(column => (
        <KanbanColumn
          key={column.id}
          id={column.id}
          title={column.title}
          cards={column.cards}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragStart={handleDragStart}
        />
      ))}
    </div>
  );
};

export default KanbanBoard;
