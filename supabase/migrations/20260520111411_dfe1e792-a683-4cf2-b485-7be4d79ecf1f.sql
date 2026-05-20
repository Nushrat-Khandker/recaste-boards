ALTER TABLE public.chat_channels ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_chat_channels_archived_at ON public.chat_channels(archived_at);