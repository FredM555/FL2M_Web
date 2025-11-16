-- Migration: Add appointment documents and comments system
-- Created: 2025-01-15

-- Table: appointment_documents
-- Stores PDF and audio files (MP3/MP4) for appointments
CREATE TABLE IF NOT EXISTS appointment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'mp3', 'mp4')),
  file_size INTEGER,
  description TEXT,

  -- Visibility options
  visible_to_client BOOLEAN DEFAULT true,
  visible_to_consultant BOOLEAN DEFAULT true,

  -- Metadata
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT now(),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: appointment_comments
-- Stores comments and private notes for appointments
CREATE TABLE IF NOT EXISTS appointment_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,

  -- Privacy settings
  is_private BOOLEAN DEFAULT false, -- true = note privée du consultant, false = commentaire public

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for better query performance
CREATE INDEX idx_appointment_documents_appointment ON appointment_documents(appointment_id);
CREATE INDEX idx_appointment_documents_uploaded_by ON appointment_documents(uploaded_by);
CREATE INDEX idx_appointment_comments_appointment ON appointment_comments(appointment_id);
CREATE INDEX idx_appointment_comments_author ON appointment_comments(author_id);

-- Enable Row Level Security
ALTER TABLE appointment_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointment_documents

-- Policy: Admins can do everything
CREATE POLICY "Admins have full access to documents"
  ON appointment_documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Policy: Consultants can upload documents to their appointments
CREATE POLICY "Consultants can upload documents to their appointments"
  ON appointment_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments a
      INNER JOIN practitioners p ON a.practitioner_id = p.id
      WHERE a.id = appointment_documents.appointment_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: Consultants can view documents from their appointments (if visible_to_consultant = true)
CREATE POLICY "Consultants can view their appointment documents"
  ON appointment_documents
  FOR SELECT
  TO authenticated
  USING (
    visible_to_consultant = true
    AND EXISTS (
      SELECT 1 FROM appointments a
      INNER JOIN practitioners p ON a.practitioner_id = p.id
      WHERE a.id = appointment_documents.appointment_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: Consultants can update/delete documents from their appointments
CREATE POLICY "Consultants can manage their appointment documents"
  ON appointment_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      INNER JOIN practitioners p ON a.practitioner_id = p.id
      WHERE a.id = appointment_documents.appointment_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Consultants can delete their appointment documents"
  ON appointment_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      INNER JOIN practitioners p ON a.practitioner_id = p.id
      WHERE a.id = appointment_documents.appointment_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: Clients can view documents from their appointments (if visible_to_client = true)
CREATE POLICY "Clients can view their appointment documents"
  ON appointment_documents
  FOR SELECT
  TO authenticated
  USING (
    visible_to_client = true
    AND EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_documents.appointment_id
      AND a.client_id = auth.uid()
    )
  );

-- RLS Policies for appointment_comments

-- Policy: Admins can do everything
CREATE POLICY "Admins have full access to comments"
  ON appointment_comments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Policy: Consultants can create comments on their appointments
CREATE POLICY "Consultants can create comments on their appointments"
  ON appointment_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM appointments a
      INNER JOIN practitioners p ON a.practitioner_id = p.id
      WHERE a.id = appointment_comments.appointment_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: Consultants can view all comments (public and private) on their appointments
CREATE POLICY "Consultants can view all comments on their appointments"
  ON appointment_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      INNER JOIN practitioners p ON a.practitioner_id = p.id
      WHERE a.id = appointment_comments.appointment_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: Consultants can update/delete their own comments
CREATE POLICY "Consultants can manage their own comments"
  ON appointment_comments
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "Consultants can delete their own comments"
  ON appointment_comments
  FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- Policy: Clients can create comments on their appointments
CREATE POLICY "Clients can create comments on their appointments"
  ON appointment_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_comments.appointment_id
      AND a.client_id = auth.uid()
    )
  );

-- Policy: Clients can view public comments on their appointments (not private notes)
CREATE POLICY "Clients can view public comments on their appointments"
  ON appointment_comments
  FOR SELECT
  TO authenticated
  USING (
    is_private = false
    AND EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_comments.appointment_id
      AND a.client_id = auth.uid()
    )
  );

-- Policy: Clients can update/delete their own comments
CREATE POLICY "Clients can manage their own comments"
  ON appointment_comments
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "Clients can delete their own comments"
  ON appointment_comments
  FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- Triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_appointment_documents_updated_at
  BEFORE UPDATE ON appointment_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointment_comments_updated_at
  BEFORE UPDATE ON appointment_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
