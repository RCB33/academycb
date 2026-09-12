ALTER TABLE public.broadcast_logs ADD COLUMN IF NOT EXISTS recipient_user_ids uuid[];
DROP POLICY IF EXISTS broadcast_logs_guardian_read ON public.broadcast_logs;
CREATE POLICY broadcast_logs_guardian_read ON public.broadcast_logs FOR SELECT TO authenticated
USING (channel = 'portal' AND (
  (recipient_user_ids IS NOT NULL AND (SELECT auth.uid()) = ANY(recipient_user_ids))
  OR (recipient_user_ids IS NULL AND (
    (category_name = 'Todos' AND EXISTS (SELECT 1 FROM public.guardians g WHERE g.user_id = (SELECT auth.uid())))
    OR EXISTS (SELECT 1 FROM public.children c
      LEFT JOIN public.categories cat ON cat.id = c.category_id
      LEFT JOIN public.teams t ON t.id = c.team_id
      WHERE public.is_guardian_of(c.id) AND (cat.name = broadcast_logs.category_name OR t.name = broadcast_logs.category_name))
  ))
));
