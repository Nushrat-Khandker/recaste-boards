
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
import ProjectFilter from './ProjectFilter';

const Header: React.FC = () => {
  const { 
    selectedNumber, 
    setSelectedNumber, 
    selectedQuarter, 
    setSelectedQuarter
  } = useKanban();
  

  return (
    <header className="sticky top-0 z-20 bg-background border-b">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link to="/" className={navigationMenuTriggerStyle()}>
                  re<span className="text-[#FE446F]">*</span>caste
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
            <SelectTrigger className="w-20 cursor-default">
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
          
          <ProjectFilter />
        </div>
      </div>
    </header>
  );
};

export default Header;
