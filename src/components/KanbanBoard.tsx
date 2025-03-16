
import React, { useState } from 'react';
import KanbanColumn from './KanbanColumn';
import { useKanban } from '../context/KanbanContext';

const KanbanBoard: React.FC = () => {
  const { columns, moveCard } = useKanban();
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [sourceColumnId, setSourceColumnId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, cardId: string, columnId: string) => {
    setDraggingCardId(cardId);
    setSourceColumnId(columnId);
    e.dataTransfer.setData('text/plain', cardId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, destinationColumnId: string) => {
    e.preventDefault();
    
    if (!draggingCardId || !sourceColumnId) return;
    
    // Don't do anything if dropped in the same column
    if (sourceColumnId === destinationColumnId) return;
    
    moveCard(draggingCardId, sourceColumnId, destinationColumnId);
    
    setDraggingCardId(null);
    setSourceColumnId(null);
  };

  return (
    <div className="px-6 py-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map(column => (
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
  );
};

export default KanbanBoard;
