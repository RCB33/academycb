-- Create ACADEMY_SETTINGS table
CREATE TABLE public.academy_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    greenapi_id_instance TEXT,
    greenapi_api_token_instance TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Ensure there is only one row for academy settings
CREATE UNIQUE INDEX admin_academy_settings_single_row ON public.academy_settings ((true));

-- RLS
ALTER TABLE public.academy_settings ENABLE ROW LEVEL SECURITY;

-- Allow read/write only by admins
CREATE POLICY "Admins can manage academy settings" ON public.academy_settings FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- Insert initial empty row
INSERT INTO public.academy_settings (greenapi_id_instance, greenapi_api_token_instance)
VALUES (NULL, NULL);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_academy_settings_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_academy_settings_modtime
    BEFORE UPDATE ON public.academy_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_academy_settings_updated_at_column();
