-- Migrate chat_messages from ghost profile (typo email) to real Nushrat profile
UPDATE chat_messages SET user_id = 'd81cbd5d-a223-4fce-905c-8146d73d1dd1' WHERE user_id = '3ad710ac-a3b8-4136-a9fc-7c19922caa58';

-- Migrate notifications
UPDATE notifications SET user_id = 'd81cbd5d-a223-4fce-905c-8146d73d1dd1' WHERE user_id = '3ad710ac-a3b8-4136-a9fc-7c19922caa58';

-- Delete ghost profile
DELETE FROM profiles WHERE id = '3ad710ac-a3b8-4136-a9fc-7c19922caa58';