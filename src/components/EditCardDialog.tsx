
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react"; // Added missing import for X icon
import { KanbanCard, Tag } from '../context/KanbanContext';

interface EditCardDialogProps {
  card: KanbanCard;
  columnId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (columnId: string, updatedCard: KanbanCard) => void;
}

// Available tag colors for selection
const tagColorOptions = [
  { label: 'Blue', value: 'bg-blue-100 text-blue-800' },
  { label: 'Green', value: 'bg-green-100 text-green-800' },
  { label: 'Purple', value: 'bg-purple-100 text-purple-800' },
  { label: 'Orange', value: 'bg-orange-100 text-orange-800' },
  { label: 'Red', value: 'bg-red-100 text-red-800' },
  { label: 'Yellow', value: 'bg-yellow-100 text-yellow-800' },
  { label: 'Indigo', value: 'bg-indigo-100 text-indigo-800' },
  { label: 'Gray', value: 'bg-gray-100 text-gray-800' },
];

const EditCardDialog: React.FC<EditCardDialogProps> = ({
  card,
  columnId,
  isOpen,
  onClose,
  onSave
}) => {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [tags, setTags] = useState<Tag[]>(card.tags || []);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(card.priority || 'medium');
  const [newTagText, setNewTagText] = useState('');
  const [selectedColor, setSelectedColor] = useState(tagColorOptions[0].value);

  const handleAddTag = () => {
    if (newTagText.trim()) {
      setTags([...tags, { text: newTagText.trim(), color: selectedColor }]);
      setNewTagText('');
    }
  };

  const handleRemoveTag = (index: number) => {
    const newTags = [...tags];
    newTags.splice(index, 1);
    setTags(newTags);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    
    const updatedCard: KanbanCard = {
      ...card,
      title,
      description: description.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      priority: priority
    };
    
    onSave(columnId, updatedCard);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagText.trim()) {
      e.preventDefault();
      handleAddTag();
    }
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
            <label className="text-sm font-medium">Tags</label>
            
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map((tag, index) => (
                <Badge 
                  key={index} 
                  className={`${tag.color} cursor-pointer flex items-center gap-1`}
                  onClick={() => handleRemoveTag(index)}
                >
                  {tag.text}
                  <X size={12} className="ml-1" />
                </Badge>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Input
                value={newTagText}
                onChange={(e) => setNewTagText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a tag"
                className="flex-1"
              />
              
              <select 
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="h-10 w-28 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {tagColorOptions.map((color) => (
                  <option key={color.value} value={color.value}>
                    {color.label}
                  </option>
                ))}
              </select>
              
              <Button 
                type="button" 
                onClick={handleAddTag}
                disabled={!newTagText.trim()}
                variant="outline"
                className="shrink-0"
              >
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Click on a tag to remove it</p>
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="priority" className="text-sm font-medium">Priority</label>
            <select 
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
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
