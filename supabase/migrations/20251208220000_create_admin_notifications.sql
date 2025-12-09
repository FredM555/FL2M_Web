-- Migration: Création de la table admin_notifications
-- Pour stocker les notifications de contestation et autres alertes admin

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- 'contestation', 'urgent', 'info', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  read_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX idx_admin_notifications_created_at ON admin_notifications(created_at DESC);
CREATE INDEX idx_admin_notifications_appointment ON admin_notifications(related_appointment_id);

-- RLS policies (visible uniquement par les admins)
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all notifications"
  ON admin_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Les admins peuvent marquer comme lu
CREATE POLICY "Admins can update notifications"
  ON admin_notifications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Commentaire
COMMENT ON TABLE admin_notifications IS 'Notifications pour les administrateurs (contestations, alertes, etc.)';
