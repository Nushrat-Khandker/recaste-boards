-- Update the board-files bucket to allow up to 200MB file uploads
UPDATE storage.buckets 
SET file_size_limit = 209715200  -- 200MB in bytes
WHERE id = 'board-files';