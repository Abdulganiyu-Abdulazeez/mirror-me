-- ============================================================
-- PROFILE PICTURE & AVATAR STORAGE SETUP FOR SUPABASE
-- Run this script in your Supabase SQL Editor to enable avatars
-- ============================================================

-- 1. Ensure avatar_url column exists on public.profiles without modifying existing data
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Create the public 'avatars' storage bucket in Supabase
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Storage Security Policies for 'avatars' bucket (Zero-Warning Idempotent Setup)
DO $$
BEGIN
  -- A. Allow anyone to view and load avatars publicly
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public avatars are viewable by everyone'
  ) THEN
    CREATE POLICY "Public avatars are viewable by everyone" 
      ON storage.objects FOR SELECT 
      USING (bucket_id = 'avatars');
  END IF;

  -- B. Allow users to upload and store their profile picture
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anyone can upload avatar pictures'
  ) THEN
    CREATE POLICY "Anyone can upload avatar pictures" 
      ON storage.objects FOR INSERT 
      WITH CHECK (bucket_id = 'avatars');
  END IF;

  -- C. Allow users to update their profile picture
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update avatar pictures'
  ) THEN
    CREATE POLICY "Users can update avatar pictures" 
      ON storage.objects FOR UPDATE 
      USING (bucket_id = 'avatars');
  END IF;
END $$;

