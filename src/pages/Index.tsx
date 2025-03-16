
import React from 'react';
import { KanbanProvider } from '../context/KanbanContext';
import KanbanBoard from '../components/KanbanBoard';
import Header from '../components/Header';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <KanbanProvider>
        <Header />
        <main className="container mx-auto pb-16 animate-fade-in">
          <KanbanBoard />
        </main>
      </KanbanProvider>
    </div>
  );
};

export default Index;
