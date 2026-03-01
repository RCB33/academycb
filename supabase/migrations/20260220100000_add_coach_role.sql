-- Safely update the role check constraint to include 'coach'
-- Safely update the role check constraint to include 'coach'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'staff', 'finance', 'marketing', 'guardian', 'coach'));

-- Helper function to check if user is a coach or admin
CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'coach', 'staff')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Coaches can read calendar events
CREATE POLICY "Coaches can view calendar events" ON public.calendar_events
  FOR SELECT USING (is_coach());

-- Coaches can manage training sessions
CREATE POLICY "Coaches can manage training sessions" ON public.training_sessions
  FOR ALL USING (is_coach());

-- Link calendar events to a specific category (team) so coaches know who to attendance
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Add location for family portal usage
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS location TEXT;

