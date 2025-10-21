import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckSquare, MessageSquare, Files, Phone } from 'lucide-react';

export type BoardView = 'tasks' | 'chat' | 'files' | 'calls';

interface BoardNavigationProps {
  currentView: BoardView;
  onViewChange: (view: BoardView) => void;
}

export function BoardNavigation({ currentView, onViewChange }: BoardNavigationProps) {
  return (
    <Tabs value={currentView} onValueChange={(value) => onViewChange(value as BoardView)}>
      <TabsList>
        <TabsTrigger value="tasks" className="gap-2">
          <CheckSquare className="h-4 w-4" />
          Tasks
        </TabsTrigger>
        <TabsTrigger value="chat" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Chat
        </TabsTrigger>
        <TabsTrigger value="files" className="gap-2">
          <Files className="h-4 w-4" />
          Files
        </TabsTrigger>
        <TabsTrigger value="calls" className="gap-2">
          <Phone className="h-4 w-4" />
          Calls
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
