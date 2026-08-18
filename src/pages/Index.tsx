import { KanbanProvider, useKanban } from "@/context/KanbanContext";
import KanbanBoard from "@/components/KanbanBoard";
import Header from "@/components/Header";
import CalendarViews from "@/components/CalendarViews";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const IndexContent = () => {
  const [searchParams] = useSearchParams();
  const viewMode = searchParams.get('view') === 'calendar' ? 'calendar' : 'board';
  const { selectedProject, setSelectedProject } = useKanban();

  // Clear any project filter when navigating to main tasks view
  useEffect(() => {
    setSelectedProject(null);
  }, [setSelectedProject]);

  return (
    <div className={viewMode === 'calendar' ? 'min-h-screen bg-zone-time' : 'min-h-screen bg-zone-work'}>
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
        {viewMode === 'calendar' ? <CalendarViews /> : <KanbanBoard />}
      </main>
    </div>
  );
};

const Index = () => {
  return (
    <div className="min-h-screen">
      <KanbanProvider>
        <IndexContent />
      </KanbanProvider>
    </div>
  );
};

export default Index;
