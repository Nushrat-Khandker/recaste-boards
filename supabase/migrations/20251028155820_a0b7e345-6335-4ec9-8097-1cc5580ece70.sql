-- Update RLS policies for chat_messages to support new context fields
DROP POLICY IF EXISTS "Users can insert messages in their boards" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view messages in their boards" ON public.chat_messages;

-- Policy for viewing messages based on context
CREATE POLICY "Users can view messages in their contexts"
ON public.chat_messages
FOR SELECT
USING (
  CASE context_type
    WHEN 'board' THEN 
      EXISTS (
        SELECT 1 FROM board_members
        WHERE board_members.board_name = chat_messages.context_id
        AND board_members.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM kanban_cards
        WHERE kanban_cards.project_name = chat_messages.context_id
        AND kanban_cards.owner_id = auth.uid()
      )
    WHEN 'project' THEN auth.uid() IS NOT NULL
    WHEN 'general' THEN auth.uid() IS NOT NULL
    ELSE false
  END
);

-- Policy for inserting messages based on context
CREATE POLICY "Users can insert messages in their contexts"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND
  CASE context_type
    WHEN 'board' THEN 
      EXISTS (
        SELECT 1 FROM board_members
        WHERE board_members.board_name = chat_messages.context_id
        AND board_members.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM kanban_cards
        WHERE kanban_cards.project_name = chat_messages.context_id
        AND kanban_cards.owner_id = auth.uid()
      )
    WHEN 'project' THEN auth.uid() IS NOT NULL
    WHEN 'general' THEN auth.uid() IS NOT NULL
    ELSE false
  END
);

-- Policy for updating own messages
CREATE POLICY "Users can update their own messages"
ON public.chat_messages
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy for deleting own messages
CREATE POLICY "Users can delete their own messages"
ON public.chat_messages
FOR DELETE
USING (auth.uid() = user_id);