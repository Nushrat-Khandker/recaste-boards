-- Backfill context_id for existing board messages
UPDATE chat_messages 
SET context_id = board_name 
WHERE context_id IS NULL 
  AND board_name IS NOT NULL 
  AND context_type = 'board';