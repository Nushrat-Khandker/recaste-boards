
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { X, Move, Pencil } from 'lucide-react';
import EditCardDialog from './EditCardDialog';
import { useKanban, Tag } from '../context/KanbanContext';

interface KanbanCardProps {
  id: string;
  title: string;
  description?: string;
  tags?: Tag[];
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

// Helper function to determine if a color is dark
const isColorDark = (hexColor: string): boolean => {
  // Remove the # if it exists
  const hex = hexColor.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance (perceived brightness)
  // Using the formula: (0.299*R + 0.587*G + 0.114*B)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return true if the color is dark (luminance < 0.5)
  return luminance < 0.5;
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { updateCard } = useKanban();

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

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditDialogOpen(true);
  };

  // Render tag with proper styling
  const renderTag = (tag: Tag) => {
    if (tag.customColor) {
      const isDark = isColorDark(tag.customColor);
      
      return (
        <span 
          key={tag.text} 
          className={`tag ${isDark ? 'text-white' : 'text-gray-800'}`}
          style={{ backgroundColor: tag.customColor }}
        >
          {tag.text}
        </span>
      );
    }
    
    return (
      <span 
        key={tag.text} 
        className={`tag ${tag.color || tagColors[tag.text] || 'bg-gray-100 text-gray-800'}`}
      >
        {tag.text}
      </span>
    );
  };

  return (
    <>
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
              onClick={handleEdit}
              aria-label="Edit card"
            >
              <Pencil size={14} />
            </button>
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
            {tags.map((tag) => renderTag(tag))}
            
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

      <EditCardDialog
        card={{ id, title, description, tags, priority }}
        columnId={columnId}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSave={updateCard}
      />
    </>
  );
};

export default KanbanCard;
