
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { X, Move } from 'lucide-react';

interface Tag {
  text: string;
  color: string;
}

interface KanbanCardProps {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  onDelete: () => void;
  onDragStart: (e: React.DragEvent, cardId: string, columnId: string) => void;
  columnId: string;
}

const tagColors: Record<string, string> = {
  'research': 'bg-kanban-tag-1 text-blue-800',
  'planning': 'bg-kanban-tag-2 text-purple-800',
  'design': 'bg-kanban-tag-3 text-orange-800',
  'development': 'bg-kanban-tag-4 text-green-800',
  'setup': 'bg-gray-100 text-gray-800',
  'low': 'bg-blue-50 text-blue-600',
  'medium': 'bg-yellow-50 text-yellow-600',
  'high': 'bg-red-50 text-red-600',
};

const KanbanCard: React.FC<KanbanCardProps> = ({
  id,
  title,
  description,
  tags = [],
  priority,
  onDelete,
  onDragStart,
  columnId
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(e, id, columnId);
    setTimeout(() => {
      e.currentTarget.classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('dragging');
  };

  return (
    <Card 
      className="kanban-card animate-hover group"
      draggable="true"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-card-id={id}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-sm mb-1">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mb-3">{description}</p>
          )}
        </div>
        
        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button 
            className="text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Delete card"
          >
            <X size={14} />
          </button>
          <div className="text-gray-400 cursor-grab p-0.5 rounded">
            <Move size={14} />
          </div>
        </div>
      </div>
      
      {(tags.length > 0 || priority) && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.map((tag) => (
            <span 
              key={tag} 
              className={`tag ${tagColors[tag] || 'bg-gray-100 text-gray-800'}`}
            >
              {tag}
            </span>
          ))}
          
          {priority && (
            <span 
              className={`tag ${tagColors[priority]}`}
            >
              {priority}
            </span>
          )}
        </div>
      )}
    </Card>
  );
};

export default KanbanCard;
