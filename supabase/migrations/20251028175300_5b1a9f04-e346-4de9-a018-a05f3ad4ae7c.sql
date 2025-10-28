-- Admins can update and delete any kanban card (smooth updates anywhere for admins)
CREATE POLICY "Admins can update all kanban cards"
ON public.kanban_cards
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete all kanban cards"
ON public.kanban_cards
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));