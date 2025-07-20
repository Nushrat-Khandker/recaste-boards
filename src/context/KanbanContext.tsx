import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from "@/integrations/supabase/client";

export interface Tag {
  text: string;
  color?: string;
  customColor?: string;  // Added this property for custom RGB colors
}

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  projectName?: string; // Added project name field
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
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
  clearAllFilters: () => void;
  filteredColumns: KanbanColumn[];
  loading: boolean;
}

const tagColors: Record<string, string> = {
  'research': 'bg-kanban-tag-1 text-blue-700',
  'planning': 'bg-kanban-tag-2 text-purple-700',
  'design': 'bg-kanban-tag-3 text-orange-700',
  'development': 'bg-kanban-tag-4 text-green-700',
  'setup': 'bg-muted text-muted-foreground',
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
        projectName: 'Research Project',
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
        projectName: 'Design System',
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
        projectName: 'Auth Module',
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
        projectName: 'Infrastructure',
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
  selectedTags: [],
  setSelectedTags: () => {},
  clearAllFilters: () => {},
  filteredColumns: [],
  loading: false
});

export const useKanban = () => useContext(KanbanContext);

// Convert Supabase data to KanbanColumn format
const convertSupabaseDataToColumns = (cards: any[], columns: any[]): KanbanColumn[] => {
  return columns.map(column => ({
    id: column.id,
    title: column.title,
    cards: cards
      .filter(card => card.column_id === column.id)
      .map(card => ({
        id: card.id,
        title: card.title,
        description: card.description,
        projectName: card.project_name,
        tags: card.tags ? JSON.parse(card.tags as string) : [],
        priority: card.priority as 'low' | 'medium' | 'high',
        number: card.number,
        quarter: card.quarter,
        startDate: card.start_date ? new Date(card.start_date) : undefined,
        dueDate: card.due_date ? new Date(card.due_date) : undefined,
      }))
  }));
};

export const KanbanProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string>(() => {
    return localStorage.getItem('selectedNumber') || '1446';
  });
  const [selectedQuarter, setSelectedQuarter] = useState<string>(() => {
    return localStorage.getItem('selectedQuarter') || 'Q3';
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load data from Supabase
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load columns and cards
      const [columnsResult, cardsResult] = await Promise.all([
        supabase.from('kanban_columns').select('*').order('position'),
        supabase.from('kanban_cards').select('*').order('created_at')
      ]);

      if (columnsResult.error) throw columnsResult.error;
      if (cardsResult.error) throw cardsResult.error;

      const convertedColumns = convertSupabaseDataToColumns(
        cardsResult.data || [], 
        columnsResult.data || []
      );
      
      setColumns(convertedColumns);
    } catch (error) {
      console.error('Error loading data from Supabase:', error);
      // Fallback to default columns if loading fails
      setColumns(defaultColumns);
    } finally {
      setLoading(false);
    }
  };

  // Persist selectedNumber to localStorage
  useEffect(() => {
    localStorage.setItem('selectedNumber', selectedNumber);
  }, [selectedNumber]);

  // Persist selectedQuarter to localStorage
  useEffect(() => {
    localStorage.setItem('selectedQuarter', selectedQuarter);
  }, [selectedQuarter]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Filter columns based on selected number, quarter, and tags
  const filteredColumns = React.useMemo(() => {
    return columns.map(column => ({
      ...column,
      cards: column.cards.filter(card => {
        // Check number and quarter filters (backwards compatibility)
        const matchesNumber = !card.number || card.number === selectedNumber;
        const matchesQuarter = !card.quarter || card.quarter === selectedQuarter;
        
        // Check tag filters - if no tags selected, show all cards; if tags selected, card must have at least one matching tag
        const matchesTags = selectedTags.length === 0 || 
          (card.tags && card.tags.some(tag => selectedTags.includes(tag.text)));
        
        return matchesNumber && matchesQuarter && matchesTags;
      })
    }));
  }, [columns, selectedNumber, selectedQuarter, selectedTags]);

  const addCard = async (columnId: string, card: Omit<KanbanCard, 'id'>) => {
    try {
      const cardData = {
        title: card.title,
        description: card.description,
        project_name: card.projectName,
        column_id: columnId,
        priority: card.priority || 'medium',
        number: card.number || selectedNumber,
        quarter: card.quarter || selectedQuarter,
        tags: card.tags ? JSON.stringify(card.tags) : null,
        start_date: card.startDate?.toISOString(),
        due_date: card.dueDate?.toISOString(),
      };

      const { data, error } = await supabase
        .from('kanban_cards')
        .insert([cardData])
        .select()
        .single();

      if (error) throw error;

      const newCard: KanbanCard = {
        id: data.id,
        title: data.title,
        description: data.description,
        projectName: data.project_name,
        tags: data.tags ? JSON.parse(data.tags as string) : [],
        priority: data.priority as 'low' | 'medium' | 'high',
        number: data.number,
        quarter: data.quarter,
        startDate: data.start_date ? new Date(data.start_date) : undefined,
        dueDate: data.due_date ? new Date(data.due_date) : undefined,
      };

      setColumns(prevColumns => 
        prevColumns.map(column => 
          column.id === columnId
            ? { ...column, cards: [...column.cards, newCard] }
            : column
        )
      );
    } catch (error) {
      console.error('Error adding card:', error);
    }
  };

  const moveCard = async (cardId: string, sourceColumnId: string, destinationColumnId: string) => {
    try {
      const { error } = await supabase
        .from('kanban_cards')
        .update({ column_id: destinationColumnId })
        .eq('id', cardId);

      if (error) throw error;

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
    } catch (error) {
      console.error('Error moving card:', error);
    }
  };

  const deleteCard = async (columnId: string, cardId: string) => {
    try {
      const { error } = await supabase
        .from('kanban_cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;

      setColumns(prevColumns => 
        prevColumns.map(column => 
          column.id === columnId
            ? { ...column, cards: column.cards.filter(card => card.id !== cardId) }
            : column
        )
      );
    } catch (error) {
      console.error('Error deleting card:', error);
    }
  };

  const updateCard = async (columnId: string, updatedCard: KanbanCard) => {
    try {
      const cardData = {
        title: updatedCard.title,
        description: updatedCard.description,
        project_name: updatedCard.projectName,
        priority: updatedCard.priority,
        number: updatedCard.number,
        quarter: updatedCard.quarter,
        tags: updatedCard.tags ? JSON.stringify(updatedCard.tags) : null,
        start_date: updatedCard.startDate?.toISOString(),
        due_date: updatedCard.dueDate?.toISOString(),
      };

      const { error } = await supabase
        .from('kanban_cards')
        .update(cardData)
        .eq('id', updatedCard.id);

      if (error) throw error;

      setColumns(prevColumns => 
        prevColumns.map(column => 
          column.id === columnId
            ? { 
                ...column, 
                cards: column.cards.map(card => 
                  card.id === updatedCard.id ? {
                    ...updatedCard,
                    projectName: updatedCard.projectName // Ensure projectName is preserved
                  } : card
                ) 
              }
            : column
        )
      );
    } catch (error) {
      console.error('Error updating card:', error);
    }
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

  const clearAllFilters = (): void => {
    setSelectedTags([]);
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
      selectedTags,
      setSelectedTags,
      clearAllFilters,
      filteredColumns,
      loading
    }}>
      {children}
    </KanbanContext.Provider>
  );
};
