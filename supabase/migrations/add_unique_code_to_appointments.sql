-- Migration: Add unique_code to appointments table
-- Date: 2025-01-23
-- Description: Add a unique code field to appointments for invoicing and user communication

-- Add unique_code column to appointments table
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS unique_code VARCHAR(20) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointments_unique_code ON public.appointments(unique_code);

-- Add comment to explain the field
COMMENT ON COLUMN public.appointments.unique_code IS 'Unique code for appointment identification (non-chronological). Used on invoices and for user communication.';

-- Create function to generate unique appointment code
CREATE OR REPLACE FUNCTION generate_appointment_code()
RETURNS VARCHAR AS $$
DECLARE
  new_code VARCHAR(20);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate code format: RDV-XXXXXXXX (8 random alphanumeric characters)
    new_code := 'RDV-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));

    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.appointments WHERE unique_code = new_code) INTO code_exists;

    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;

  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate code on insert if not provided
CREATE OR REPLACE FUNCTION set_appointment_unique_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unique_code IS NULL THEN
    NEW.unique_code := generate_appointment_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_set_appointment_unique_code ON public.appointments;
CREATE TRIGGER trigger_set_appointment_unique_code
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION set_appointment_unique_code();

-- Update existing appointments to have unique codes (for existing data)
DO $$
DECLARE
  appointment_record RECORD;
BEGIN
  FOR appointment_record IN
    SELECT id FROM public.appointments WHERE unique_code IS NULL
  LOOP
    UPDATE public.appointments
    SET unique_code = generate_appointment_code()
    WHERE id = appointment_record.id;
  END LOOP;
END $$;
