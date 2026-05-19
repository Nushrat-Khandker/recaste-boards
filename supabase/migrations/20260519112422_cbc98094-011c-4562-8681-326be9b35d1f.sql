-- Channels
CREATE TABLE public.chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_private boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, user_id)
);
CREATE INDEX idx_channel_members_user ON public.channel_members(user_id);
CREATE INDEX idx_channel_members_channel ON public.channel_members(channel_id);

-- DM conversations
CREATE TABLE public.dm_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean NOT NULL DEFAULT false,
  name text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.dm_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
CREATE INDEX idx_dm_members_user ON public.dm_members(user_id);
CREATE INDEX idx_dm_members_conv ON public.dm_members(conversation_id);

-- Security-definer membership helpers
CREATE OR REPLACE FUNCTION public.is_channel_member(_user_id uuid, _channel_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.channel_members WHERE user_id = _user_id AND channel_id = _channel_id);
$$;

CREATE OR REPLACE FUNCTION public.is_dm_member(_user_id uuid, _conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.dm_members WHERE user_id = _user_id AND conversation_id = _conversation_id);
$$;

-- Enable RLS
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_members ENABLE ROW LEVEL SECURITY;

-- chat_channels policies
CREATE POLICY "Authenticated can view channels" ON public.chat_channels
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create channels" ON public.chat_channels
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator can update channel" ON public.chat_channels
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Creator can delete channel" ON public.chat_channels
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- channel_members policies
CREATE POLICY "Members can view channel members" ON public.channel_members
  FOR SELECT TO authenticated USING (public.is_channel_member(auth.uid(), channel_id));
CREATE POLICY "Users can join or be added to channels" ON public.channel_members
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_channel_member(auth.uid(), channel_id)
    OR EXISTS (SELECT 1 FROM public.chat_channels c WHERE c.id = channel_id AND c.created_by = auth.uid())
  );
CREATE POLICY "Users can leave channels" ON public.channel_members
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.chat_channels c WHERE c.id = channel_id AND c.created_by = auth.uid())
  );

-- dm_conversations policies
CREATE POLICY "Members can view conversations" ON public.dm_conversations
  FOR SELECT TO authenticated USING (public.is_dm_member(auth.uid(), id));
CREATE POLICY "Authenticated can create conversations" ON public.dm_conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator can update conversation" ON public.dm_conversations
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- dm_members policies
CREATE POLICY "Members can view dm members" ON public.dm_members
  FOR SELECT TO authenticated USING (public.is_dm_member(auth.uid(), conversation_id));
CREATE POLICY "Conversation creator or members can add" ON public.dm_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.dm_conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid())
    OR public.is_dm_member(auth.uid(), conversation_id)
  );
CREATE POLICY "Users can leave conversations" ON public.dm_members
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Extend chat_messages RLS for channel + dm contexts
DROP POLICY IF EXISTS "Users can view messages in their contexts" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their contexts" ON public.chat_messages;

CREATE POLICY "Users can view messages in their contexts" ON public.chat_messages
FOR SELECT USING (
  CASE context_type
    WHEN 'board' THEN (
      EXISTS (SELECT 1 FROM board_members WHERE board_name = chat_messages.context_id AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM kanban_cards WHERE project_name = chat_messages.context_id AND owner_id = auth.uid())
    )
    WHEN 'project' THEN auth.uid() IS NOT NULL
    WHEN 'general' THEN auth.uid() IS NOT NULL
    WHEN 'channel' THEN public.is_channel_member(auth.uid(), chat_messages.context_id::uuid)
    WHEN 'dm' THEN public.is_dm_member(auth.uid(), chat_messages.context_id::uuid)
    ELSE false
  END
);

CREATE POLICY "Users can insert messages in their contexts" ON public.chat_messages
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  CASE context_type
    WHEN 'board' THEN (
      EXISTS (SELECT 1 FROM board_members WHERE board_name = chat_messages.context_id AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM kanban_cards WHERE project_name = chat_messages.context_id AND owner_id = auth.uid())
    )
    WHEN 'project' THEN auth.uid() IS NOT NULL
    WHEN 'general' THEN auth.uid() IS NOT NULL
    WHEN 'channel' THEN public.is_channel_member(auth.uid(), chat_messages.context_id::uuid)
    WHEN 'dm' THEN public.is_dm_member(auth.uid(), chat_messages.context_id::uuid)
    ELSE false
  END
);

-- updated_at triggers
CREATE TRIGGER chat_channels_updated_at BEFORE UPDATE ON public.chat_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER dm_conversations_updated_at BEFORE UPDATE ON public.dm_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_members;