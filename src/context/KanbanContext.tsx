import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { z } from 'zod';

// Validation schemas
const cardSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().max(2000, "Description must be less than 2000 characters").optional(),
  projectName: z.string().max(100, "Project name must be less than 100 characters").optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  number: z.string().max(50, "Number must be less than 50 characters").optional(),
  quarter: z.string().max(20, "Quarter must be less than 20 characters").optional(),
});

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
  movedDate?: Date; // Automatically set when card is moved between columns
  fileAttachments?: Array<{ url: string; type: 'google_doc' | 'txt' | 'html'; name: string }>; // File attachments
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
  reorderCard: (columnId: string, cardId: string, newIndex: number) => void;
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
  selectedProject: string | null;
  setSelectedProject: (project: string | null) => void;
  allProjects: string[];
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
  reorderCard: () => {},
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
  selectedProject: null,
  setSelectedProject: () => {},
  allProjects: [],
  clearAllFilters: () => {},
  filteredColumns: [],
  loading: false
});

export const useKanban = () => useContext(KanbanContext);

// Helper to safely handle jsonb/text for tags from Supabase
const toTags = (raw: any) => {
  if (!raw) return [] as Tag[];
  try {
    if (Array.isArray(raw)) return raw as Tag[];
    if (typeof raw === 'string') return JSON.parse(raw) as Tag[];
    return [] as Tag[];
  } catch {
    return [] as Tag[];
  }
};

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
        tags: toTags(card.tags),
        priority: card.priority as 'low' | 'medium' | 'high',
        number: card.number,
        quarter: card.quarter,
        startDate: card.start_date ? new Date(card.start_date) : undefined,
        dueDate: card.due_date ? new Date(card.due_date) : undefined,
        movedDate: card.moved_date ? new Date(card.moved_date) : undefined,
        fileAttachments: card.file_attachments ? (typeof card.file_attachments === 'string' ? JSON.parse(card.file_attachments) : card.file_attachments) : undefined,
      }))
  }));
};

