
import React from 'react';
import { Link } from 'react-router-dom';
import { KanbanProvider } from '../context/KanbanContext';
import KanbanBoard from '../components/KanbanBoard';
import Header from '../components/Header';
import { Button } from '@/components/ui/button';
import { Tag } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <KanbanProvider>
        <Header />
        <main className="container mx-auto pb-16 animate-fade-in flex-grow">
          <KanbanBoard />
        </main>
        <footer className="py-4 border-t">
          <div className="container mx-auto px-4 flex justify-center">
            <Link to="/tags">
              <Button variant="outline" className="flex items-center gap-2">
                <Tag size={16} />
                Manage Tags
              </Button>
            </Link>
          </div>
        </footer>
      </KanbanProvider>
    </div>
  );
};

export default Index;
