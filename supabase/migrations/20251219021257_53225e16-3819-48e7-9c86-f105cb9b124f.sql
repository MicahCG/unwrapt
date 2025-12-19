-- Update chunkeydude64@gmail.com to VIP status
UPDATE profiles 
SET subscription_tier = 'vip', subscription_status = 'active' 
WHERE email = 'chunkeydude64@gmail.com';