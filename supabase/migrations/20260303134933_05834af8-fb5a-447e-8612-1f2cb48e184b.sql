
CREATE TABLE public.chat_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions" ON public.chat_reactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can add reactions" ON public.chat_reactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their reactions" ON public.chat_reactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_chat_reactions_message_id ON public.chat_reactions(message_id);
