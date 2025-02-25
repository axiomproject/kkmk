INSERT INTO monetary_donations 
(full_name, email, contact_number, amount, message, date, verification_status, verified_at, verified_by, created_at)
VALUES 
-- September donations
('Maria Santos', 'maria@email.com', '09123456789', 5000, 'Monthly support', '2023-09-15', 'verified', '2023-09-15 14:30:00', 'Admin', '2023-09-15 10:30:00'),
('John Doe', 'john@email.com', '09187654321', 3500, 'Keep up the good work', '2023-09-20', 'verified', '2023-09-20 16:45:00', 'Admin', '2023-09-20 13:15:00'),
('Anonymous', 'anonymous1@donation.org', '00000000000', 2000, NULL, '2023-09-25', 'verified', '2023-09-25 09:20:00', 'Admin', '2023-09-25 08:45:00'),

-- October donations
('Peter Parker', 'peter@email.com', '09234567890', 7500, 'Happy to help', '2023-10-05', 'verified', '2023-10-05 11:25:00', 'Admin', '2023-10-05 10:15:00'),
('Mary Jane', 'mary@email.com', '09876543210', 4000, 'Monthly donation', '2023-10-12', 'verified', '2023-10-12 15:30:00', 'Admin', '2023-10-12 14:20:00'),
('Anonymous', 'anonymous2@donation.org', '00000000000', 3000, 'Support education', '2023-10-18', 'verified', '2023-10-18 17:40:00', 'Admin', '2023-10-18 16:30:00'),
('Tony Stark', 'tony@email.com', '09198765432', 10000, 'Education matters', '2023-10-25', 'verified', '2023-10-25 13:15:00', 'Admin', '2023-10-25 12:45:00'),

-- November donations
('Bruce Wayne', 'bruce@email.com', '09876543211', 15000, 'For the future', '2023-11-03', 'verified', '2023-11-03 10:20:00', 'Admin', '2023-11-03 09:15:00'),
('Diana Prince', 'diana@email.com', '09123456788', 6000, 'Happy to contribute', '2023-11-10', 'verified', '2023-11-10 14:50:00', 'Admin', '2023-11-10 13:30:00'),
('Anonymous', 'anonymous3@donation.org', '00000000000', 4500, 'Keep going', '2023-11-17', 'verified', '2023-11-17 16:25:00', 'Admin', '2023-11-17 15:45:00'),
('Clark Kent', 'clark@email.com', '09234567891', 8000, 'For education', '2023-11-24', 'verified', '2023-11-24 11:35:00', 'Admin', '2023-11-24 10:20:00'),

-- December donations
('Barry Allen', 'barry@email.com', '09876543212', 9000, 'Speed up education', '2023-12-02', 'verified', '2023-12-02 09:15:00', 'Admin', '2023-12-02 08:30:00'),
('Hal Jordan', 'hal@email.com', '09123456787', 7000, 'Bright future', '2023-12-09', 'verified', '2023-12-09 13:40:00', 'Admin', '2023-12-09 12:15:00'),
('Anonymous', 'anonymous4@donation.org', '00000000000', 5500, 'Holiday gift', '2023-12-16', 'verified', '2023-12-16 15:55:00', 'Admin', '2023-12-16 14:30:00'),
('Oliver Queen', 'oliver@email.com', '09234567892', 12000, 'Christmas donation', '2023-12-23', 'verified', '2023-12-23 10:45:00', 'Admin', '2023-12-23 09:30:00'),
('Arthur Curry', 'arthur@email.com', '09876543213', 8500, 'Season greetings', '2023-12-30', 'verified', '2023-12-30 16:20:00', 'Admin', '2023-12-30 15:45:00'),

-- January donations
('Victor Stone', 'victor@email.com', '09123456786', 6500, 'New year support', '2024-01-05', 'verified', '2024-01-05 11:30:00', 'Admin', '2024-01-05 10:15:00'),
('Anonymous', 'anonymous5@donation.org', '00000000000', 4000, 'January help', '2024-01-12', 'verified', '2024-01-12 14:25:00', 'Admin', '2024-01-12 13:45:00'),
('Dick Grayson', 'dick@email.com', '09234567893', 7500, 'Monthly support', '2024-01-19', 'verified', '2024-01-19 16:40:00', 'Admin', '2024-01-19 15:30:00'),
('Barbara Gordon', 'barbara@email.com', '09876543214', 9500, 'Education first', '2024-01-26', 'verified', '2024-01-26 12:15:00', 'Admin', '2024-01-26 11:45:00'),

-- February donations (current month)
('Tim Drake', 'tim@email.com', '09123456785', 8000, 'February donation', '2024-02-02', 'verified', '2024-02-02 10:20:00', 'Admin', '2024-02-02 09:15:00'),
('Anonymous', 'anonymous6@donation.org', '00000000000', 5000, 'Keep teaching', '2024-02-09', 'verified', '2024-02-09 15:30:00', 'Admin', '2024-02-09 14:45:00'),
('Jason Todd', 'jason@email.com', '09234567894', 11000, 'Support education', '2024-02-16', 'verified', '2024-02-16 13:45:00', 'Admin', '2024-02-16 12:30:00'),

