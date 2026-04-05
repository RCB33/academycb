-- Migration: Add multi-level targeting to media_assets
-- Adds context (academia/campus/torneo), team_id, and child_id for granular video assignment

ALTER TABLE public.media_assets 
ADD COLUMN IF NOT EXISTS context TEXT DEFAULT 'academia',
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES public.children(id) ON DELETE SET NULL;

-- Index for efficient portal queries
CREATE INDEX IF NOT EXISTS idx_media_assets_child_id ON public.media_assets(child_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_team_id ON public.media_assets(team_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_context ON public.media_assets(context);
