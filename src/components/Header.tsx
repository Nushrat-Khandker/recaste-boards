
import React from 'react';
import { Link } from 'react-router-dom';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { Tag, FolderKanban, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useKanban } from '../context/KanbanContext';

import { YearWheel } from './YearWheel';
import TagFilter from './TagFilter';

const Header: React.FC = () => {
  const { 
    selectedNumber, 
    setSelectedNumber, 
    selectedQuarter, 
    setSelectedQuarter,
    selectedProject,
    setSelectedProject,
    allProjects
  } = useKanban();
  

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link to="/" className={navigationMenuTriggerStyle()}>
                  re<span className="text-[#FE446F]">*</span>caste
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/tags" className={navigationMenuTriggerStyle()}>
                  <Tag className="mr-2 h-4 w-4" />
                  Tags
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        
        <div className="flex items-center gap-2">
          <YearWheel 
            value={selectedNumber} 
            onValueChange={setSelectedNumber}
            placeholder="Year"
            className="w-24"
          />
          
          <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
            <SelectTrigger className="w-20">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Q1">Q1</SelectItem>
              <SelectItem value="Q2">Q2</SelectItem>
              <SelectItem value="Q3">Q3</SelectItem>
              <SelectItem value="Q4">Q4</SelectItem>
            </SelectContent>
          </Select>

          <TagFilter />

          {/* Project Filter */}
          {allProjects.length > 0 && (
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
                <Select value={selectedProject || ""} onValueChange={(value) => setSelectedProject(value || null)}>
                  <SelectTrigger className="w-[180px]">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4" />
                      <SelectValue placeholder="All Projects" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Projects</SelectItem>
                    {allProjects.map((project) => (
                      <SelectItem key={project} value={project}>
                        {project}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
