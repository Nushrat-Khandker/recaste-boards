
import React from 'react';
import KanbanCard from './KanbanCard';
import AddCard from './AddCard';
import { useKanban, KanbanCard as KanbanCardType, Tag } from '../context/KanbanContext';

interface KanbanColumnProps {
  id: string;
  title: string;
  cards: KanbanCardType[];
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, columnId: string) => void;
  onDragStart: (e: React.DragEvent, cardId: string, columnId: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  cards,
  onDragOver,
  onDrop,
  onDragStart
}) => {
  const { addCard, deleteCard } = useKanban();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(e);
    const column = e.currentTarget;
    column.classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const column = e.currentTarget;
    column.classList.remove('drag-over');
  };

  const handleDrop = (e: React.DragEvent) => {
    const column = e.currentTarget;
    column.classList.remove('drag-over');
    onDrop(e, id);
  };

  const handleAddCard = (columnId: string, cardData: { title: string; description?: string; tags?: string[] }) => {
    // Convert string[] tags to Tag[] objects to match the KanbanCard type
    const formattedCardData: Omit<KanbanCardType, 'id'> = {
      title: cardData.title,
      description: cardData.description,
      // Convert string tags to Tag objects with default colors
      tags: cardData.tags?.map(tagText => ({ text: tagText, color: 'bg-gray-100 text-gray-800' }))
    };
    
    addCard(columnId, formattedCardData);
  };

  return (
    <div 
      className="kanban-column flex flex-col h-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-column-id={id}
    >
      {/* Sticky column header */}
      <div className="sticky top-[89px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b py-2 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium text-sm tracking-wide uppercase">{title}</h2>
          <div className="flex items-center gap-2">
            <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
              {cards.length}
            </span>
            <AddCard 
              columnId={id} 
              onAddCard={handleAddCard}
              variant="compact"
            />
          </div>
        </div>
      </div>
      
      {/* Cards container */}
      <div className="flex-1 space-y-3">
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            id={card.id}
            title={card.title}
            description={card.description}
            projectName={card.projectName}
            tags={card.tags}
            priority={card.priority}
            number={card.number}
            quarter={card.quarter}
            startDate={card.startDate}
            dueDate={card.dueDate}
            onDelete={() => deleteCard(id, card.id)}
            onDragStart={onDragStart}
            columnId={id}
          />
        ))}
      </div>
      
      {/* Add card at bottom */}
      <div className="mt-4">
        <AddCard 
          columnId={id} 
          onAddCard={handleAddCard} 
        />
      </div>
    </div>
  );
};

export default KanbanColumn;
