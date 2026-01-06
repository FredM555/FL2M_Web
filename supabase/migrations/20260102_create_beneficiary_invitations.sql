-- Migration : Créer la table beneficiary_invitations
-- Date: 2026-01-02
-- Description: Table pour gérer les invitations de bénéficiaires et le transfert de propriété

-- 1. Créer la table beneficiary_invitations
CREATE TABLE IF NOT EXISTS beneficiary_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Références
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Email invité
  invited_email TEXT NOT NULL,

  -- Token unique pour l'invitation
  invitation_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),

  -- Statut
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),

  -- Dates
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Métadonnées
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Créer des index
CREATE INDEX idx_beneficiary_invitations_token
  ON beneficiary_invitations(invitation_token);

CREATE INDEX idx_beneficiary_invitations_email
  ON beneficiary_invitations(invited_email);

CREATE INDEX idx_beneficiary_invitations_status
  ON beneficiary_invitations(status)
  WHERE status = 'pending';

CREATE INDEX idx_beneficiary_invitations_beneficiary
  ON beneficiary_invitations(beneficiary_id);

-- 3. Activer RLS
ALTER TABLE beneficiary_invitations ENABLE ROW LEVEL SECURITY;

-- 4. Politiques RLS

-- Les utilisateurs peuvent voir les invitations qu'ils ont envoyées
CREATE POLICY "Users can view invitations they sent"
  ON beneficiary_invitations
  FOR SELECT
  USING (invited_by = auth.uid());

-- Les utilisateurs peuvent voir les invitations pour leur email
CREATE POLICY "Users can view invitations for their email"
  ON beneficiary_invitations
  FOR SELECT
  USING (invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Les utilisateurs peuvent créer des invitations pour leurs bénéficiaires
CREATE POLICY "Users can create invitations for their beneficiaries"
  ON beneficiary_invitations
  FOR INSERT
  WITH CHECK (
    invited_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM beneficiaries
      WHERE id = beneficiary_id
      AND owner_id = auth.uid()
    )
  );

-- Les utilisateurs peuvent annuler leurs propres invitations
CREATE POLICY "Users can cancel their invitations"
  ON beneficiary_invitations
  FOR UPDATE
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());

-- Les utilisateurs peuvent accepter les invitations qui leur sont destinées
CREATE POLICY "Users can accept invitations sent to their email"
  ON beneficiary_invitations
  FOR UPDATE
  USING (invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (true);

-- Les admins ont tous les droits
CREATE POLICY "Admins have full access to invitations"
  ON beneficiary_invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'
    )
  );

-- 5. Fonction pour nettoyer les invitations expirées
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE beneficiary_invitations
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < now();
END;
$$;

-- 6. Commentaires
COMMENT ON TABLE beneficiary_invitations IS 'Invitations pour permettre aux bénéficiaires de revendiquer leur profil';
COMMENT ON COLUMN beneficiary_invitations.invitation_token IS 'Token unique pour identifier l''invitation dans l''URL';
COMMENT ON COLUMN beneficiary_invitations.invited_email IS 'Email de la personne invitée (doit correspondre à l''email du bénéficiaire)';
COMMENT ON COLUMN beneficiary_invitations.status IS 'Statut de l''invitation: pending, accepted, expired, cancelled';
