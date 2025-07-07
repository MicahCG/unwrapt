-- Remove apostrophe-s suffix from all recipient names
UPDATE recipients 
SET name = CASE 
  WHEN name LIKE '%''s' THEN LEFT(name, LENGTH(name) - 2)
  ELSE name 
END 
WHERE name LIKE '%''s';