-- Create Enum for notification types
CREATE TYPE public.notification_type AS ENUM ('info', 'alert', 'success');

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type public.notification_type DEFAULT 'info' NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    link_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access notifications" ON public.notifications
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications" ON public.notifications
    FOR SELECT
    USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Triggers for updated_at (optional but good practice)
-- Assuming a common trigger function exists, if not we skip it for simplicity
