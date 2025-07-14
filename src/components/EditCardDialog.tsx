import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, CalendarClock } from "lucide-react"; 
import { KanbanCard, Tag } from '../context/KanbanContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DatePicker } from './DatePicker';
import { Separator } from "@/components/ui/separator";

interface EditCardDialogProps {
  card: KanbanCard;
  columnId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (columnId: string, updatedCard: KanbanCard) => void;
}

// Exactly 7 rainbow colors with only one red
const rainbowColors = [
  { label: 'Red', value: '#ea384c' },
  { label: 'Orange', value: '#F97316' },
  { label: 'Yellow', value: '#f0e04b' },
  { label: 'Green', value: '#5ec639' },
  { label: 'Blue', value: '#5293d1' },
  { label: 'Indigo', value: '#423ec1' },
  { label: 'Pink', value: '#D946EF' },
];

// Available tag colors for selection (keeping as fallback)
const tagColorOptions = [
  { label: 'Blue', value: 'bg-blue-100 text-blue-800' },
  { label: 'Green', value: 'bg-green-100 text-green-800' },
  { label: 'Purple', value: 'bg-purple-100 text-purple-800' },
  { label: 'Orange', value: 'bg-orange-100 text-orange-800' },
  { label: 'Yellow', value: 'bg-yellow-100 text-yellow-800' },
  { label: 'Indigo', value: 'bg-indigo-100 text-indigo-800' },
  { label: 'Gray', value: 'bg-gray-100 text-gray-800' },
];

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

const EditCardDialog: React.FC<EditCardDialogProps> = ({
  card,
  columnId,
  isOpen,
  onClose,
  onSave
}) => {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [projectName, setProjectName] = useState(card.projectName || '');
  const [tags, setTags] = useState<Tag[]>(card.tags || []);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(card.priority || 'medium');
  const [newTagText, setNewTagText] = useState('');
  const [selectedColor, setSelectedColor] = useState(rainbowColors[0].value);
  const [startDate, setStartDate] = useState<Date | undefined>(card.startDate);
  const [dueDate, setDueDate] = useState<Date | undefined>(card.dueDate);
  const [number, setNumber] = useState<string>(card.number || '');
  const [quarter, setQuarter] = useState<string>(card.quarter || '');

  // Reset form when card changes
  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description || '');
    setProjectName(card.projectName || '');
    setTags(card.tags || []);
    setPriority(card.priority || 'medium');
    setSelectedColor(rainbowColors[0].value);
    setStartDate(card.startDate);
    setDueDate(card.dueDate);
    setNumber(card.number || '');
    setQuarter(card.quarter || '');
  }, [card, isOpen]);

  const handleAddTag = () => {
    if (newTagText.trim()) {
      const newTag: Tag = { 
        text: newTagText.trim(),
        customColor: selectedColor
      };
      
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
      projectName: projectName.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      priority: priority,
      number: number.trim() || undefined,
      quarter: quarter.trim() || undefined,
      startDate,
      dueDate
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
  
  // Render tag with proper styling
  const renderTag = (tag: Tag, index: number) => {
    const isDark = tag.customColor ? isColorDark(tag.customColor) : false;
    
    return (
      <Badge 
        key={index} 
        className={`cursor-pointer flex items-center gap-1 ${isDark ? 'text-white' : 'text-gray-800'}`}
        style={{ backgroundColor: tag.customColor }}
        onClick={() => handleRemoveTag(index)}
      >
        {tag.text}
        <X size={12} className="ml-1" />
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
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
            <label htmlFor="projectName" className="text-sm font-medium">Project Name</label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name (optional)"
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
          
          {/* Date picker section */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Dates</label>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker 
                date={startDate} 
                setDate={setStartDate} 
                label="Start date" 
              />
              <DatePicker 
                date={dueDate} 
                setDate={setDueDate} 
                label="Due date" 
              />
            </div>
          </div>
          
          <Separator />
          
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
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-10 w-10 p-0 flex items-center justify-center"
                  >
                    <div 
                      className="w-6 h-6 rounded-full border border-gray-200"
                      style={{ backgroundColor: selectedColor }}
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white" align="end">
                  <div className="p-2">
                    <p className="text-sm font-medium mb-2">Rainbow Colors</p>
                    <div className="flex flex-wrap gap-1">
                      {rainbowColors.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setSelectedColor(color.value)}
                          className="w-8 h-8 rounded-full border border-gray-200"
                          style={{ backgroundColor: color.value }}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              
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
            <Select
              value={priority}
              onValueChange={(value) => setPriority(value as 'low' | 'medium' | 'high')}
            >
              <SelectTrigger id="priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-2">
              <label htmlFor="number" className="text-sm font-medium">Number</label>
              <Select value={number} onValueChange={setNumber}>
                <SelectTrigger id="number">
                  <SelectValue placeholder="Select number" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1446">1446</SelectItem>
                  <SelectItem value="1447">1447</SelectItem>
                  <SelectItem value="1448+">1448+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="quarter" className="text-sm font-medium">Quarter</label>
              <Select value={quarter} onValueChange={setQuarter}>
                <SelectTrigger id="quarter">
                  <SelectValue placeholder="Select quarter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q1">Q1</SelectItem>
                  <SelectItem value="Q2">Q2</SelectItem>
                  <SelectItem value="Q3">Q3</SelectItem>
                  <SelectItem value="Q4">Q4</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