-- September 2024 donations (larger amounts to show growth)
('Bruce Wayne', 'bruce@email.com', '09876543211', 25000, 'Annual education fund', '2024-09-05', 'verified', '2024-09-05 10:20:00', 'Admin', '2024-09-05 09:15:00'),
('Tony Stark', 'tony@email.com', '09198765432', 18000, 'Tech fund', '2024-09-12', 'verified', '2024-09-12 13:15:00', 'Admin', '2024-09-12 12:45:00'),
('Anonymous', 'anonymous7@donation.org', '00000000000', 12000, 'Support education', '2024-09-20', 'verified', '2024-09-20 15:30:00', 'Admin', '2024-09-20 14:45:00'),
('Diana Prince', 'diana@email.com', '09123456788', 15000, 'Scholarship support', '2024-09-28', 'verified', '2024-09-28 11:45:00', 'Admin', '2024-09-28 10:30:00'),

-- October 2024 donations
('Clark Kent', 'clark@email.com', '09234567891', 20000, 'Monthly contribution', '2024-10-07', 'verified', '2024-10-07 14:20:00', 'Admin', '2024-10-07 13:15:00'),
('Oliver Queen', 'oliver@email.com', '09234567892', 22000, 'Education fund', '2024-10-15', 'verified', '2024-10-15 16:30:00', 'Admin', '2024-10-15 15:45:00'),
('Anonymous', 'anonymous8@donation.org', '00000000000', 13500, 'Future leaders', '2024-10-22', 'verified', '2024-10-22 09:45:00', 'Admin', '2024-10-22 08:30:00'),
('Barbara Gordon', 'barbara@email.com', '09876543214', 17500, 'Tech education', '2024-10-29', 'verified', '2024-10-29 11:20:00', 'Admin', '2024-10-29 10:15:00'),

-- November 2024 donations
('Dick Grayson', 'dick@email.com', '09234567893', 19000, 'Youth support', '2024-11-05', 'verified', '2024-11-05 13:40:00', 'Admin', '2024-11-05 12:30:00'),
('Victor Stone', 'victor@email.com', '09123456786', 21000, 'Innovation fund', '2024-11-12', 'verified', '2024-11-12 15:55:00', 'Admin', '2024-11-12 14:45:00'),
('Anonymous', 'anonymous9@donation.org', '00000000000', 14500, 'Education matters', '2024-11-19', 'verified', '2024-11-19 10:25:00', 'Admin', '2024-11-19 09:15:00'),
('Arthur Curry', 'arthur@email.com', '09876543213', 23000, 'Future support', '2024-11-26', 'verified', '2024-11-26 12:40:00', 'Admin', '2024-11-26 11:30:00'),

-- December 2024 donations (holiday season - higher amounts)
('Bruce Wayne', 'bruce@email.com', '09876543211', 30000, 'Holiday education fund', '2024-12-03', 'verified', '2024-12-03 14:15:00', 'Admin', '2024-12-03 13:00:00'),
('Tony Stark', 'tony@email.com', '09198765432', 28000, 'Christmas donation', '2024-12-10', 'verified', '2024-12-10 16:30:00', 'Admin', '2024-12-10 15:45:00'),
('Anonymous', 'anonymous10@donation.org', '00000000000', 15000, 'Season''s giving', '2024-12-17', 'verified', '2024-12-17 11:20:00', 'Admin', '2024-12-17 10:15:00'),
('Diana Prince', 'diana@email.com', '09123456788', 25000, 'Year-end support', '2024-12-24', 'verified', '2024-12-24 09:45:00', 'Admin', '2024-12-24 08:30:00'),
('Clark Kent', 'clark@email.com', '09234567891', 27000, 'Holiday cheer', '2024-12-31', 'verified', '2024-12-31 13:50:00', 'Admin', '2024-12-31 12:45:00'),

-- January 2025 donations (new year momentum)
('Oliver Queen', 'oliver@email.com', '09234567892', 24000, 'New year support', '2025-01-07', 'verified', '2025-01-07 15:30:00', 'Admin', '2025-01-07 14:15:00'),
('Anonymous', 'anonymous11@donation.org', '00000000000', 16000, 'Fresh start', '2025-01-14', 'verified', '2025-01-14 10:45:00', 'Admin', '2025-01-14 09:30:00'),
('Barbara Gordon', 'barbara@email.com', '09876543214', 22000, '2025 education', '2025-01-21', 'verified', '2025-01-21 14:20:00', 'Admin', '2025-01-21 13:15:00'),
('Dick Grayson', 'dick@email.com', '09234567893', 26000, 'January boost', '2025-01-28', 'verified', '2025-01-28 16:35:00', 'Admin', '2025-01-28 15:30:00');
