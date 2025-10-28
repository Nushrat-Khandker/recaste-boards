
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, MoreVertical } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useKanban } from '../context/KanbanContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

import { QuarterSelector } from './QuarterSelector';
import TagFilter from './TagFilter';
import { NotificationCenter } from './NotificationCenter';

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

  const headerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const updateVar = () => {
      const h = headerRef.current?.offsetHeight ?? 0;
      document.documentElement.style.setProperty('--header-height', `${h}px`);
    };
    updateVar();
    window.addEventListener('resize', updateVar);
    return () => window.removeEventListener('resize', updateVar);
  }, []);

  // Determine current view from route
  const currentView = location.pathname === '/projects' ? 'projects' 
                    : location.pathname === '/chat' ? 'chat'
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
    <header ref={headerRef} className="sticky top-0 z-50 bg-background border-b">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex justify-between items-center mb-2 sm:mb-3">
          {/* Logo */}
          <Link to="/" className="text-xs sm:text-xl font-bold hover:opacity-80 transition-opacity flex-shrink-0">
            re<span className="text-[#FE446F]">*</span>caste
          </Link>
          
          {/* Center Title */}
          <div className="absolute left-[45%] sm:left-1/2 transform -translate-x-1/2 pointer-events-none">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground whitespace-nowrap">Kanban</h1>
          </div>
          
          {/* Right Side Controls */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <QuarterSelector
              selectedQuarter={selectedQuarter}
              selectedYear={selectedNumber}
              onQuarterChange={setSelectedQuarter}
              onYearChange={setSelectedNumber}
            />

            {/* Notifications */}
            <NotificationCenter />

            {/* More Options Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                  <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-2">
                  <TagFilter />
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
          <TabsList className="w-full justify-start h-8 sm:h-10">
            <TabsTrigger value="projects" asChild className="text-xs sm:text-sm px-2 sm:px-3">
              <Link to="/projects" className="gap-1 sm:gap-2">
                <span className="hidden sm:inline">📂</span> Projects
              </Link>
            </TabsTrigger>
            <TabsTrigger value="tasks" asChild className="text-xs sm:text-sm px-2 sm:px-3">
              <Link to="/" className="gap-1 sm:gap-2">
                <span className="hidden sm:inline">✅</span> Tasks
              </Link>
            </TabsTrigger>
            <TabsTrigger value="calendar" asChild className="text-xs sm:text-sm px-2 sm:px-3">
              <Link to="/#calendar" className="gap-1 sm:gap-2">
                <span className="hidden sm:inline">📅</span> Calendar
              </Link>
            </TabsTrigger>
            <TabsTrigger value="chat" asChild className="text-xs sm:text-sm px-2 sm:px-3">
              <Link to="/chat" className="gap-1 sm:gap-2">
                <span className="hidden sm:inline">💬</span> Chat
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
