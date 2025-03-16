import React, { useState } from 'react';
import { useKanban, Tag } from '../context/KanbanContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Save, Plus, Trash2 } from 'lucide-react';
import { toast } from "sonner";
import Header from '../components/Header';

// Helper function to determine if a color is dark (reused from KanbanCard)
const isColorDark = (hexColor: string): boolean => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
};

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

const Tags: React.FC = () => {
  const { getAllTags, updateTag, deleteTag, addTag } = useKanban();
  const [tags, setTags] = useState<Tag[]>(getAllTags());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newTag, setNewTag] = useState<Tag>({ text: '', customColor: rainbowColors[0].value });
  const [isAdding, setIsAdding] = useState(false);

  const handleStartEdit = (index: number) => {
    setEditingId(index);
  };

  const handleTagChange = (index: number, field: keyof Tag, value: string) => {
    const updatedTags = [...tags];
    updatedTags[index] = { ...updatedTags[index], [field]: value };
    setTags(updatedTags);
  };

  const handleSaveTag = (index: number) => {
    const tagToUpdate = tags[index];
    updateTag(tagToUpdate);
    setEditingId(null);
    toast.success(`Tag "${tagToUpdate.text}" updated successfully`);
  };

  const handleDeleteTag = (index: number) => {
    const tagToDelete = tags[index];
    deleteTag(tagToDelete);
    setTags(tags.filter((_, i) => i !== index));
    toast.success(`Tag "${tagToDelete.text}" deleted successfully`);
  };

  const handleAddTag = () => {
    if (newTag.text.trim()) {
      addTag(newTag);
      setTags([...tags, newTag]);
      setNewTag({ text: '', customColor: rainbowColors[0].value });
      setIsAdding(false);
      toast.success(`Tag "${newTag.text}" added successfully`);
    }
  };

  const handleColorChange = (index: number | null, color: string) => {
    if (index === null) {
      setNewTag({ ...newTag, customColor: color });
    } else {
      handleTagChange(index, 'customColor', color);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Header />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tag Management</h1>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)}>
            <Plus size={16} className="mr-1" /> Add New Tag
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tag Name</TableHead>
            <TableHead>Color</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isAdding && (
            <TableRow>
              <TableCell>
                <Input
                  value={newTag.text}
                  onChange={(e) => setNewTag({ ...newTag, text: e.target.value })}
                  placeholder="Enter tag name"
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded-full border border-gray-200"
                    style={{ backgroundColor: newTag.customColor }}
                  />
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {rainbowColors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => handleColorChange(null, color.value)}
                        className="w-5 h-5 rounded-full border border-gray-200"
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleAddTag}
                    disabled={!newTag.text.trim()}
                  >
                    <Save size={16} />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsAdding(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
          
          {tags.map((tag, index) => (
            <TableRow key={index}>
              <TableCell>
                {editingId === index ? (
                  <Input
                    value={tag.text}
                    onChange={(e) => handleTagChange(index, 'text', e.target.value)}
                  />
                ) : (
                  <div className="flex items-center">
                    <span 
                      className={`px-2 py-1 rounded-full text-xs mr-2 ${
                        isColorDark(tag.customColor) ? 'text-white' : 'text-gray-800'
                      }`}
                      style={{ backgroundColor: tag.customColor }}
                    >
                      {tag.text}
                    </span>
                  </div>
                )}
              </TableCell>
              <TableCell>
                {editingId === index ? (
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {rainbowColors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => handleColorChange(index, color.value)}
                        className="w-5 h-5 rounded-full border border-gray-200"
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                  </div>
                ) : (
                  <div 
                    className="w-6 h-6 rounded-full border border-gray-200"
                    style={{ backgroundColor: tag.customColor }}
                  />
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {editingId === index ? (
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => handleSaveTag(index)}
                    >
                      <Save size={16} />
                    </Button>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleStartEdit(index)}
                    >
                      <Pencil size={16} />
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive" 
                    onClick={() => handleDeleteTag(index)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default Tags;
