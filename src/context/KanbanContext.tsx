
import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Tag {
  text: string;
  color?: string;
}

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  tags?: Tag[];
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

const tagColors: Record<string, string> = {
  'research': 'bg-kanban-tag-1 text-blue-800',
  'planning': 'bg-kanban-tag-2 text-purple-800',
  'design': 'bg-kanban-tag-3 text-orange-800',
  'development': 'bg-kanban-tag-4 text-green-800',
  'setup': 'bg-gray-100 text-gray-800',
  'low': 'bg-blue-50 text-blue-600',
  'medium': 'bg-yellow-50 text-yellow-600',
  'high': 'bg-red-50 text-red-600',
};

const defaultColumns: KanbanColumn[] = [
  {
    id: 'todo',
    title: 'To Do',
    cards: [
      {
        id: 'card-1',
        title: 'Research user needs',
        description: 'Conduct interviews and surveys with potential users',
        tags: [
          { text: 'research', color: tagColors['research'] },
          { text: 'planning', color: tagColors['planning'] }
        ],
        priority: 'high'
      },
      {
        id: 'card-2',
        title: 'Create wireframes',
        description: 'Design initial wireframes for the main features',
        tags: [
          { text: 'design', color: tagColors['design'] }
        ],
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
        tags: [
          { text: 'development', color: tagColors['development'] }
        ],
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
        tags: [
          { text: 'setup', color: tagColors['setup'] }
        ],
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
