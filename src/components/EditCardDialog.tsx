import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Check, Link as LinkIcon, ExternalLink, User, CheckSquare, Square, Trash2, Pencil } from "lucide-react"; 
import { KanbanCard, Tag, ChecklistItem, useKanban } from '../context/KanbanContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { YearWheel } from './YearWheel';
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { supabase } from '@/integrations/supabase/client';

interface TeamMember {
  id: string;
  full_name: string;
}

interface EditCardDialogProps {
  card: KanbanCard;
  columnId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (columnId: string, updatedCard: KanbanCard) => void;
  isNew?: boolean;
}

// Team members loaded dynamically from profiles

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

const isColorDark = (hexColor: string): boolean => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
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
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [projectName, setProjectName] = useState(card.projectName || '');
  const [quarter, setQuarter] = useState(card.quarter || '');
  const [number, setNumber] = useState(card.number || '');
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
  const [assignedTo, setAssignedTo] = useState<string | undefined>(card.assignedTo);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(card.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [isHoliday, setIsHoliday] = useState(card.isHoliday || false);
  const [cardEmoji, setCardEmoji] = useState(card.cardEmoji || '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistText, setEditingChecklistText] = useState('');

  // Load team members from profiles
  useEffect(() => {
    const loadTeamMembers = async () => {
      const { data } = await supabase.from('profiles').select('id, full_name');
      if (data) {
        setTeamMembers(data.filter(p => p.full_name).map(p => ({ id: p.id, full_name: p.full_name! })));
      }
    };
    loadTeamMembers();
  }, []);

  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description || '');
    setProjectName(card.projectName || '');
    setQuarter(card.quarter || '');
    setNumber(card.number || '');
    setTags(Array.isArray(card.tags) ? card.tags : []);
    setPriority(card.priority || 'medium');
    setSelectedColor(tagColors[0].value);
    setStartDate(card.startDate ? new Date(card.startDate) : undefined);
    setDueDate(card.dueDate ? new Date(card.dueDate) : undefined);
    setFileAttachments(card.fileAttachments || []);
    setAssignedTo(card.assignedTo);
    setChecklist(card.checklist || []);
    setNewChecklistItem('');
    setIsHoliday(card.isHoliday || false);
    setCardEmoji(card.cardEmoji || '');
    setShowEmojiPicker(false);
    setEditingChecklistId(null);
  }, [card, isOpen]);

  const handleAddTag = () => {
    if (newTagText.trim()) {
      setTags([...tags, { text: newTagText.trim(), customColor: selectedColor }]);
      setNewTagText('');
      setIsTagDropdownOpen(false);
    }
  };

  const handleSelectExistingTag = (existingTag: Tag) => {
    if (!tags.some(tag => tag.text === existingTag.text)) {
      setTags([...tags, existingTag]);
    }
    setIsTagDropdownOpen(false);
  };

  const existingTags = getAllTags();
  const availableTags = existingTags.filter(
    existingTag => !tags.some(selectedTag => selectedTag.text === existingTag.text)
  );

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleAddFile = () => {
    if (newFileUrl.trim()) {
      try {
        const url = new URL(newFileUrl.trim());
        const fileName = url.pathname.split('/').pop() || url.hostname || 'Link';
        setFileAttachments([...fileAttachments, { url: newFileUrl.trim(), type: 'google_doc', name: fileName }]);
      } catch {
        setFileAttachments([...fileAttachments, { url: newFileUrl.trim(), type: 'google_doc', name: 'Link' }]);
      }
      setNewFileUrl('');
    }
  };

  const handleRemoveFile = (index: number) => {
    setFileAttachments(fileAttachments.filter((_, i) => i !== index));
  };

  // Checklist handlers
  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklist([...checklist, { id: crypto.randomUUID(), text: newChecklistItem.trim(), completed: false }]);
      setNewChecklistItem('');
    }
  };

  const handleToggleChecklistItem = (id: string) => {
    setChecklist(checklist.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast({ title: "Validation Error", description: "Title is required", variant: "destructive" });
      return;
    }
    
    const selectedMember = teamMembers.find(m => m.id === assignedTo);
    const updatedCard: KanbanCard = {
      ...card,
      title: title.trim(),
      description: description.trim() || undefined,
      projectName: projectName.trim() || undefined,
      quarter: quarter || undefined,
      number: number || undefined,
      tags: tags.length > 0 ? tags : undefined,
      priority,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
      movedDate: card.movedDate,
      fileAttachments: fileAttachments.length > 0 ? fileAttachments : undefined,
      checklist: checklist.length > 0 ? checklist : undefined,
      assignedTo: assignedTo || undefined,
      assignedToName: selectedMember?.full_name || undefined,
      isHoliday,
      cardEmoji: cardEmoji || undefined,
    };
    
    onSave(columnId, updatedCard);
    onClose();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && title.trim()) { e.preventDefault(); handleSave(); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagText.trim()) { e.preventDefault(); handleAddTag(); }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && title.trim()) { e.preventDefault(); handleSave(); }
  };

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

  const completedCount = checklist.filter(i => i.completed).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{isNew ? 'Add New Card' : 'Edit Card'}</DialogTitle>
          <DialogDescription>
            {isNew ? 'Create a new card by filling in the details below.' : 'Edit the card details and save your changes.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 sm:gap-6 px-6 pb-2 max-h-[calc(90vh-160px)] overflow-y-auto">
          {/* LEFT COLUMN - Main details */}
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <label htmlFor="title" className="text-sm font-medium">Title *</label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={handleInputKeyDown} placeholder="Enter card title" autoFocus={isNew} />
            </div>
            
            <div className="grid gap-1.5">
              <label htmlFor="projectName" className="text-sm font-medium">Project</label>
              <div className="flex gap-2">
                <Input id="projectName" value={projectName} onChange={(e) => setProjectName(e.target.value)} onKeyDown={handleInputKeyDown} placeholder="Project name" className="flex-1" list="projects-list" />
                <datalist id="projects-list">
                  {allProjects.map((project) => <option key={project} value={project} />)}
                </datalist>
                {allProjects.length > 0 && (
                  <Select value={projectName || "none"} onValueChange={(value) => value !== "none" && setProjectName(value)}>
                    <SelectTrigger className="w-[40px] px-2"><Plus className="h-4 w-4" /></SelectTrigger>
                    <SelectContent>
                      {allProjects.map((project) => <SelectItem key={project} value={project}>{project}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Assigned To</label>
              <Select value={assignedTo || "unassigned"} onValueChange={(value) => setAssignedTo(value === "unassigned" ? undefined : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee">
                    {assignedTo ? <div className="flex items-center gap-2"><User className="h-4 w-4" />{teamMembers.find(m => m.id === assignedTo)?.full_name || assignedTo}</div> : <span className="text-muted-foreground">Unassigned</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}><div className="flex items-center gap-2"><User className="h-4 w-4" />{member.full_name}</div></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-1.5">
              <label htmlFor="description" className="text-sm font-medium">Description</label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} onKeyDown={handleTextareaKeyDown} placeholder="Enter description" className="min-h-[60px]" />
            </div>
            
            {/* Date & scheduling row */}
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-2">
                    {startDate ? `Start: ${format(startDate, "MMM d, yy")}` : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-2">
                    {dueDate ? `Due: ${format(dueDate, "MMM d, yy")}` : "Due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-2">{number ? `Year: ${number}` : "Year"}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                  <YearWheel value={number} onValueChange={setNumber} placeholder="Select year" />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-2">{quarter ? `Q: ${quarter}` : "Q"}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-3" align="start">
                  <Select value={quarter || "none"} onValueChange={(value) => setQuarter(value === "none" ? "" : value)}>
                    <SelectTrigger><SelectValue placeholder="Select quarter" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Quarter</SelectItem>
                      <SelectItem value="Q1">Q1</SelectItem>
                      <SelectItem value="Q2">Q2</SelectItem>
                      <SelectItem value="Q3">Q3</SelectItem>
                      <SelectItem value="Q4">Q4</SelectItem>
                    </SelectContent>
                  </Select>
                </PopoverContent>
              </Popover>
            </div>

            {movedDate && (
              <div className="text-sm text-muted-foreground">Moved: {format(movedDate, "MMM d, yy")}</div>
            )}

            {/* Priority */}
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Priority</label>
              <Select value={priority} onValueChange={(value) => setPriority(value as 'low' | 'medium' | 'high')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Calendar Emoji */}
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Calendar Emoji</label>
              <p className="text-xs text-muted-foreground">Select an emoji to display on the calendar from start date to due date</p>
              <div className="flex items-center gap-2">
                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker} modal={true}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 px-3 text-lg" type="button">
                      {cardEmoji || '😀'} <span className="ml-2 text-sm text-muted-foreground">{cardEmoji ? 'Change' : 'Pick emoji'}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-3 z-[9999]" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <div className="grid grid-cols-8 gap-1">
                      {['🏖️', '🎉', '🔥', '⭐', '💡', '🚀', '❤️', '✅',
                        '📌', '🎯', '🏆', '💪', '📅', '🌟', '🎊', '🎁',
                        '⚡', '🌈', '🍕', '☕', '🎵', '📚', '✈️', '🏠',
                        '🌺', '🦋', '🐝', '🍂', '❄️', '☀️', '🌙', '🌸'].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          className={`text-xl p-1 rounded transition-colors ${cardEmoji === emoji ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-accent'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (cardEmoji === emoji) {
                              setCardEmoji('');
                              setIsHoliday(false);
                            } else {
                              setCardEmoji(emoji);
                              setIsHoliday(emoji === '🏖️');
                            }
                            setShowEmojiPicker(false);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {cardEmoji && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2"
                    onClick={() => { setCardEmoji(''); setIsHoliday(false); }}
                  >
                    <X className="h-4 w-4" />
                    <span className="ml-1 text-xs">Clear</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Tags, Checklist, Files */}
          <div className="space-y-4 sm:border-l sm:pl-6 pt-4 sm:pt-0">
            {/* Tags */}
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex flex-wrap gap-1 mb-1">
                {tags.map((tag, index) => renderTag(tag, index))}
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input value={newTagText} onChange={(e) => setNewTagText(e.target.value)} onKeyDown={handleKeyDown} placeholder="New tag" className="pr-10" />
                  <DropdownMenu open={isTagDropdownOpen} onOpenChange={setIsTagDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1 h-8 w-8 p-0"><Plus size={14} /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 bg-background border shadow-md z-50" align="end">
                      {availableTags.length > 0 && (
                        <>
                          <div className="px-2 py-1.5"><p className="text-sm font-medium text-foreground">Existing tags</p></div>
                          <div className="max-h-[150px] overflow-y-auto">
                            {availableTags.map((existingTag, index) => {
                              const tagColor = existingTag.customColor || tagColors[0].value;
                              const isDark = isColorDark(tagColor);
                              return (
                                <DropdownMenuItem key={index} onClick={() => handleSelectExistingTag({ ...existingTag, customColor: tagColor })} className="cursor-pointer">
                                  <Badge className={`text-xs ${isDark ? 'text-white' : 'text-gray-800'}`} style={{ backgroundColor: tagColor }}>{existingTag.text}</Badge>
                                </DropdownMenuItem>
                              );
                            })}
                          </div>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-medium text-foreground mb-2">New tag color</p>
                        <Select value={selectedColor} onValueChange={setSelectedColor}>
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: selectedColor }} />
                                {tagColors.find(c => c.value === selectedColor)?.label}
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="max-h-60 overflow-y-auto">
                            {tagColors.map((color) => (
                              <SelectItem key={color.value} value={color.value}>
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: color.value }} />
                                  {color.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" onClick={handleAddTag} disabled={!newTagText.trim()} size="sm" className="w-full mt-2">
                          <Plus size={14} className="mr-1" />Add "{newTagText.trim()}"
                        </Button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            <Separator />

            {/* Checklist */}
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <CheckSquare size={14} />
                  Checklist
                </label>
                {checklist.length > 0 && (
                  <span className="text-xs text-muted-foreground">{completedCount}/{checklist.length}</span>
                )}
              </div>
              
              {checklist.length > 0 && (
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0}%` }} />
                </div>
              )}

              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 group py-1">
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => handleToggleChecklistItem(item.id)}
                    />
                    {editingChecklistId === item.id ? (
                      <Input
                        value={editingChecklistText}
                        onChange={(e) => setEditingChecklistText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (editingChecklistText.trim()) {
                              setChecklist(checklist.map(ci => ci.id === item.id ? { ...ci, text: editingChecklistText.trim() } : ci));
                            }
                            setEditingChecklistId(null);
                          }
                          if (e.key === 'Escape') setEditingChecklistId(null);
                        }}
                        onBlur={() => {
                          if (editingChecklistText.trim()) {
                            setChecklist(checklist.map(ci => ci.id === item.id ? { ...ci, text: editingChecklistText.trim() } : ci));
                          }
                          setEditingChecklistId(null);
                        }}
                        className="flex-1 h-7 text-sm"
                        autoFocus
                      />
                    ) : (
                      <span
                        className={`flex-1 text-sm cursor-pointer ${item.completed ? 'line-through text-muted-foreground' : ''}`}
                        onDoubleClick={() => { setEditingChecklistId(item.id); setEditingChecklistText(item.text); }}
                      >
                        {item.text}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setEditingChecklistId(item.id); setEditingChecklistText(item.text); }}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add checklist item"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newChecklistItem.trim()) {
                      e.preventDefault();
                      handleAddChecklistItem();
                    }
                  }}
                  className="flex-1"
                />
                <Button type="button" onClick={handleAddChecklistItem} disabled={!newChecklistItem.trim()} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* File Attachments */}
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Attachments</label>
              {fileAttachments.length > 0 && (
                <div className="flex flex-col gap-1 p-2 bg-muted/50 rounded-md border">
                  {fileAttachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between gap-2 group">
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline flex items-center gap-1.5 flex-1 min-w-0">
                        <LinkIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{file.name}</span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50" />
                      </a>
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveFile(index)} className="h-6 w-6 p-0 flex-shrink-0">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input placeholder="Paste URL" value={newFileUrl} onChange={(e) => setNewFileUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newFileUrl.trim()) { e.preventDefault(); handleAddFile(); } }} className="flex-1" />
                <Button type="button" onClick={handleAddFile} disabled={!newFileUrl.trim()} size="sm"><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="px-6 pb-6 pt-2">
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
