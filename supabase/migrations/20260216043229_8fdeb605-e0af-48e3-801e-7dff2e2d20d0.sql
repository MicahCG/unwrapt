-- Fix the payment that was already charged by Stripe but never updated
UPDATE public.payments 
SET status = 'paid', updated_at = now()
WHERE stripe_session_id = 'cs_live_a1vvIugehwfkP39k7d3GH02zjuAgbK5nRpDMeCSYgw5NDLClpKmJH1dUYB';

UPDATE public.scheduled_gifts 
SET payment_status = 'paid', payment_amount = 4500, updated_at = now()
WHERE id = 'ae1fc84d-46da-4a14-b197-b5c324b12bc3';
