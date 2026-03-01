-- Add new columns to calendar_events for the unified calendar widget
ALTER TABLE public.calendar_events
ADD COLUMN worker_id UUID REFERENCES public.workers(id) ON DELETE SET NULL,
ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
ADD COLUMN location TEXT;

-- Refresh schema cache for PostgREST (sometimes needed if the frontend uses the types directly and we get 'schema cache' errors)
NOTIFY pgrst, 'reload schema';
