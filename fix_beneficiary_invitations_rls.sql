-- Fix RLS policies for beneficiary_invitations table
-- This script drops ALL existing policies and recreates them with correct references

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view invitations they sent" ON beneficiary_invitations;
DROP POLICY IF EXISTS "Users can view invitations for their email" ON beneficiary_invitations;
DROP POLICY IF EXISTS "Users can create invitations for their beneficiaries" ON beneficiary_invitations;
DROP POLICY IF EXISTS "Users can cancel their invitations" ON beneficiary_invitations;
DROP POLICY IF EXISTS "Users can accept invitations sent to their email" ON beneficiary_invitations;
DROP POLICY IF EXISTS "Admins have full access to invitations" ON beneficiary_invitations;

-- Recreate ALL policies with correct references to profiles table

-- Les utilisateurs peuvent voir les invitations qu'ils ont envoyées
CREATE POLICY "Users can view invitations they sent"
  ON beneficiary_invitations
  FOR SELECT
  USING (invited_by = auth.uid());

-- Les utilisateurs peuvent voir les invitations pour leur email
CREATE POLICY "Users can view invitations for their email"
  ON beneficiary_invitations
  FOR SELECT
  USING (invited_email = (SELECT email FROM profiles WHERE id = auth.uid()));

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
  USING (invited_email = (SELECT email FROM profiles WHERE id = auth.uid()))
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
