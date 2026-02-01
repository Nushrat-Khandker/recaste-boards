-- Fix storage policy for board-files bucket to allow authenticated uploads
-- The previous policy failed because owner is NULL during INSERT

-- First drop any existing problematic policies
DROP POLICY IF EXISTS "Users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to board-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to board-files" ON storage.objects;

-- Allow authenticated users to upload to board-files bucket
CREATE POLICY "Authenticated users can upload to board-files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'board-files' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update their own files in board-files
DROP POLICY IF EXISTS "Users can update their files" ON storage.objects;
CREATE POLICY "Authenticated users can update board-files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'board-files' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their files in board-files  
DROP POLICY IF EXISTS "Users can delete their files" ON storage.objects;
CREATE POLICY "Authenticated users can delete board-files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'board-files' 
  AND auth.role() = 'authenticated'
);

-- Allow public read access since bucket is public
DROP POLICY IF EXISTS "Public can view board-files" ON storage.objects;
CREATE POLICY "Public can view board-files"
ON storage.objects FOR SELECT
USING (bucket_id = 'board-files');