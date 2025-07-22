-- Clear existing moon phase data for 2025
DELETE FROM public.moon_phases WHERE date >= '2025-01-01' AND date <= '2025-12-31';

-- Insert complete 2025 moon phase cycle
INSERT INTO public.moon_phases (date, phase) VALUES
-- January 2025
('2025-01-07', 'first_quarter'),
('2025-01-14', 'full'),
('2025-01-22', 'last_quarter'),
('2025-01-29', 'new'),

-- February 2025
('2025-02-05', 'first_quarter'),
('2025-02-12', 'full'),
('2025-02-20', 'last_quarter'),
('2025-02-28', 'new'),

-- March 2025
('2025-03-06', 'first_quarter'),
('2025-03-14', 'full'),
('2025-03-22', 'last_quarter'),
('2025-03-29', 'new'),

-- April 2025
('2025-04-05', 'first_quarter'),
('2025-04-13', 'full'),
('2025-04-21', 'last_quarter'),
('2025-04-28', 'new'),

-- May 2025
('2025-05-04', 'first_quarter'),
('2025-05-12', 'full'),
('2025-05-20', 'last_quarter'),
('2025-05-27', 'new'),

-- June 2025
('2025-06-03', 'first_quarter'),
('2025-06-11', 'full'),
('2025-06-19', 'last_quarter'),
('2025-06-25', 'new'),

-- July 2025
('2025-07-03', 'first_quarter'),
('2025-07-11', 'full'),
('2025-07-18', 'last_quarter'),
('2025-07-25', 'new'),

-- August 2025
('2025-08-01', 'first_quarter'),
('2025-08-09', 'full'),
('2025-08-16', 'last_quarter'),
('2025-08-23', 'new'),
('2025-08-31', 'first_quarter'),

-- September 2025
('2025-09-08', 'full'),
('2025-09-14', 'last_quarter'),
('2025-09-22', 'new'),
('2025-09-30', 'first_quarter'),

-- October 2025
('2025-10-07', 'full'),
('2025-10-14', 'last_quarter'),
('2025-10-21', 'new'),
('2025-10-29', 'first_quarter'),

-- November 2025
('2025-11-05', 'full'),
('2025-11-12', 'last_quarter'),
('2025-11-20', 'new'),
('2025-11-28', 'first_quarter'),

-- December 2025
('2025-12-05', 'full'),
('2025-12-12', 'last_quarter'),
('2025-12-20', 'new'),
('2025-12-28', 'first_quarter');