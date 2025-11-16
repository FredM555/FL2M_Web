-- Migration: Update existing appointment_documents table
-- Date: 2025-01-15
-- Description: Add missing columns and constraints to appointment_documents
--              and ensure appointment_comments has all required features

-- ============================================================================
-- SECTION 1: Update appointment_documents table
-- ============================================================================

-- Add missing columns to appointment_documents
ALTER TABLE public.appointment_documents
ADD COLUMN IF NOT EXISTS visible_to_client BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS visible_to_consultant BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Update existing rows to have the new columns with default values
UPDATE public.appointment_documents
SET
  visible_to_client = COALESCE(visible_to_client, true),
  visible_to_consultant = COALESCE(visible_to_consultant, true),
  created_at = COALESCE(created_at, uploaded_at, now()),
  updated_at = COALESCE(updated_at, uploaded_at, now())
WHERE visible_to_client IS NULL
   OR visible_to_consultant IS NULL
   OR created_at IS NULL
   OR updated_at IS NULL;

-- Drop existing constraint if it exists and recreate with proper check
DO $$
BEGIN
  -- Drop old constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'appointment_documents_file_type_check'
  ) THEN
    ALTER TABLE public.appointment_documents DROP CONSTRAINT appointment_documents_file_type_check;
  END IF;
END $$;

-- Add new constraint for file_type
ALTER TABLE public.appointment_documents
ADD CONSTRAINT appointment_documents_file_type_check
CHECK (file_type IN ('pdf', 'mp3', 'mp4'));

-- Ensure file_type is NOT NULL
ALTER TABLE public.appointment_documents
ALTER COLUMN file_type SET NOT NULL;

-- Change file_type from character varying to text for consistency
ALTER TABLE public.appointment_documents
ALTER COLUMN file_type TYPE TEXT;

-- Change file_name from character varying to text for consistency
ALTER TABLE public.appointment_documents
ALTER COLUMN file_name TYPE TEXT;

-- Fix the uploaded_by foreign key to reference profiles instead of auth.users
-- This is needed for the join in getAppointmentDocuments to work
ALTER TABLE public.appointment_documents
DROP CONSTRAINT IF EXISTS appointment_documents_uploaded_by_fkey;

ALTER TABLE public.appointment_documents
ADD CONSTRAINT appointment_documents_uploaded_by_fkey
FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ============================================================================
-- SECTION 2: Create indexes if they don't exist
-- ============================================================================

-- Index on appointment_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointment_documents_appointment
ON public.appointment_documents(appointment_id);

-- Index on uploaded_by for faster user queries
CREATE INDEX IF NOT EXISTS idx_appointment_documents_uploaded_by
ON public.appointment_documents(uploaded_by);

