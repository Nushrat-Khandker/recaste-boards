
-- Reassign cards owned by nushrat@recaste.com to nushrat@duthchas.ltd
UPDATE kanban_cards SET owner_id = 'd81cbd5d-a223-4fce-905c-8146d73d1dd1' WHERE owner_id = 'a92fb011-769c-4aa2-899d-bbf5a1a6253e';

-- Reassign any cards assigned to duplicate accounts
UPDATE kanban_cards SET assigned_to = 'd81cbd5d-a223-4fce-905c-8146d73d1dd1' WHERE assigned_to = 'a92fb011-769c-4aa2-899d-bbf5a1a6253e';
UPDATE kanban_cards SET assigned_to = 'd81cbd5d-a223-4fce-905c-8146d73d1dd1' WHERE assigned_to = 'd41ab2f7-0d57-4b76-85f5-ad37f5e8497a';
UPDATE kanban_cards SET owner_id = 'b8edd3ce-51d9-46e8-8a6d-ea49349e6d94' WHERE owner_id = '254848fa-0c7d-4203-b633-5e9f6e1b8e7a';
UPDATE kanban_cards SET assigned_to = 'b8edd3ce-51d9-46e8-8a6d-ea49349e6d94' WHERE assigned_to = '254848fa-0c7d-4203-b633-5e9f6e1b8e7a';

-- Remove roles for duplicate accounts
DELETE FROM user_roles WHERE user_id IN ('a92fb011-769c-4aa2-899d-bbf5a1a6253e', 'd41ab2f7-0d57-4b76-85f5-ad37f5e8497a', '254848fa-0c7d-4203-b633-5e9f6e1b8e7a');

-- Remove board_members entries for duplicates
DELETE FROM board_members WHERE user_id IN ('a92fb011-769c-4aa2-899d-bbf5a1a6253e', 'd41ab2f7-0d57-4b76-85f5-ad37f5e8497a', '254848fa-0c7d-4203-b633-5e9f6e1b8e7a');

-- Delete duplicate profiles
DELETE FROM profiles WHERE id IN ('a92fb011-769c-4aa2-899d-bbf5a1a6253e', 'd41ab2f7-0d57-4b76-85f5-ad37f5e8497a', '254848fa-0c7d-4203-b633-5e9f6e1b8e7a');