export const KanbanProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const { toast } = useToast();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string>(() => {
    return localStorage.getItem('selectedNumber') || '1446';
  });
  const [selectedQuarter, setSelectedQuarter] = useState<string>(() => {
    return localStorage.getItem('selectedQuarter') || 'Q3';
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(() => {
    return localStorage.getItem('selectedProject') || null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Load data from Supabase database
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch columns and cards from database
      const [columnsResult, cardsResult] = await Promise.all([
        supabase.from('kanban_columns').select('*').order('position'),
        supabase.from('kanban_cards').select('*').order('created_at', { ascending: false })
      ]);

      if (columnsResult.error) throw columnsResult.error;
      if (cardsResult.error) throw cardsResult.error;

      const columns = convertSupabaseDataToColumns(cardsResult.data || [], columnsResult.data || []);
      setColumns(columns);
    } catch (error) {
      console.error('Error loading data:', error);
      // Fallback to default columns if database is empty or error occurs
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

  // Persist selectedProject to localStorage
  useEffect(() => {
    if (selectedProject) {
      localStorage.setItem('selectedProject', selectedProject);
    } else {
      localStorage.removeItem('selectedProject');
    }
  }, [selectedProject]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Realtime updates for kanban tables
  useEffect(() => {
    const channel = supabase
      .channel('kanban-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_cards' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_columns' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter columns based on tags, project, year, and quarter
  const filteredColumns = React.useMemo(() => {
    return columns.map(column => ({
      ...column,
      cards: column.cards.filter(card => {
        // If no tags selected, show all cards; if tags selected, card must have at least one matching tag
        const matchesTags = selectedTags.length === 0 || 
          (card.tags && card.tags.some(tag => selectedTags.includes(tag.text)));
        
        // If no project selected, show all cards; if project selected, card must match project
        const matchesProject = !selectedProject || card.projectName === selectedProject;
        
        // Filter by selected year (number)
        const matchesYear = !selectedNumber || card.number === selectedNumber;
        
        // Filter by selected quarter
        const matchesQuarter = !selectedQuarter || card.quarter === selectedQuarter;
        
        return matchesTags && matchesProject && matchesYear && matchesQuarter;
      })
    }));
  }, [columns, selectedTags, selectedProject, selectedNumber, selectedQuarter]);

  // Get all unique projects from cards
  const allProjects = React.useMemo(() => {
    const projects = new Set<string>();
    columns.forEach(column => {
      column.cards.forEach(card => {
        if (card.projectName) {
          projects.add(card.projectName);
        }
      });
    });
    return Array.from(projects).sort();
  }, [columns]);

  const addCard = async (columnId: string, card: Omit<KanbanCard, 'id'>) => {
    try {
      // Validate input
      const validatedCard = cardSchema.parse({
        title: card.title,
        description: card.description,
        projectName: card.projectName,
        priority: card.priority,
        number: card.number,
        quarter: card.quarter,
      });

      const cardData = {
        title: validatedCard.title,
        description: validatedCard.description,
        project_name: validatedCard.projectName,
        column_id: columnId,
        priority: validatedCard.priority || 'medium',
        number: validatedCard.number || selectedNumber,
        quarter: validatedCard.quarter || selectedQuarter,
        tags: card.tags ? JSON.stringify(card.tags) : null,
        start_date: card.startDate?.toISOString(),
        due_date: card.dueDate?.toISOString(),
        file_attachments: card.fileAttachments ? JSON.stringify(card.fileAttachments) : null,
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
        tags: toTags(data.tags),
        priority: data.priority as 'low' | 'medium' | 'high',
        number: data.number,
        quarter: data.quarter,
        startDate: data.start_date ? new Date(data.start_date) : undefined,
        dueDate: data.due_date ? new Date(data.due_date) : undefined,
        movedDate: data.moved_date ? new Date(data.moved_date) : undefined,
        fileAttachments: data.file_attachments ? (typeof data.file_attachments === 'string' ? JSON.parse(data.file_attachments) : data.file_attachments) : undefined,
      };

      setColumns(prevColumns => 
        prevColumns.map(column => 
          column.id === columnId
            ? { ...column, cards: [newCard, ...column.cards] }
            : column
        )
      );

      toast({
        title: "Success",
        description: "Card added successfully",
      });
    } catch (error) {
      console.error('Error adding card:', error);
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add card. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const moveCard = async (cardId: string, sourceColumnId: string, destinationColumnId: string) => {
    try {
      const currentTime = new Date();
      
      // Update column and set moved_date to current time
      const { error } = await supabase
        .from('kanban_cards')
        .update({ 
          column_id: destinationColumnId,
          moved_date: currentTime.toISOString()
        })
        .eq('id', cardId);

      if (error) throw error;

      const sourceColumn = columns.find(column => column.id === sourceColumnId);
      const card = sourceColumn?.cards.find(card => card.id === cardId);
      
      if (!card) return;

      // Update the card with the new movedDate
      const updatedCard = { ...card, movedDate: currentTime };

      const updatedSourceColumn = columns.map(column => 
        column.id === sourceColumnId
          ? { ...column, cards: column.cards.filter(c => c.id !== cardId) }
          : column
      );

      setColumns(
        updatedSourceColumn.map(column => 
          column.id === destinationColumnId
            ? { ...column, cards: [updatedCard, ...column.cards] }
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
      // Validate input
      const validatedCard = cardSchema.parse({
        title: updatedCard.title,
        description: updatedCard.description,
        projectName: updatedCard.projectName,
        priority: updatedCard.priority,
        number: updatedCard.number,
        quarter: updatedCard.quarter,
      });

      const cardData = {
        title: validatedCard.title,
        description: validatedCard.description,
        project_name: validatedCard.projectName,
        priority: validatedCard.priority,
        number: validatedCard.number,
        quarter: validatedCard.quarter,
        tags: updatedCard.tags ? JSON.stringify(updatedCard.tags) : null,
        start_date: updatedCard.startDate?.toISOString(),
        due_date: updatedCard.dueDate?.toISOString(),
        file_attachments: updatedCard.fileAttachments ? JSON.stringify(updatedCard.fileAttachments) : null,
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
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update card. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  // Permanent role/department tags in hierarchical order with color shades
  const PERMANENT_TAGS: Tag[] = [
    { text: 'CEO', customColor: '#ef4444' },      // Red
    { text: 'COO', customColor: '#f97316' },      // Orange
    { text: 'CFO', customColor: '#eab308' },      // Yellow
    { text: 'CMO', customColor: '#22c55e' },      // Green
    { text: 'CTO', customColor: '#14b8a6' },      // Teal
    { text: 'CHRO', customColor: '#8b5cf6' },     // Purple
    { text: 'CSO', customColor: '#a855f7' },      // Light Purple
    { text: 'CCO', customColor: '#ec4899' },      // Pink
  ];

  const getAllTags = (): Tag[] => {
    const tagMap = new Map<string, Tag>();

    // First add all permanent tags
    PERMANENT_TAGS.forEach(tag => {
      tagMap.set(tag.text, tag);
    });

    // Then add tags from cards (won't overwrite permanent tags due to Map)
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

  const reorderCard = async (columnId: string, cardId: string, newIndex: number): Promise<void> => {
    try {
      setColumns(prevColumns => {
        return prevColumns.map(column => {
          if (column.id === columnId) {
            const cardToMove = column.cards.find(card => card.id === cardId);
            if (!cardToMove) return column;
            
            const filteredCards = column.cards.filter(card => card.id !== cardId);
            const reorderedCards = [
              ...filteredCards.slice(0, newIndex),
              cardToMove,
              ...filteredCards.slice(newIndex)
            ];
            
            return { ...column, cards: reorderedCards };
          }
          return column;
        });
      });

      // For now, we don't persist order to database as the column doesn't exist
      // The reordering is maintained in local state until page refresh
    } catch (error) {
      console.error('Error reordering card:', error);
      // Reload to ensure UI stays consistent with DB
      loadData();
    }
  };

  const addTag = (newTag: Tag): void => {
    // This is a no-op function since tags are only stored on cards
    // But we include it for completeness of the API
    // Tags will be available for selection when editing cards
  };

  const clearAllFilters = (): void => {
    setSelectedTags([]);
    setSelectedProject(null);
  };

    return (
    <KanbanContext.Provider value={{ 
      columns, 
      addCard, 
      moveCard, 
      reorderCard,
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
      selectedProject,
      setSelectedProject,
      allProjects,
      clearAllFilters,
      filteredColumns,
      loading
    }}>
      {children}
    </KanbanContext.Provider>
  );
};
