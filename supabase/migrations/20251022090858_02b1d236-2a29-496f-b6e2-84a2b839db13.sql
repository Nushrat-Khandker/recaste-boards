-- Update board-files bucket to be public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'board-files';