-- Indexes for appointment_comments (should already exist, but ensure they're there)
CREATE INDEX IF NOT EXISTS idx_appointment_comments_appointment
ON public.appointment_comments(appointment_id);

CREATE INDEX IF NOT EXISTS idx_appointment_comments_author
ON public.appointment_comments(author_id);

-- ============================================================================
-- SECTION 3: Create or replace the updated_at trigger function
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 4: Add triggers for updated_at
-- ============================================================================

-- Trigger for appointment_documents
DROP TRIGGER IF EXISTS update_appointment_documents_updated_at ON public.appointment_documents;
CREATE TRIGGER update_appointment_documents_updated_at
  BEFORE UPDATE ON public.appointment_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for appointment_comments
DROP TRIGGER IF EXISTS update_appointment_comments_updated_at ON public.appointment_comments;
CREATE TRIGGER update_appointment_comments_updated_at
  BEFORE UPDATE ON public.appointment_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 5: Enable Row Level Security
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE public.appointment_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_comments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 6: Drop existing policies (clean slate)
-- ============================================================================

-- Drop all existing policies on appointment_documents
DROP POLICY IF EXISTS "Admins have full access to documents" ON public.appointment_documents;
DROP POLICY IF EXISTS "Consultants can upload documents to their appointments" ON public.appointment_documents;
DROP POLICY IF EXISTS "Consultants can view their appointment documents" ON public.appointment_documents;
DROP POLICY IF EXISTS "Consultants can manage their appointment documents" ON public.appointment_documents;
DROP POLICY IF EXISTS "Consultants can delete their appointment documents" ON public.appointment_documents;
DROP POLICY IF EXISTS "Clients can view their appointment documents" ON public.appointment_documents;

-- Drop all existing policies on appointment_comments
DROP POLICY IF EXISTS "Admins have full access to comments" ON public.appointment_comments;
DROP POLICY IF EXISTS "Consultants can create comments on their appointments" ON public.appointment_comments;
DROP POLICY IF EXISTS "Consultants can view all comments on their appointments" ON public.appointment_comments;
DROP POLICY IF EXISTS "Consultants can manage their own comments" ON public.appointment_comments;
DROP POLICY IF EXISTS "Consultants can delete their own comments" ON public.appointment_comments;
DROP POLICY IF EXISTS "Clients can create comments on their appointments" ON public.appointment_comments;
DROP POLICY IF EXISTS "Clients can view public comments on their appointments" ON public.appointment_comments;
DROP POLICY IF EXISTS "Clients can manage their own comments" ON public.appointment_comments;
DROP POLICY IF EXISTS "Clients can delete their own comments" ON public.appointment_comments;

-- ============================================================================
-- SECTION 7: Create RLS Policies for appointment_documents
-- ============================================================================

-- Policy: Admins can do everything
CREATE POLICY "Admins have full access to documents"
  ON public.appointment_documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Policy: Consultants can upload documents to their appointments
CREATE POLICY "Consultants can upload documents to their appointments"
  ON public.appointment_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.appointments a
      INNER JOIN public.practitioners p ON a.practitioner_id = p.id
      WHERE a.id = appointment_documents.appointment_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: Consultants can view documents from their appointments (if visible_to_consultant = true)
CREATE POLICY "Consultants can view their appointment documents"
  ON public.appointment_documents
  FOR SELECT
  TO authenticated
  USING (
    visible_to_consultant = true
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      INNER JOIN public.practitioners p ON a.practitioner_id = p.id
      WHERE a.id = appointment_documents.appointment_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: Consultants can update documents from their appointments
CREATE POLICY "Consultants can manage their appointment documents"
  ON public.appointment_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      INNER JOIN public.practitioners p ON a.practitioner_id = p.id
      WHERE a.id = appointment_documents.appointment_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: Consultants can delete documents from their appointments
CREATE POLICY "Consultants can delete their appointment documents"
  ON public.appointment_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      INNER JOIN public.practitioners p ON a.practitioner_id = p.id
      WHERE a.id = appointment_documents.appointment_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: Clients can view documents from their appointments (if visible_to_client = true)
CREATE POLICY "Clients can view their appointment documents"
  ON public.appointment_documents
  FOR SELECT
  TO authenticated
  USING (
    visible_to_client = true
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_documents.appointment_id
      AND a.client_id = auth.uid()
    )
  );

-- ============================================================================
-- SECTION 8: Create RLS Policies for appointment_comments
-- ============================================================================

-- Policy: Admins can do everything
CREATE POLICY "Admins have full access to comments"
  ON public.appointment_comments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Policy: Consultants can create comments on their appointments
CREATE POLICY "Consultants can create comments on their appointments"
  ON public.appointment_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      INNER JOIN public.practitioners p ON a.practitioner_id = p.id
      WHERE a.id = appointment_comments.appointment_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: Consultants can view all comments (public and private) on their appointments
CREATE POLICY "Consultants can view all comments on their appointments"
  ON public.appointment_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      INNER JOIN public.practitioners p ON a.practitioner_id = p.id
      WHERE a.id = appointment_comments.appointment_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: Consultants can update their own comments
CREATE POLICY "Consultants can manage their own comments"
  ON public.appointment_comments
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid());

-- Policy: Consultants can delete their own comments
CREATE POLICY "Consultants can delete their own comments"
  ON public.appointment_comments
  FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- Policy: Clients can create comments on their appointments
CREATE POLICY "Clients can create comments on their appointments"
  ON public.appointment_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_comments.appointment_id
      AND a.client_id = auth.uid()
    )
  );

-- Policy: Clients can view public comments on their appointments (not private notes)
CREATE POLICY "Clients can view public comments on their appointments"
  ON public.appointment_comments
  FOR SELECT
  TO authenticated
  USING (
    is_private = false
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_comments.appointment_id
      AND a.client_id = auth.uid()
    )
  );

-- Policy: Clients can update their own comments
CREATE POLICY "Clients can manage their own comments"
  ON public.appointment_comments
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid());

-- Policy: Clients can delete their own comments
CREATE POLICY "Clients can delete their own comments"
  ON public.appointment_comments
  FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- ============================================================================
-- SECTION 9: Verification queries
-- ============================================================================

-- Verify columns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'appointment_documents'
    AND column_name = 'visible_to_client'
  ) THEN
    RAISE EXCEPTION 'Column visible_to_client was not added!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'appointment_documents'
    AND column_name = 'visible_to_consultant'
  ) THEN
    RAISE EXCEPTION 'Column visible_to_consultant was not added!';
  END IF;

  RAISE NOTICE '✓ All columns added successfully';
END $$;

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public'
    AND t.tablename = 'appointment_documents'
    AND c.relrowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on appointment_documents';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public'
    AND t.tablename = 'appointment_comments'
    AND c.relrowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on appointment_comments';
  END IF;

  RAISE NOTICE '✓ RLS enabled on both tables';
END $$;

-- Display summary
SELECT
  'appointment_documents' as table_name,
  COUNT(*) as row_count,
  COUNT(CASE WHEN visible_to_client IS NOT NULL THEN 1 END) as rows_with_visibility
FROM public.appointment_documents
UNION ALL
SELECT
  'appointment_comments' as table_name,
  COUNT(*) as row_count,
  NULL as rows_with_visibility
FROM public.appointment_comments;

-- Display policies
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('appointment_documents', 'appointment_comments')
ORDER BY tablename, policyname;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE '✓ Migration completed successfully!';
  RAISE NOTICE '==================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables updated:';
  RAISE NOTICE '  - appointment_documents (columns added, constraints updated)';
  RAISE NOTICE '  - appointment_comments (triggers and policies added)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Create Storage bucket "documents" if not exists';
  RAISE NOTICE '  2. Configure Storage bucket policies';
  RAISE NOTICE '  3. Test the application';
  RAISE NOTICE '';
END $$;
