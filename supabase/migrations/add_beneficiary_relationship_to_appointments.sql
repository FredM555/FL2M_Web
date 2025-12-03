-- ============================================================================
-- MODIFICATION TABLE APPOINTMENTS
-- Description : Ajout colonne beneficiary_relationship pour stocker le type de relation
-- ============================================================================

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS beneficiary_relationship TEXT DEFAULT 'other';

COMMENT ON COLUMN appointments.beneficiary_relationship IS 'Type de relation du bénéficiaire (self, child, spouse, parent, sibling, grandparent, grandchild, other)';
