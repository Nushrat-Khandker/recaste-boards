
import React, { useState } from 'react';
import KanbanColumn from './KanbanColumn';
import { useKanban } from '../context/KanbanContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const KanbanBoard: React.FC = () => {
  const { filteredColumns, selectedNumber, selectedQuarter, moveCard, reorderCard, loading } = useKanban();
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [sourceColumnId, setSourceColumnId] = useState<string | null>(null);
  const [showSlackInput, setShowSlackInput] = useState(false);
  const [slackChannel, setSlackChannel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
    <div>
      {/* Fixed Header */}
      <div className="sticky top-[57px] z-10 bg-background backdrop-blur-md border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Kanban Board</h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSlackInput(!showSlackInput)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Send to Slack
            </Button>
          </div>
        </div>
        
        {showSlackInput && (
          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Slack channel (e.g., #general)"
              value={slackChannel}
              onChange={(e) => setSlackChannel(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={handleSendToSlack} disabled={isLoading} size="sm">
              Send
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowSlackInput(false)} 
              size="sm"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
      
      {/* Scrollable Content */}
      <div className="px-6 pt-2 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      </div>
    </div>
  );
};

export default KanbanBoard;
