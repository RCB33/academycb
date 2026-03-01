-- Migration to ensure children table has avatar_url
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.children ADD COLUMN avatar_url text;
    END IF;
END $$;
