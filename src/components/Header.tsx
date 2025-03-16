
import React from 'react';
import { Square } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="border-b border-border py-4 px-6 mb-8 flex items-center justify-between bg-white/70 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center">
        <Square size={24} className="text-primary mr-2" />
        <h1 className="text-xl font-semibold tracking-tight">Kanban</h1>
      </div>
      
      <div className="text-sm text-muted-foreground">
        Your tasks, simplified
      </div>
    </header>
  );
};

export default Header;
