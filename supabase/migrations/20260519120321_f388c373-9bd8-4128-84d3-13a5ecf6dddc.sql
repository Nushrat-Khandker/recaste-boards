
-- Delete stray duplicate and test accounts, keeping one per real user
DELETE FROM auth.users WHERE id IN (
  '659efd51-2ef3-4c7c-93d5-41857d5906a9', -- mahedihasns@gmail.com (dup of Mahedi)
  '5261225c-6879-47e1-9211-cdd1ac195ec3', -- oishorjo@duthchas.com (dup of Oishorjo)
  '4777a97d-4a20-4f18-991d-9372858754a5', -- sabih.huq@gmail.com (dup of Sabih)
  'f2168792-b044-40f4-b4a7-6f0e4b35b8af', -- newuser@recaste.com
  '796e2e39-7725-4b49-9e7c-bfda35966168', -- outsider@gmail.com
  '5e18d744-26b0-46c5-9547-46aafd233cc1', -- test@recaste.com
  'a0084e4b-aefa-4d44-a8b3-18343e2cd460'  -- testuser@recaste.com
);

DELETE FROM public.profiles WHERE id IN (
  '659efd51-2ef3-4c7c-93d5-41857d5906a9',
  '5261225c-6879-47e1-9211-cdd1ac195ec3',
  '4777a97d-4a20-4f18-991d-9372858754a5',
  'f2168792-b044-40f4-b4a7-6f0e4b35b8af',
  '796e2e39-7725-4b49-9e7c-bfda35966168',
  '5e18d744-26b0-46c5-9547-46aafd233cc1',
  'a0084e4b-aefa-4d44-a8b3-18343e2cd460'
);

-- Fix Oishorjo's display name (currently showing "Afrin Fardous")
UPDATE public.profiles 
SET full_name = 'Oishorjo' 
WHERE id = 'd3ecd098-c502-4495-88da-b27dc7e4f440';

-- Add unique constraint on lowercased email to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_unique 
ON public.profiles (lower(email));
