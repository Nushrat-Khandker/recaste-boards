import { KanbanProvider } from "@/context/KanbanContext";
import KanbanBoard from "@/components/KanbanBoard";
import Header from "@/components/Header";
import { HijriCalendar } from "@/components/HijriCalendar";
import { useEffect, useState } from "react";

const Index = () => {
  const [viewMode, setViewMode] = useState<'board' | 'calendar'>('board');

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <KanbanProvider>
        <Header />
        <main className="container mx-auto px-4 pt-4">
          {viewMode === 'calendar' ? <HijriCalendar /> : <KanbanBoard />}
        </main>
      </KanbanProvider>
    </div>
  );
};

export default Index;
