import React, { useState } from 'react';
import { FolderKanban, X, Plus } from 'lucide-react';
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

const ProjectFilter: React.FC = () => {
  const { allProjects, selectedProject, setSelectedProject } = useKanban();
  const [newProjectName, setNewProjectName] = useState('');

  const handleAddProject = () => {
    if (newProjectName.trim()) {
      // The project will be created when a card is added with this project name
      // For now, we just close the dropdown - the project gets added via cards
      setNewProjectName('');
    }
  };

  if (allProjects.length === 0 && !selectedProject) {
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
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <FolderKanban className="h-4 w-4" />
              Projects
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuCheckboxItem
              checked={selectedProject === null}
              onCheckedChange={() => setSelectedProject(null)}
            >
              All Projects
            </DropdownMenuCheckboxItem>
            
            {allProjects.map((project) => (
              <DropdownMenuCheckboxItem
                key={project}
                checked={selectedProject === project}
                onCheckedChange={() => setSelectedProject(project)}
              >
                {project}
              </DropdownMenuCheckboxItem>
            ))}
            
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
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export default ProjectFilter;
