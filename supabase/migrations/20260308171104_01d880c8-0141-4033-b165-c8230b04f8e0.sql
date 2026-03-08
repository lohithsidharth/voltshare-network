
-- 1. Create charger-photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('charger-photos', 'charger-photos', true);

-- Storage RLS: Anyone can view photos
CREATE POLICY "Public can view charger photos" ON storage.objects FOR SELECT USING (bucket_id = 'charger-photos');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload charger photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'charger-photos');

-- Users can delete their own uploads
CREATE POLICY "Users can delete own charger photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'charger-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 2. Create favorites table
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  charger_id UUID NOT NULL REFERENCES public.chargers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, charger_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. Add verification fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_date TIMESTAMPTZ;

-- 4. Enable realtime for favorites
ALTER PUBLICATION supabase_realtime ADD TABLE public.favorites;
