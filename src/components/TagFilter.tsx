import React, { useState } from 'react';
import { Check, X, Plus, Tag as TagIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useKanban } from '../context/KanbanContext';
import type { Tag } from '../context/KanbanContext';

const tagColors = [
  { label: 'Red', value: '#ef4444' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Teal', value: '#14b8a6' },
];

const TagFilter: React.FC = () => {
  const { getAllTags, selectedTags, setSelectedTags, clearAllFilters, addTag } = useKanban();
  const availableTags = getAllTags();
  const [newTagText, setNewTagText] = useState('');
  const [selectedColor, setSelectedColor] = useState(tagColors[0].value);

  const handleTagToggle = (tagText: string) => {
    setSelectedTags(
      selectedTags.includes(tagText)
        ? selectedTags.filter(t => t !== tagText)
        : [...selectedTags, tagText]
    );
  };

  const handleClearAll = () => {
    clearAllFilters();
  };

  const handleAddTag = () => {
    if (newTagText.trim()) {
      const newTag: Tag = {
        text: newTagText.trim(),
        customColor: selectedColor
      };
      addTag(newTag);
      setNewTagText('');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 w-9 p-0">
            <TagIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {availableTags.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag.text}
              checked={selectedTags.includes(tag.text)}
              onCheckedChange={() => handleTagToggle(tag.text)}
              className="capitalize"
            >
              {tag.text}
            </DropdownMenuCheckboxItem>
          ))}
          {availableTags.length === 0 && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No tags available
            </div>
          )}
          
          <DropdownMenuSeparator />
          
          <div className="p-2 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Create new tag</p>
            <Input
              value={newTagText}
              onChange={(e) => setNewTagText(e.target.value)}
              placeholder="Tag name"
              className="h-8"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTagText.trim()) {
                  handleAddTag();
                }
              }}
            />
            <Select value={selectedColor} onValueChange={setSelectedColor}>
              <SelectTrigger className="h-8 w-full">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: selectedColor }}
                    />
                    {tagColors.find(c => c.value === selectedColor)?.label}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tagColors.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: color.value }}
                      />
                      {color.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddTag}
              disabled={!newTagText.trim()}
              size="sm"
              className="w-full h-8"
            >
              <Plus className="mr-1 h-3 w-3" />
              Add Tag
            </Button>
          </div>
          
          {selectedTags.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="w-full justify-start h-8 px-2 font-normal"
              >
                <X className="mr-2 h-3 w-3" />
                Clear filters
              </Button>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedTags.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {selectedTags.map((tagText) => (
            <Badge
              key={tagText}
              variant="secondary"
              className="text-xs h-6 px-2 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => handleTagToggle(tagText)}
            >
              {tagText}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagFilter;