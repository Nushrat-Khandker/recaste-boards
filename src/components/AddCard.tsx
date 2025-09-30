
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import EditCardDialog from './EditCardDialog';
import { KanbanCard } from '../context/KanbanContext';

interface AddCardProps {
  columnId: string;
  onAddCard: (columnId: string, card: { title: string; description?: string; projectName?: string; tags?: string[] }) => void;
  variant?: 'default' | 'compact';
}

const AddCard: React.FC<AddCardProps> = ({ columnId, onAddCard, variant = 'default' }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Create a new card template for the dialog
  const newCard: KanbanCard = {
    id: 'new',
    title: '',
    description: '',
    projectName: '',
    tags: [],
    priority: 'medium'
  };

  const handleSave = (columnId: string, updatedCard: KanbanCard) => {
    if (!updatedCard.title.trim()) return;
    
    // Convert tags from Tag[] to string[] for the parent component
    const tagsArray = updatedCard.tags?.map(tag => tag.text) || [];
    
    onAddCard(columnId, {
      title: updatedCard.title,
      description: updatedCard.description,
      projectName: updatedCard.projectName,
      tags: tagsArray.length > 0 ? tagsArray : undefined
    });
    
    setIsDialogOpen(false);
  };

  if (variant === 'compact') {
    return (
      <>
        <Button
          onClick={() => setIsDialogOpen(true)}
          variant="outline"
          size="sm"
          className="h-8 px-2"
        >
          <Plus size={14} />
        </Button>
        <EditCardDialog
          card={newCard}
          columnId={columnId}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={handleSave}
          isNew={true}
        />
      </>
    );
  }
  
  return (
    <>
      <button
        onClick={() => setIsDialogOpen(true)}
        className="mt-2 flex items-center justify-center p-2 w-full text-sm text-muted-foreground rounded-md border border-dashed border-gray-200 hover:bg-secondary transition-colors animate-click"
      >
        <Plus size={14} className="mr-1" />
        Add a card
      </button>
      <EditCardDialog
        card={newCard}
        columnId={columnId}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
        isNew={true}
      />
    </>
  );
};

export default AddCard;
