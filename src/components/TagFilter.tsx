import React from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useKanban } from '../context/KanbanContext';

const TagFilter: React.FC = () => {
  const { getAllTags, selectedTags, setSelectedTags, clearAllFilters } = useKanban();
  const availableTags = getAllTags();

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

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            Tags ({selectedTags.length})
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
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