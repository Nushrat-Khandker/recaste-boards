
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from 'lucide-react';

interface AddCardProps {
  columnId: string;
  onAddCard: (columnId: string, card: { title: string; description?: string; projectName?: string; tags?: string[] }) => void;
  variant?: 'default' | 'compact';
}

const AddCard: React.FC<AddCardProps> = ({ columnId, onAddCard, variant = 'default' }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectName, setProjectName] = useState('');
  const [tags, setTags] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;
    
    const tagsArray = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag);
    
    onAddCard(columnId, {
      title,
      description: description.trim() || undefined,
      projectName: projectName.trim() || undefined,
      tags: tagsArray.length > 0 ? tagsArray : undefined
    });
    
    // Reset form
    setTitle('');
    setDescription('');
    setProjectName('');
    setTags('');
    setIsAdding(false);
  };

  if (!isAdding) {
    if (variant === 'compact') {
      return (
        <Button
          onClick={() => setIsAdding(true)}
          variant="outline"
          size="sm"
          className="h-8 px-2"
        >
          <Plus size={14} />
        </Button>
      );
    }
    
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="mt-2 flex items-center justify-center p-2 w-full text-sm text-muted-foreground rounded-md border border-dashed border-gray-200 hover:bg-secondary transition-colors animate-click"
      >
        <Plus size={14} className="mr-1" />
        Add a card
      </button>
    );
  }

  return (
    <Card className="shadow-md p-3 mt-2 animate-scale-in">
      <form onSubmit={handleSubmit}>
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-medium">Add new card</h4>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        
        <Input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-2"
          autoFocus
        />
        
        <Input
          placeholder="Project name (optional)"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="mb-2"
        />
        
        <Textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mb-2 min-h-[80px] text-sm"
        />
        
        <Input
          placeholder="Tags (comma separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="mb-3"
        />
        
        <div className="flex justify-end">
          <Button
            type="submit"
            className="animate-click"
            disabled={!title.trim()}
            variant="default"
            size="sm"
          >
            Add card
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default AddCard;
