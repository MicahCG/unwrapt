
-- Clean up duplicate recipients that have no scheduled gifts
-- For exact name+birthday duplicates, keep the earliest created one
-- Step 1: Delete exact duplicates (same name, same birthday, no gifts)
DELETE FROM recipients WHERE id IN (
  -- Aliza's duplicate
  '015a0033-4d56-48a1-8eb5-8413258300f2',
  -- Dad's duplicate
  '3498f1e3-4b6f-4253-bba8-f994ceebfeb7',
  -- Justin Anderson's duplicate
  '3dab5edc-263d-406b-af4e-ceb19ad237ee',
  -- Stephs duplicate
  '7f33f454-26bb-410c-b96e-a15abfd2083a',
  -- Turner Gray duplicate
  '23b00b0b-40b4-4c4f-8247-0b638712018b',
  -- "Stella's Birthday" (bad extraction, whole event summary as name, 0 gifts)
  'f7692831-3991-414c-bd55-3a6455c34671',
  -- Happy ! duplicates (keeping oldest with gift_count=1 and one with gift_count=2)
  '553d8273-e4a0-4568-8e83-7d01fb403a6d',
  '6d148f20-3a50-46d9-8c46-dc139c075327',
  'cd489341-9dd6-480b-a686-0686dec16efd',
  '906229ee-ca3a-4aeb-8666-3b86ae028cf2',
  '6e4e678d-b6d3-46bb-951b-5f599ad8bf51'
);
