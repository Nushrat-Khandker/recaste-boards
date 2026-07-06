export interface ChatMessage {
  id: string;
  content: string | null;
  message_type: string;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
  user_id: string;
  reply_to: string | null;
  is_pinned?: boolean;
  profiles?: {
    full_name: string | null;
  };
  // Optimistic update fields
  pending?: boolean;
  failed?: boolean;
}

export type ChatContextType = 'board' | 'project' | 'general' | 'channel' | 'dm';

export interface ChatContextConfig {
  contextType: ChatContextType;
  contextId: string | null;
}

export interface ChatUser {
  id: string;
  name: string;
}

export const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
export const MESSAGES_PER_PAGE = 50;
