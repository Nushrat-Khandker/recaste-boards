import { KanbanProvider, useKanban } from "@/context/KanbanContext";
import KanbanBoard from "@/components/KanbanBoard";
import Header from "@/components/Header";
import { HijriCalendar } from "@/components/HijriCalendar";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const IndexContent = () => {
  const [viewMode, setViewMode] = useState<'board' | 'calendar'>('board');
  const { selectedProject, setSelectedProject } = useKanban();

  // Check URL hash to determine view
  useEffect(() => {
    const handleHashChange = () => {
      setViewMode(window.location.hash === '#calendar' ? 'calendar' : 'board');
    };
    
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <>
      <Header />
      <main className="container mx-auto px-2 sm:px-4 pt-4 max-w-7xl">
        {selectedProject && viewMode === 'board' && (
          <div className="mb-4 flex items-center gap-2">
            <Badge variant="secondary" className="text-sm py-1.5 px-3">
              Filtered by: <span className="font-semibold ml-1">{selectedProject}</span>
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedProject(null)}
              className="h-7"
            >
              <X className="h-3 w-3 mr-1" />
              Clear filter
            </Button>
          </div>
        )}
        {viewMode === 'calendar' ? <HijriCalendar /> : <KanbanBoard />}
      </main>
    </>
  );
};

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <KanbanProvider>
        <IndexContent />
      </KanbanProvider>
    </div>
  );
};

export default Index;
