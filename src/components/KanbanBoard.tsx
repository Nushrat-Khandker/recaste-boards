
import React, { useState } from 'react';
import KanbanColumn from './KanbanColumn';
import { useKanban } from '../context/KanbanContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Calendar as CalendarIcon, LayoutGrid, Trash2, X, CheckSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { HijriCalendar } from './HijriCalendar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const KanbanBoard: React.FC = () => {
  const { filteredColumns, selectedNumber, selectedQuarter, moveCard, reorderCard, loading, deleteCard } = useKanban();
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [sourceColumnId, setSourceColumnId] = useState<string | null>(null);
  const [showSlackInput, setShowSlackInput] = useState(false);
  const [slackChannel, setSlackChannel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'board' | 'calendar'>('board');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Map<string, string>>(new Map()); // cardId -> columnId
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const toggleCardSelection = (cardId: string, columnId: string) => {
    setSelectedCards(prev => {
      const next = new Map(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.set(cardId, columnId);
      }
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  };

  const handleEnterSelectionMode = (cardId: string, columnId: string) => {
    setSelectionMode(true);
    setSelectedCards(new Map([[cardId, columnId]]));
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedCards(new Map());
  };

  const handleArchiveSelected = async () => {
    for (const [cardId, columnId] of selectedCards) {
      await deleteCard(columnId, cardId);
    }
    toast({ title: "Archived", description: `${selectedCards.size} card(s) archived.` });
    handleCancelSelection();
    setShowArchiveConfirm(false);
  };

  const handleDeleteSelected = async () => {
    for (const [cardId, columnId] of selectedCards) {
      await deleteCard(columnId, cardId);
    }
    toast({ title: "Deleted", description: `${selectedCards.size} card(s) permanently deleted.` });
    handleCancelSelection();
    setShowDeleteConfirm(false);
  };

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
    <div className="relative">
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
            selectionMode={selectionMode}
            selectedCards={selectedCards}
            onToggleSelect={toggleCardSelection}
            onEnterSelectionMode={handleEnterSelectionMode}
          />
        ))}
      </div>

      {/* Floating selection bar */}
      {selectionMode && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-full shadow-lg px-4 py-2 flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <span className="text-sm font-medium text-foreground">
            {selectedCards.size} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => setShowArchiveConfirm(true)}
            disabled={selectedCards.size === 0}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Archive
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="rounded-full"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={selectedCards.size === 0}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={handleCancelSelection}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Archive confirmation */}
      <AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {selectedCards.size} card{selectedCards.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected cards. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete {selectedCards.size} card{selectedCards.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected cards. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default KanbanBoard;
