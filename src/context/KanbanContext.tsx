import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Tag {
  text: string;
  color?: string;
  customColor?: string;  // Added this property for custom RGB colors
}

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  tags?: Tag[];
  priority?: 'low' | 'medium' | 'high';
  number?: string; // Added number field
  quarter?: string; // Added quarter field
  startDate?: Date; // New field for start date
  dueDate?: Date;   // New field for due date
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
  getAllTags: () => Tag[];
  updateTag: (updatedTag: Tag) => void;
  deleteTag: (tagToDelete: Tag) => void;
  addTag: (newTag: Tag) => void;
  selectedNumber: string;
  setSelectedNumber: (number: string) => void;
  selectedQuarter: string;
  setSelectedQuarter: (quarter: string) => void;
  filteredColumns: KanbanColumn[];
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
        priority: 'high',
        number: '1446',
        quarter: 'Q3',
        startDate: new Date(2025, 4, 20), // Example dates for demonstration
        dueDate: new Date(2025, 5, 15)
      },
      {
        id: 'card-2',
        title: 'Create wireframes',
        description: 'Design initial wireframes for the main features',
        tags: [
          { text: 'design', color: tagColors['design'] }
        ],
        priority: 'medium',
        number: '1447',
        quarter: 'Q2',
        startDate: new Date(2025, 3, 10),
        dueDate: new Date(2025, 4, 5)
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
        priority: 'high',
        number: '1446',
        quarter: 'Q3',
        startDate: new Date(2025, 4, 1),
        dueDate: new Date(2025, 5, 1)
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
        priority: 'low',
        number: '1448+',
        quarter: 'Q1',
        startDate: new Date(2025, 1, 15),
        dueDate: new Date(2025, 2, 15)
      }
    ]
  }
];

export const KanbanContext = createContext<KanbanContextType>({
  columns: [],
  addCard: () => {},
  moveCard: () => {},
  deleteCard: () => {},
  updateCard: () => {},
  getAllTags: () => [],
  updateTag: () => {},
  deleteTag: () => {},
  addTag: () => {},
  selectedNumber: '1446',
  setSelectedNumber: () => {},
  selectedQuarter: 'Q3',
  setSelectedQuarter: () => {},
  filteredColumns: []
});

export const useKanban = () => useContext(KanbanContext);

export const KanbanProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [columns, setColumns] = useState<KanbanColumn[]>(defaultColumns);
  const [selectedNumber, setSelectedNumber] = useState<string>('1446');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q3');

  // Filter columns based on selected number and quarter
  const filteredColumns = React.useMemo(() => {
    return columns.map(column => ({
      ...column,
      cards: column.cards.filter(card => {
        // If the card has matching number and quarter values, show it
        // If the card doesn't have these values, show it as well (backwards compatibility)
        const matchesNumber = !card.number || card.number === selectedNumber;
        const matchesQuarter = !card.quarter || card.quarter === selectedQuarter;
        return matchesNumber && matchesQuarter;
      })
    }));
  }, [columns, selectedNumber, selectedQuarter]);

  const addCard = (columnId: string, card: Omit<KanbanCard, 'id'>) => {
    const newCard: KanbanCard = {
      ...card,
      id: `card-${Date.now()}`,
      number: selectedNumber, // Assign current selected number
      quarter: selectedQuarter // Assign current selected quarter
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

    const updatedSourceColumn = columns.map(column => 
      column.id === sourceColumnId
        ? { ...column, cards: column.cards.filter(c => c.id !== cardId) }
        : column
    );

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

  const getAllTags = (): Tag[] => {
    const allTags: Tag[] = [];
    const tagMap = new Map<string, Tag>();

    columns.forEach(column => {
      column.cards.forEach(card => {
        if (card.tags) {
          card.tags.forEach(tag => {
            if (!tagMap.has(tag.text)) {
              tagMap.set(tag.text, tag);
            }
          });
        }
      });
    });

    return Array.from(tagMap.values());
  };

  const updateTag = (updatedTag: Tag): void => {
    setColumns(prevColumns => 
      prevColumns.map(column => ({
        ...column,
        cards: column.cards.map(card => {
          if (card.tags) {
            return {
              ...card,
              tags: card.tags.map(tag => 
                tag.text === updatedTag.text ? updatedTag : tag
              )
            };
          }
          return card;
        })
      }))
    );
  };

  const deleteTag = (tagToDelete: Tag): void => {
    setColumns(prevColumns => 
      prevColumns.map(column => ({
        ...column,
        cards: column.cards.map(card => {
          if (card.tags) {
            return {
              ...card,
              tags: card.tags.filter(tag => tag.text !== tagToDelete.text)
            };
          }
          return card;
        })
      }))
    );
  };

  const addTag = (newTag: Tag): void => {
    // This is a no-op function since tags are only stored on cards
    // But we include it for completeness of the API
    // Tags will be available for selection when editing cards
  };

  return (
    <KanbanContext.Provider value={{ 
      columns, 
      addCard, 
      moveCard, 
      deleteCard, 
      updateCard,
      getAllTags,
      updateTag,
      deleteTag,
      addTag,
      selectedNumber,
      setSelectedNumber,
      selectedQuarter,
      setSelectedQuarter,
      filteredColumns
    }}>
      {children}
    </KanbanContext.Provider>
  );
};
