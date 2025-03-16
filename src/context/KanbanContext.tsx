
import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
}

export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}

interface KanbanContextType {
  columns: KanbanColumn[];
  addCard: (columnId: string, card: Omit<KanbanCard, 'id'>) => void;
  moveCard: (cardId: string, sourceColumnId: string, destinationColumnId: string) => void;
  deleteCard: (columnId: string, cardId: string) => void;
  updateCard: (columnId: string, card: KanbanCard) => void;
}

const defaultColumns: KanbanColumn[] = [
  {
    id: 'todo',
    title: 'To Do',
    cards: [
      {
        id: 'card-1',
        title: 'Research user needs',
        description: 'Conduct interviews and surveys with potential users',
        tags: ['research', 'planning'],
        priority: 'high'
      },
      {
        id: 'card-2',
        title: 'Create wireframes',
        description: 'Design initial wireframes for the main features',
        tags: ['design'],
        priority: 'medium'
      }
    ]
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    cards: [
      {
        id: 'card-3',
        title: 'Implement authentication',
        description: 'Set up user login and registration',
        tags: ['development'],
        priority: 'high'
      }
    ]
  },
  {
    id: 'done',
    title: 'Done',
    cards: [
      {
        id: 'card-4',
        title: 'Project setup',
        description: 'Initialize repository and development environment',
        tags: ['setup'],
        priority: 'low'
      }
    ]
  }
];

export const KanbanContext = createContext<KanbanContextType>({
  columns: [],
  addCard: () => {},
  moveCard: () => {},
  deleteCard: () => {},
  updateCard: () => {}
});

export const useKanban = () => useContext(KanbanContext);

export const KanbanProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [columns, setColumns] = useState<KanbanColumn[]>(defaultColumns);

  const addCard = (columnId: string, card: Omit<KanbanCard, 'id'>) => {
    const newCard: KanbanCard = {
      ...card,
      id: `card-${Date.now()}`
    };

    setColumns(prevColumns => 
      prevColumns.map(column => 
        column.id === columnId
          ? { ...column, cards: [...column.cards, newCard] }
          : column
      )
    );
  };

  const moveCard = (cardId: string, sourceColumnId: string, destinationColumnId: string) => {
    const sourceColumn = columns.find(column => column.id === sourceColumnId);
    const card = sourceColumn?.cards.find(card => card.id === cardId);
    
    if (!card) return;

    // Remove from source
    const updatedSourceColumn = columns.map(column => 
      column.id === sourceColumnId
        ? { ...column, cards: column.cards.filter(c => c.id !== cardId) }
        : column
    );

    // Add to destination
    setColumns(
      updatedSourceColumn.map(column => 
        column.id === destinationColumnId
          ? { ...column, cards: [...column.cards, card] }
          : column
      )
    );
  };

  const deleteCard = (columnId: string, cardId: string) => {
    setColumns(prevColumns => 
      prevColumns.map(column => 
        column.id === columnId
          ? { ...column, cards: column.cards.filter(card => card.id !== cardId) }
          : column
      )
    );
  };

  const updateCard = (columnId: string, updatedCard: KanbanCard) => {
    setColumns(prevColumns => 
      prevColumns.map(column => 
        column.id === columnId
          ? { 
              ...column, 
              cards: column.cards.map(card => 
                card.id === updatedCard.id ? updatedCard : card
              ) 
            }
          : column
      )
    );
  };

  return (
    <KanbanContext.Provider value={{ 
      columns, 
      addCard, 
      moveCard, 
      deleteCard, 
      updateCard 
    }}>
      {children}
    </KanbanContext.Provider>
  );
};
