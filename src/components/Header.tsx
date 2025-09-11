
import React from 'react';
import { Link } from 'react-router-dom';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { Tag, LogOut, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useKanban } from '../context/KanbanContext';
import { useAuth } from '../context/AuthContext';
import { YearWheel } from './YearWheel';
import TagFilter from './TagFilter';

const Header: React.FC = () => {
  const { 
    selectedNumber, 
    setSelectedNumber, 
    selectedQuarter, 
    setSelectedQuarter 
  } = useKanban();
  
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

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

          <div className="flex items-center gap-2 ml-4 pl-4 border-l">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              {user?.email}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
