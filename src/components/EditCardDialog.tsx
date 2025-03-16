
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { KanbanCard } from '../context/KanbanContext';

interface EditCardDialogProps {
  card: KanbanCard;
  columnId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (columnId: string, updatedCard: KanbanCard) => void;
}

const EditCardDialog: React.FC<EditCardDialogProps> = ({
  card,
  columnId,
  isOpen,
  onClose,
  onSave
}) => {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [tags, setTags] = useState(card.tags ? card.tags.join(', ') : '');
  const [priority, setPriority] = useState(card.priority || 'medium');

  const handleSave = () => {
    if (!title.trim()) return;
    
    const tagsArray = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag);
    
    const updatedCard: KanbanCard = {
      ...card,
      title,
      description: description.trim() || undefined,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
      priority: priority as 'low' | 'medium' | 'high' | undefined
    };
    
    onSave(columnId, updatedCard);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Card</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="title" className="text-sm font-medium">Title</label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter card title"
            />
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="description" className="text-sm font-medium">Description</label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description (optional)"
              className="min-h-[80px]"
            />
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="tags" className="text-sm font-medium">Tags</label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Enter tags separated by commas"
            />
            <p className="text-xs text-muted-foreground">Separate tags with commas (e.g., design, frontend, bug)</p>
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="priority" className="text-sm font-medium">Priority</label>
            <select 
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!title.trim()}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditCardDialog;
