-- Add beneficiary_email column to appointments table
-- This allows storing the beneficiary's email separately from the client's email

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS beneficiary_email text;

COMMENT ON COLUMN public.appointments.beneficiary_email IS 'Email du bénéficiaire (peut être différent de l''email du client)';
