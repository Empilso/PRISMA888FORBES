-- Update strategies status check constraint to include 'published'

ALTER TABLE strategies DROP CONSTRAINT IF EXISTS strategies_status_check;

ALTER TABLE strategies
  ADD CONSTRAINT strategies_status_check 
  CHECK (status IN ('suggested', 'approved', 'rejected', 'executed', 'published'));
