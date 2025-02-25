-- Check verification status for a specific user
SELECT email, is_verified, verification_token 
FROM users 
WHERE email = 'user@example.com';  -- Replace with the actual email

-- Update verification status if needed
UPDATE users 
SET is_verified = TRUE, 
    verification_token = NULL 
WHERE email = 'user@example.com';  -- Replace with the actual email
