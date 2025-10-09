
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, MoreVertical } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useKanban } from '../context/KanbanContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

import { YearWheel } from './YearWheel';
import TagFilter from './TagFilter';
import ProjectFilter from './ProjectFilter';

const Header: React.FC = () => {
  const location = useLocation();
  const { toast } = useToast();
  const { 
    selectedNumber, 
    setSelectedNumber, 
    selectedQuarter, 
    setSelectedQuarter
  } = useKanban();
  
  const [showSlackInput, setShowSlackInput] = useState(false);
  const [slackChannel, setSlackChannel] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Determine current view from route
  const currentView = location.pathname === '/projects' ? 'projects' 
                    : location.pathname === '/' && location.hash === '#calendar' ? 'calendar'
                    : 'tasks';

  const handleSendToSlack = async () => {
    if (!slackChannel.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Slack channel",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('slack-integration', {
        body: {
          action: 'send_board_summary',
          channel: slackChannel
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Board summary sent to Slack!",
      });
      
      setShowSlackInput(false);
      setSlackChannel('');
    } catch (error) {
      console.error('Error sending to Slack:', error);
      toast({
        title: "Error",
        description: "Failed to send board summary to Slack",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-background border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center mb-3">
          {/* Logo */}
          <Link to="/" className="text-xl font-bold hover:opacity-80 transition-opacity">
            re<span className="text-[#FE446F]">*</span>caste
          </Link>
          
          {/* Center Title */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-xl font-semibold text-muted-foreground">Kanban</h1>
          </div>
          
          {/* Right Side Controls */}
          <div className="flex items-center gap-2">
            <YearWheel 
              value={selectedNumber} 
              onValueChange={setSelectedNumber}
              placeholder="Year"
              className="w-20"
            />
            
            <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
              <SelectTrigger className="w-16">
                <SelectValue placeholder="Q" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Q1">Q1</SelectItem>
                <SelectItem value="Q2">Q2</SelectItem>
                <SelectItem value="Q3">Q3</SelectItem>
                <SelectItem value="Q4">Q4</SelectItem>
              </SelectContent>
            </Select>

            {/* More Options Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-2">
                  <TagFilter />
                </div>
                <DropdownMenuSeparator />
                <div className="px-2 py-2">
                  <ProjectFilter />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowSlackInput(!showSlackInput)}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send to Slack
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={currentView} className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="projects" asChild>
              <Link to="/projects" className="gap-2">
                📂 Projects
              </Link>
            </TabsTrigger>
            <TabsTrigger value="tasks" asChild>
              <Link to="/" className="gap-2">
                ✅ Tasks
              </Link>
            </TabsTrigger>
            <TabsTrigger value="calendar" asChild>
              <Link to="/#calendar" className="gap-2">
                📅 Calendar
              </Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Slack Input (when shown) */}
        {showSlackInput && (
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="Slack channel (e.g., #general)"
              value={slackChannel}
              onChange={(e) => setSlackChannel(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={handleSendToSlack} disabled={isLoading} size="sm">
              Send
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowSlackInput(false)} 
              size="sm"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
