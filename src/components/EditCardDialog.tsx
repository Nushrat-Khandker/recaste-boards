import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react"; 
import { KanbanCard, Tag } from '../context/KanbanContext';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

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

interface ColorWheelProps {
  onSelectColor: (colorClass: string) => void;
}

const ColorWheel: React.FC<ColorWheelProps> = ({ onSelectColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Create color wheel on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2 - 5;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw color wheel
    for (let angle = 0; angle < 360; angle++) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = (angle + 1) * Math.PI / 180;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      const hue = angle;
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.fill();
    }

    // Draw inner white to black gradient for saturation/lightness
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const imageData = ctx.getImageData(x, y, 1, 1).data;
    
    // Format the RGB values
    const r = imageData[0];
    const g = imageData[1];
    const b = imageData[2];
    
    // Create the CSS rgb string
    const rgbColor = `rgb(${r}, ${g}, ${b})`;
    
    onSelectColor(rgbColor);
  };

  return (
    <div className="flex flex-col items-center gap-2 p-2">
      <canvas 
        ref={canvasRef} 
        width={200} 
        height={200} 
        onClick={handleClick}
        className="cursor-pointer rounded-full"
      />
      <p className="text-xs text-center">Click on the wheel to select a color</p>
    </div>
  );
};

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
  const [customColor, setCustomColor] = useState<string | null>(null);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  // Reset form when card changes
  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description || '');
    setTags(card.tags || []);
    setPriority(card.priority || 'medium');
    setCustomColor(null);
  }, [card]);

  const handleSelectPreset = (colorValue: string) => {
    setSelectedColor(colorValue);
    setCustomColor(null);
  };

  const handleSelectCustomColor = (rgbColor: string) => {
    setCustomColor(rgbColor);
  };

  const handleAddTag = () => {
    if (newTagText.trim()) {
      const newTag: Tag = { 
        text: newTagText.trim()
      };
      
      if (customColor) {
        newTag.customColor = customColor;
      } else {
        newTag.color = selectedColor;
      }
      
      setTags([...tags, newTag]);
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
  
  // Render tag with either tailwind class or inline style
  const renderTag = (tag: Tag, index: number) => {
    if (tag.customColor) {
      return (
        <Badge 
          key={index} 
          className="cursor-pointer flex items-center gap-1 text-gray-800"
          style={{ backgroundColor: tag.customColor }}
          onClick={() => handleRemoveTag(index)}
        >
          {tag.text}
          <X size={12} className="ml-1" />
        </Badge>
      );
    }
    
    return (
      <Badge 
        key={index} 
        className={`cursor-pointer flex items-center gap-1 ${tag.color}`}
        onClick={() => handleRemoveTag(index)}
      >
        {tag.text}
        <X size={12} className="ml-1" />
      </Badge>
    );
  };
  
  // Render the color preview button
  const renderColorPreview = () => {
    if (customColor) {
      return (
        <div 
          className="w-6 h-6 rounded-full border border-gray-200"
          style={{ backgroundColor: customColor }}
        />
      );
    }
    
    // For preset colors, use tailwind classes
    return (
      <div 
        className={`w-6 h-6 rounded-full border border-gray-200 ${selectedColor.split(' ')[0]}`}
      />
    );
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
              {tags.map((tag, index) => renderTag(tag, index))}
            </div>
            
            <div className="flex gap-2">
              <Input
                value={newTagText}
                onChange={(e) => setNewTagText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a tag"
                className="flex-1"
              />
              
              <Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-10 w-10 p-0 flex items-center justify-center"
                  >
                    {renderColorPreview()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-auto p-0" 
                  align="end"
                >
                  <div className="p-2">
                    <div className="mb-2">
                      <p className="text-sm font-medium mb-2">Presets</p>
                      <div className="flex flex-wrap gap-1">
                        {tagColorOptions.map((colorOption) => (
                          <button
                            key={colorOption.value}
                            onClick={() => handleSelectPreset(colorOption.value)}
                            className={`w-6 h-6 rounded-full ${colorOption.value.split(' ')[0]} border border-gray-200`}
                            title={colorOption.label}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="border-t pt-2">
                      <p className="text-sm font-medium mb-2">Custom color</p>
                      <ColorWheel onSelectColor={handleSelectCustomColor} />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
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
