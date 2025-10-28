-- Add context fields to chat_messages to support different chat contexts
ALTER TABLE public.chat_messages 
ADD COLUMN context_type TEXT DEFAULT 'board' CHECK (context_type IN ('board', 'project', 'general')),
ADD COLUMN context_id TEXT;

-- Make board_name nullable for backward compatibility
ALTER TABLE public.chat_messages ALTER COLUMN board_name DROP NOT NULL;

-- Update existing records to use context fields
UPDATE public.chat_messages 
SET context_type = 'board', 
    context_id = board_name 
WHERE context_type IS NULL;

-- Add index for better query performance
CREATE INDEX idx_chat_messages_context ON public.chat_messages(context_type, context_id);

-- Add mentions support
ALTER TABLE public.chat_messages 
ADD COLUMN mentioned_users UUID[] DEFAULT '{}';

COMMENT ON COLUMN public.chat_messages.context_type IS 'Type of chat context: board, project, or general';
COMMENT ON COLUMN public.chat_messages.context_id IS 'ID of the context (board name, project name, or null for general)';
COMMENT ON COLUMN public.chat_messages.mentioned_users IS 'Array of user IDs mentioned in the message';