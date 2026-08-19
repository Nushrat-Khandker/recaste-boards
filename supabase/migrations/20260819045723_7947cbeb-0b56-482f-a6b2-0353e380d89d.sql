CREATE TABLE public.chat_read_state (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  context_type text NOT NULL,
  context_id text,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX chat_read_state_unique ON public.chat_read_state (user_id, context_type, COALESCE(context_id, ''));
CREATE INDEX chat_read_state_context_idx ON public.chat_read_state (context_type, context_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_read_state TO authenticated;
GRANT ALL ON public.chat_read_state TO service_role;

ALTER TABLE public.chat_read_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view read state"
  ON public.chat_read_state FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own read state"
  ON public.chat_read_state FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own read state"
  ON public.chat_read_state FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own read state"
  ON public.chat_read_state FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER chat_read_state_updated_at
  BEFORE UPDATE ON public.chat_read_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_read_state;