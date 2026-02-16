-- Reset the cancelled gift so the dashboard UI updates
DELETE FROM public.scheduled_gifts 
WHERE id = 'ae1fc84d-46da-4a14-b197-b5c324b12bc3';