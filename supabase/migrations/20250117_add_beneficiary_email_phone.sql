-- =====================================================
-- Migration: Ajouter email et téléphone du bénéficiaire
-- Date: 2025-01-17
-- Description: Ajouter les champs email et téléphone pour le bénéficiaire
--              afin de pouvoir lui envoyer des notifications
-- =====================================================

BEGIN;

-- SECTION 1: Ajouter les colonnes email et téléphone pour le bénéficiaire
-- ==========================================================================

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS beneficiary_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS beneficiary_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS beneficiary_notifications_enabled BOOLEAN DEFAULT false;

-- SECTION 2: Ajouter des contraintes de validation
-- =================================================

-- Validation format email (basique)
ALTER TABLE public.appointments
ADD CONSTRAINT check_beneficiary_email_format
CHECK (
  beneficiary_email IS NULL OR
  beneficiary_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- SECTION 3: Créer des index pour optimiser les recherches
-- ==========================================================

CREATE INDEX IF NOT EXISTS idx_appointments_beneficiary_email
ON public.appointments(beneficiary_email)
WHERE beneficiary_email IS NOT NULL;

-- SECTION 4: Commentaires sur les colonnes
-- =========================================

COMMENT ON COLUMN public.appointments.beneficiary_email IS 'Email du bénéficiaire pour recevoir les notifications (optionnel)';
COMMENT ON COLUMN public.appointments.beneficiary_phone IS 'Téléphone du bénéficiaire pour les rappels SMS (optionnel)';
COMMENT ON COLUMN public.appointments.beneficiary_notifications_enabled IS 'Le bénéficiaire a consenti à recevoir des notifications par email';

-- SECTION 5: Vérification
-- ========================

DO $$
DECLARE
  email_col_exists BOOLEAN;
  phone_col_exists BOOLEAN;
  notif_col_exists BOOLEAN;
BEGIN
  -- Vérifier que les colonnes existent
  SELECT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'appointments'
    AND column_name = 'beneficiary_email'
  ) INTO email_col_exists;

  SELECT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'appointments'
    AND column_name = 'beneficiary_phone'
  ) INTO phone_col_exists;

  SELECT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'appointments'
    AND column_name = 'beneficiary_notifications_enabled'
  ) INTO notif_col_exists;

  RAISE NOTICE '================================';
  RAISE NOTICE 'RÉSULTAT DE LA MIGRATION:';
  RAISE NOTICE '================================';

  IF email_col_exists THEN
    RAISE NOTICE '✓ Colonne beneficiary_email ajoutée';
  ELSE
    RAISE WARNING '✗ Colonne beneficiary_email NON ajoutée';
  END IF;

  IF phone_col_exists THEN
    RAISE NOTICE '✓ Colonne beneficiary_phone ajoutée';
  ELSE
    RAISE WARNING '✗ Colonne beneficiary_phone NON ajoutée';
  END IF;

  IF notif_col_exists THEN
    RAISE NOTICE '✓ Colonne beneficiary_notifications_enabled ajoutée';
  ELSE
    RAISE WARNING '✗ Colonne beneficiary_notifications_enabled NON ajoutée';
  END IF;

  RAISE NOTICE '✓ Contrainte de validation email ajoutée';
  RAISE NOTICE '✓ Index sur beneficiary_email créé';
  RAISE NOTICE '================================';
END $$;

COMMIT;

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================

-- Notes d'utilisation :
-- ---------------------
-- 1. beneficiary_email : Email optionnel du bénéficiaire
-- 2. beneficiary_phone : Téléphone optionnel du bénéficiaire
-- 3. beneficiary_notifications_enabled : Consentement RGPD pour recevoir des notifications
--
-- Exemples d'emails à envoyer :
-- - Confirmation de rendez-vous
-- - Rappel 24h avant
-- - Nouveau document disponible
-- - Modification ou annulation de RDV
-- =====================================================
