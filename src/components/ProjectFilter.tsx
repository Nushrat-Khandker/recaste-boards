import React, { useState } from 'react';
import { FolderKanban, X, Plus, Pencil, Check, Archive, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useKanban } from '../context/KanbanContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const ProjectFilter: React.FC = () => {
  const { 
    allProjects, 
    selectedProject, 
    setSelectedProject, 
    renameProject,
    archiveProject,
    unarchiveProject,
    showArchived,
    setShowArchived,
    archivedProjects
  } = useKanban();
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleAddProject = () => {
    if (newProjectName.trim()) {
      // The project will be created when a card is added with this project name
      // For now, we just close the dropdown - the project gets added via cards
      setNewProjectName('');
    }
  };

  if (allProjects.length === 0 && !selectedProject && archivedProjects.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {selectedProject ? (
        <Badge variant="secondary" className="gap-2 px-3 py-1">
          <FolderKanban className="h-3 w-3" />
          {selectedProject}
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-transparent ml-1"
            onClick={() => setSelectedProject(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0">
              <FolderKanban className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="flex items-center justify-between px-2 py-1.5">
              <Label htmlFor="show-archived" className="text-xs text-muted-foreground">
                {showArchived ? 'Archived Projects' : 'Active Projects'}
              </Label>
              <div className="flex items-center gap-2">
                <Archive className="h-3 w-3 text-muted-foreground" />
                <Switch
                  id="show-archived"
                  checked={showArchived}
                  onCheckedChange={setShowArchived}
                  className="scale-75"
                />
              </div>
            </div>
            
            <DropdownMenuSeparator />
            
            {!showArchived && (
              <DropdownMenuCheckboxItem
                checked={selectedProject === null}
                onCheckedChange={() => setSelectedProject(null)}
              >
                All Projects
              </DropdownMenuCheckboxItem>
            )}
            
            {allProjects.map((project) => (
              <div key={project} className="flex items-center gap-1 px-2 py-1.5 hover:bg-accent group/item">
                {editingProject === project ? (
                  <>
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && editValue.trim()) {
                          await renameProject(project, editValue.trim());
                          setEditingProject(null);
                          setEditValue('');
                        }
                        if (e.key === 'Escape') {
                          setEditingProject(null);
                          setEditValue('');
                        }
                      }}
                      className="h-6 text-sm flex-1"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (editValue.trim()) {
                          await renameProject(project, editValue.trim());
                          setEditingProject(null);
                          setEditValue('');
                        }
                      }}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <DropdownMenuCheckboxItem
                      checked={selectedProject === project}
                      onCheckedChange={() => setSelectedProject(project)}
                      className="flex-1"
                    >
                      {project}
                    </DropdownMenuCheckboxItem>
                    {!showArchived && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 opacity-0 group-hover/item:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject(project);
                          setEditValue(project);
                        }}
                        title="Rename project"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                    {showArchived ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 opacity-0 group-hover/item:opacity-100"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await unarchiveProject(project);
                        }}
                        title="Unarchive project"
                      >
                        <ArchiveRestore className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 opacity-0 group-hover/item:opacity-100"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await archiveProject(project);
                        }}
                        title="Archive project"
                      >
                        <Archive className="h-3 w-3" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            ))}
            
            {allProjects.length === 0 && (
              <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                {showArchived ? 'No archived projects' : 'No active projects'}
              </div>
            )}
            
            {!showArchived && (
              <>
                <DropdownMenuSeparator />
                
                <div className="p-2 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Create new project</p>
                  <Input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Project name"
                    className="h-8"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newProjectName.trim()) {
                        handleAddProject();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddProject}
                    disabled={!newProjectName.trim()}
                    size="sm"
                    className="w-full h-8"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Project
                  </Button>
                  <p className="text-xs text-muted-foreground">Projects are created when you add cards with a project name</p>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export default ProjectFilter;
