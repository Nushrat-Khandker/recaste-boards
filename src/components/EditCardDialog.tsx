import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, CalendarClock, Plus, Check, Link as LinkIcon, ExternalLink, FileText } from "lucide-react"; 
import { KanbanCard, Tag, useKanban } from '../context/KanbanContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { DatePicker } from './DatePicker';
import { YearWheel } from './YearWheel';
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface EditCardDialogProps {
  card: KanbanCard;
  columnId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (columnId: string, updatedCard: KanbanCard) => void;
  isNew?: boolean;
}

// Expanded color palette for tags - organized by visual distance
const tagColors = [
  { label: 'Red', value: '#ef4444' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Teal', value: '#14b8a6' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Lime', value: '#65a30d' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Violet', value: '#8b5cf6' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Fuchsia', value: '#d946ef' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Sky', value: '#0ea5e9' },
  { label: 'Gray', value: '#6b7280' },
  { label: 'Stone', value: '#78716c' },
  { label: 'Slate', value: '#64748b' },
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
  onSave,
  isNew = false
}) => {
  const { getAllTags, allProjects } = useKanban();
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [projectName, setProjectName] = useState(card.projectName || '');
  const [tags, setTags] = useState<Tag[]>(Array.isArray(card.tags) ? card.tags : []);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(card.priority || 'medium');
  const [newTagText, setNewTagText] = useState('');
  const [selectedColor, setSelectedColor] = useState(tagColors[0].value);
  const [startDate, setStartDate] = useState<Date | undefined>(card.startDate);
  const [dueDate, setDueDate] = useState<Date | undefined>(card.dueDate);
  const [movedDate] = useState<Date | undefined>(card.movedDate);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [fileAttachments, setFileAttachments] = useState<Array<{ url: string; type: 'google_doc' | 'txt' | 'html'; name: string }>>(card.fileAttachments || []);
  const [newFileUrl, setNewFileUrl] = useState('');

  // Reset form when card changes
  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description || '');
    setProjectName(card.projectName || '');
    setTags(Array.isArray(card.tags) ? card.tags : []);
    setPriority(card.priority || 'medium');
    setSelectedColor(tagColors[0].value);
    // Properly convert string dates to Date objects
    setStartDate(card.startDate ? new Date(card.startDate) : undefined);
    setDueDate(card.dueDate ? new Date(card.dueDate) : undefined);
    setFileAttachments(card.fileAttachments || []);
  }, [card, isOpen]);

  const handleAddTag = () => {
    if (newTagText.trim()) {
      const newTag: Tag = { 
        text: newTagText.trim(),
        customColor: selectedColor
      };
      
      setTags([...tags, newTag]);
      setNewTagText('');
      setIsTagDropdownOpen(false);
    }
  };

  const handleSelectExistingTag = (existingTag: Tag) => {
    // Check if tag is already added
    const tagExists = tags.some(tag => tag.text === existingTag.text);
    if (!tagExists) {
      setTags([...tags, existingTag]);
    }
    setIsTagDropdownOpen(false);
  };

  // Get all existing tags from the context
  const existingTags = getAllTags();
  
  // Filter out tags that are already selected
  const availableTags = existingTags.filter(
    existingTag => !tags.some(selectedTag => selectedTag.text === existingTag.text)
  );

  const handleRemoveTag = (index: number) => {
    const newTags = [...tags];
    newTags.splice(index, 1);
    setTags(newTags);
  };

  const handleAddFile = () => {
    if (newFileUrl.trim()) {
      try {
        const url = new URL(newFileUrl.trim());
        const fileName = url.pathname.split('/').pop() || url.hostname || 'Link';
        setFileAttachments([...fileAttachments, { 
          url: newFileUrl.trim(), 
          type: 'google_doc', 
          name: fileName 
        }]);
        setNewFileUrl('');
      } catch {
        // If not a valid URL, just use the text as name
        setFileAttachments([...fileAttachments, { 
          url: newFileUrl.trim(), 
          type: 'google_doc', 
          name: 'Link'
        }]);
        setNewFileUrl('');
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setFileAttachments(fileAttachments.filter((_, i) => i !== index));
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
      startDate,
      dueDate,
      movedDate: card.movedDate, // Preserve movedDate when editing
      fileAttachments: fileAttachments.length > 0 ? fileAttachments : undefined,
    };
    
    console.log('Saving card with projectName:', projectName.trim() || undefined);
    console.log('Updated card data:', updatedCard);
    
    onSave(columnId, updatedCard);
    onClose();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && title.trim()) {
      e.preventDefault();
      handleSave();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagText.trim()) {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent) => {
    // For textarea, only save on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && title.trim()) {
      e.preventDefault();
      handleSave();
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
          <DialogTitle>{isNew ? 'Add New Card' : 'Edit Card'}</DialogTitle>
          <DialogDescription>
            {isNew ? 'Create a new card by filling in the details below.' : 'Edit the card details and save your changes.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="title" className="text-sm font-medium">Title *</label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Enter card title"
              autoFocus={isNew}
            />
            {isNew && <p className="text-xs text-muted-foreground">Press Enter to create card with just the title</p>}
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="projectName" className="text-sm font-medium">Project Name</label>
            <div className="flex gap-2">
              <Input
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Select or enter project name"
                className="flex-1"
                list="projects-list"
              />
              <datalist id="projects-list">
                {allProjects.map((project) => (
                  <option key={project} value={project} />
                ))}
              </datalist>
              {allProjects.length > 0 && (
                <Select value={projectName || "none"} onValueChange={(value) => value !== "none" && setProjectName(value)}>
                  <SelectTrigger className="w-[40px] px-2">
                    <Plus className="h-4 w-4" />
                  </SelectTrigger>
                  <SelectContent>
                    {allProjects.map((project) => (
                      <SelectItem key={project} value={project}>
                        {project}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Type to create new or select existing project</p>
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="description" className="text-sm font-medium">Description</label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder="Enter description (optional)"
              className="min-h-[80px]"
            />
          </div>
          
          {/* Date picker section */}
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start date</label>
                <DatePicker 
                  date={startDate} 
                  setDate={setStartDate} 
                  label="Pick date" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Due date</label>
                <DatePicker 
                  date={dueDate} 
                  setDate={setDueDate} 
                  label="Pick date" 
                />
              </div>
            </div>
            {movedDate && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Moved date</label>
                <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                  {format(movedDate, "MMM d, yy")}
                </div>
              </div>
            )}
          </div>
          
          <Separator />
          
          <div className="grid gap-2">
            <label className="text-sm font-medium">Tags</label>
            
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map((tag, index) => renderTag(tag, index))}
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={newTagText}
                  onChange={(e) => setNewTagText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type new tag or select existing"
                  className="pr-10"
                />
                
                <DropdownMenu open={isTagDropdownOpen} onOpenChange={setIsTagDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      className="absolute right-1 top-1 h-8 w-8 p-0"
                    >
                      <Plus size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-background border shadow-md z-50" align="end">
                    {availableTags.length > 0 && (
                      <>
                        <div className="px-2 py-1.5">
                          <p className="text-sm font-medium text-foreground">Select existing tag</p>
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                          {availableTags.map((existingTag, index) => {
                            const tagColor = existingTag.customColor || tagColors[0].value;
                            const isDark = isColorDark(tagColor);
                            return (
                              <DropdownMenuItem 
                                key={index}
                                onClick={() => handleSelectExistingTag({ ...existingTag, customColor: tagColor })}
                                className="cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    className={`text-xs ${isDark ? 'text-white' : 'text-gray-800'}`}
                                    style={{ backgroundColor: tagColor }}
                                  >
                                    {existingTag.text}
                                  </Badge>
                                </div>
                              </DropdownMenuItem>
                            );
                          })}
                        </div>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium text-foreground mb-2">Create new tag</p>
                      <div className="space-y-2">
                        <Select value={selectedColor} onValueChange={setSelectedColor}>
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded-full border" 
                                  style={{ backgroundColor: selectedColor }}
                                />
                                {tagColors.find(c => c.value === selectedColor)?.label}
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="max-h-60 overflow-y-auto">
                            {tagColors.map((color) => (
                              <SelectItem key={color.value} value={color.value}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-4 h-4 rounded-full border" 
                                    style={{ backgroundColor: color.value }}
                                  />
                                  {color.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          type="button" 
                          onClick={handleAddTag}
                          disabled={!newTagText.trim()}
                          size="sm"
                          className="w-full"
                        >
                          <Plus size={14} className="mr-1" />
                          Add "{newTagText.trim()}"
                        </Button>
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Click on a tag to remove it • Click + to see existing tags</p>
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

          <Separator />

          {/* File Attachments Section */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">File Attachments</label>
            
            {/* Display existing attachments */}
            {fileAttachments.length > 0 && (
              <div className="flex flex-col gap-2 mb-2 p-3 bg-muted/50 rounded-md border">
                {fileAttachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between gap-2 group">
                    <a 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm hover:underline flex items-center gap-2 flex-1 min-w-0"
                    >
                      <LinkIcon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{file.name}</span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50" />
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(index)}
                      className="h-6 w-6 p-0 flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new attachment */}
            <div className="flex gap-2">
              <Input
                placeholder="Paste file URL and press Add"
                value={newFileUrl}
                onChange={(e) => setNewFileUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFileUrl.trim()) {
                    e.preventDefault();
                    handleAddFile();
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleAddFile}
                disabled={!newFileUrl.trim()}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Paste any URL and click Add to attach multiple files</p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {isNew ? 'Add Card' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditCardDialog;
