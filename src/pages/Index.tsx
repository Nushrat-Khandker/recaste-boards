import { KanbanProvider } from "@/context/KanbanContext";
import KanbanBoard from "@/components/KanbanBoard";
import Header from "@/components/Header";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <KanbanProvider>
        <Header />
        <main className="container mx-auto px-4 py-8">
          <KanbanBoard />
        </main>
      </KanbanProvider>
    </div>
  );
};

export default Index;
