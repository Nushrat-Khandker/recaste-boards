
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
  color: string;
  onChange: (color: string) => void;
}

const ColorWheel: React.FC<ColorWheelProps> = ({ color, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedColor, setSelectedColor] = useState(color);

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

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Stop event propagation to prevent popover from closing
    e.stopPropagation();
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const imageData = ctx.getImageData(x, y, 1, 1).data;
    const rgbColor = `rgb(${imageData[0]}, ${imageData[1]}, ${imageData[2]})`;
    
    // Convert to HSL to determine text color
    const r = imageData[0] / 255;
    const g = imageData[1] / 255;
    const b = imageData[2] / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    
    // Use light text for dark backgrounds, dark text for light backgrounds
    const textColor = l < 0.6 ? 'text-white' : 'text-gray-800';
    
    // Generate a temporary class that will be converted to a tailwind class by our backend
    const tailwindClass = `bg-[${rgbColor}] ${textColor}`;
    
    setSelectedColor(tailwindClass);
    onChange(tailwindClass);
    
    console.log('Selected color:', tailwindClass); // Debug log
  };

  return (
    <div className="flex flex-col items-center gap-2 p-2" onClick={(e) => e.stopPropagation()}>
      <canvas 
        ref={canvasRef} 
        width={200} 
        height={200} 
        onClick={handleCanvasClick}
        className="cursor-pointer rounded-full"
      />
      <div className="flex items-center gap-2 mt-2">
        <div 
          className={`w-8 h-8 rounded-full ${selectedColor.split(' ')[0]}`} 
          style={{ borderColor: 'rgba(0,0,0,0.1)', borderWidth: '1px' }}
        />
        <span className="text-xs">Click on the wheel to pick a color</span>
      </div>
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
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  // Reset form when card changes
  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description || '');
    setTags(card.tags || []);
    setPriority(card.priority || 'medium');
  }, [card]);

  const handleColorChange = (color: string) => {
    console.log("Color changed to:", color); // Debug log
    setSelectedColor(color);
  };

  const handleAddTag = () => {
    if (newTagText.trim()) {
      const newTag: Tag = { text: newTagText.trim(), color: selectedColor };
      console.log("Adding tag with color:", selectedColor); // Debug log
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
              
              <Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-10 w-10 p-0 flex items-center justify-center"
                  >
                    <div 
                      className={`w-6 h-6 rounded-full ${selectedColor.split(' ')[0]}`} 
                      style={{ borderColor: 'rgba(0,0,0,0.1)', borderWidth: '1px' }}
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-auto p-0" 
                  align="end"
                  onInteractOutside={(e) => {
                    // Prevent closing when interacting with color wheel
                    e.preventDefault();
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-2" onClick={(e) => e.stopPropagation()}>
                    <div className="mb-2">
                      <p className="text-sm font-medium mb-2">Presets</p>
                      <div className="flex flex-wrap gap-1">
                        {tagColorOptions.map((colorOption) => (
                          <button
                            key={colorOption.value}
                            onClick={() => {
                              handleColorChange(colorOption.value);
                              setIsColorPickerOpen(false);
                            }}
                            className={`w-6 h-6 rounded-full ${colorOption.value.split(' ')[0]} border border-gray-200`}
                            title={colorOption.label}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="border-t pt-2">
                      <p className="text-sm font-medium mb-2">Custom color</p>
                      <ColorWheel 
                        color={selectedColor} 
                        onChange={handleColorChange} 
                      />
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
