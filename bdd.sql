-- ============================================================================
-- SCHÉMA DE BASE DE DONNÉES COMPLET - FL²M Services
-- Date de création : 22 janvier 2025
-- Description : Structure complète de la base de données avec architecture
--               bénéficiaires, numérologie, documents et rendez-vous
-- ============================================================================

-- ============================================================================
-- TABLE : BENEFICIARIES
-- Description : Bénéficiaires avec propriétaire principal et numérologie
-- ============================================================================

CREATE TABLE IF NOT EXISTS beneficiaries (
  -- Identifiant unique
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Propriétaire principal (obligatoire)
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

  -- Identité (obligatoire)
  first_name VARCHAR(100) NOT NULL,
  middle_names VARCHAR(200),  -- Tous les autres prénoms
  last_name VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,

  -- Contact (optionnel)
  email VARCHAR(255),
  phone VARCHAR(20),
  notifications_enabled BOOLEAN DEFAULT false,

  -- Données de numérologie (calculées automatiquement)
  tronc INTEGER,                  -- Objectif de vie (jour + mois)
  racine_1 INTEGER,               -- Chemin de vie (jour + mois + année)
  racine_2 INTEGER,               -- Expression (prénom + nom)
  dynamique_de_vie INTEGER,       -- Tronc + racine_1 + racine_2
  ecorce INTEGER,                 -- Jour de naissance
  branche INTEGER,                -- Nombre de lettres A,J,S
  feuille INTEGER,                -- Somme des voyelles
  fruit INTEGER,                  -- Somme des consonnes

  -- Ordre d'affichage personnalisé
  display_order INTEGER,

  -- Données supplémentaires flexibles (JSONB)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Notes générales
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),

  -- Contraintes
  CONSTRAINT unique_beneficiary UNIQUE (first_name, last_name, birth_date),
  CONSTRAINT beneficiaries_tronc_check CHECK (
    tronc IS NULL OR (tronc >= 1 AND tronc <= 9) OR tronc IN (11, 22, 33)
  ),
  CONSTRAINT beneficiaries_racine_1_check CHECK (
    racine_1 IS NULL OR (racine_1 >= 1 AND racine_1 <= 9) OR racine_1 IN (11, 22, 33)
  ),
  CONSTRAINT beneficiaries_racine_2_check CHECK (
    racine_2 IS NULL OR (racine_2 >= 1 AND racine_2 <= 9) OR racine_2 IN (11, 22, 33)
  )
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_beneficiaries_owner ON beneficiaries(owner_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_name ON beneficiaries(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_birth_date ON beneficiaries(birth_date);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_email ON beneficiaries(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_beneficiaries_created_at ON beneficiaries(created_at DESC);

-- Commentaires
COMMENT ON TABLE beneficiaries IS 'Bénéficiaires avec propriétaire unique et calculs numérologiques automatiques';
COMMENT ON COLUMN beneficiaries.owner_id IS 'Propriétaire principal du bénéficiaire';
COMMENT ON COLUMN beneficiaries.middle_names IS 'Tous les autres prénoms séparés par des espaces';
COMMENT ON COLUMN beneficiaries.tronc IS 'Objectif de vie - Calculé à partir de jour + mois de naissance';
COMMENT ON COLUMN beneficiaries.racine_1 IS 'Chemin de vie - Calculé à partir de jour + mois + année';
COMMENT ON COLUMN beneficiaries.racine_2 IS 'Expression - Calculé à partir du prénom + nom';
COMMENT ON COLUMN beneficiaries.display_order IS 'Ordre d''affichage personnalisé par le propriétaire';

-- ============================================================================
-- TABLE : BENEFICIARY_ACCESS
-- Description : Partage et délégation d'accès aux bénéficiaires
-- ============================================================================

CREATE TABLE IF NOT EXISTS beneficiary_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relations
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Type de relation
  relationship VARCHAR(50) NOT NULL,  -- 'self', 'child', 'spouse', 'parent', 'sibling', etc.

  -- Niveaux d'accès
  access_level VARCHAR(20) NOT NULL DEFAULT 'view',  -- 'view', 'book', 'edit', 'admin'
  can_book BOOLEAN DEFAULT true,
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  can_share BOOLEAN DEFAULT false,

  -- Ordre d'affichage pour les accès partagés
  display_order INTEGER,

  -- Notes sur cette relation
  notes TEXT,

  -- Audit
  granted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  granted_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ,  -- Accès temporaire possible

  -- Contrainte
  CONSTRAINT unique_user_beneficiary UNIQUE (user_id, beneficiary_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_beneficiary_access_beneficiary ON beneficiary_access(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_access_user ON beneficiary_access(user_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_access_relationship ON beneficiary_access(relationship);
CREATE INDEX IF NOT EXISTS idx_beneficiary_access_expires ON beneficiary_access(expires_at);

COMMENT ON TABLE beneficiary_access IS 'Gestion des accès partagés aux bénéficiaires';
COMMENT ON COLUMN beneficiary_access.access_level IS 'Niveau global : view < book < edit < admin';
COMMENT ON COLUMN beneficiary_access.expires_at IS 'Date d''expiration de l''accès (NULL = permanent)';
COMMENT ON COLUMN beneficiary_access.display_order IS 'Ordre d''affichage personnalisé pour les accès partagés';

-- ============================================================================
-- TABLE : APPOINTMENT_BENEFICIARIES
-- Description : Relation many-to-many entre rendez-vous et bénéficiaires
-- ============================================================================

CREATE TABLE IF NOT EXISTS appointment_beneficiaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relations
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE RESTRICT,

  -- Rôle dans le rendez-vous
  role VARCHAR(20) DEFAULT 'primary',  -- 'primary', 'partner', 'team_member', 'child', 'parent'
  role_order INTEGER DEFAULT 1,

  -- Notes spécifiques
  notes TEXT,

  -- Notifications
  receives_notifications BOOLEAN DEFAULT true,

  -- Confirmation des données du bénéficiaire
  beneficiary_data_confirmed_at TIMESTAMPTZ,
  beneficiary_data_confirmed_by UUID REFERENCES profiles(id),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Contrainte
  CONSTRAINT unique_appointment_beneficiary UNIQUE (appointment_id, beneficiary_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_appointment_beneficiaries_appointment ON appointment_beneficiaries(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_beneficiaries_beneficiary ON appointment_beneficiaries(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_appointment_beneficiaries_role ON appointment_beneficiaries(role);
CREATE INDEX IF NOT EXISTS idx_appointment_beneficiaries_confirmed ON appointment_beneficiaries(beneficiary_data_confirmed_at)
WHERE beneficiary_data_confirmed_at IS NOT NULL;

COMMENT ON TABLE appointment_beneficiaries IS 'Relation many-to-many entre rendez-vous et bénéficiaires (support couples/équipes)';

-- ============================================================================
-- TABLE : BENEFICIARY_DOCUMENTS
-- Description : Documents PDF attachés aux bénéficiaires
-- ============================================================================

CREATE TABLE IF NOT EXISTS beneficiary_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,

  -- Informations fichier
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT NOT NULL CHECK (file_type = 'pdf'),

  -- Type et visibilité
  document_type TEXT NOT NULL DEFAULT 'autre'
    CHECK (document_type IN ('arbre', 'arbre_detail', 'plan_de_vie', 'analyse', 'autre')),
  visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('public', 'private')),

  -- Métadonnées
  description TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_beneficiary_documents_beneficiary_id ON beneficiary_documents(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_documents_uploaded_by ON beneficiary_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_beneficiary_documents_visibility ON beneficiary_documents(visibility);

COMMENT ON TABLE beneficiary_documents IS 'Documents PDF attachés aux bénéficiaires';
COMMENT ON COLUMN beneficiary_documents.document_type IS 'Type de document: arbre (public), arbre_detail (privé), plan_de_vie (privé), analyse (privé), autre (privé)';
COMMENT ON COLUMN beneficiary_documents.visibility IS 'Visibilité: public (visible par bénéficiaire) ou private (intervenants/admins uniquement)';

-- ============================================================================
-- MODIFICATION TABLE PROFILES
-- Description : Lien optionnel vers bénéficiaire "soi-même"
-- ============================================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_beneficiary ON profiles(beneficiary_id);

COMMENT ON COLUMN profiles.beneficiary_id IS 'Lien vers le bénéficiaire représentant l''utilisateur lui-même (optionnel)';

-- ============================================================================
-- MODIFICATION TABLE APPOINTMENTS
-- Description : Ajout email bénéficiaire et type de relation
-- ============================================================================

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS beneficiary_email TEXT;

COMMENT ON COLUMN appointments.beneficiary_email IS 'Email du bénéficiaire (peut être différent de l''email du client)';

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS beneficiary_relationship TEXT DEFAULT 'other';

COMMENT ON COLUMN appointments.beneficiary_relationship IS 'Type de relation du bénéficiaire (self, child, spouse, parent, sibling, grandparent, grandchild, other)';

-- ============================================================================
-- FONCTIONS : NUMÉROLOGIE
-- ============================================================================

-- Réduire un nombre en préservant les nombres maîtres (11, 22, 33)
CREATE OR REPLACE FUNCTION reduce_number(num INTEGER)
RETURNS INTEGER AS $$
DECLARE
  sum INTEGER;
  digit INTEGER;
  temp_num INTEGER;
BEGIN
  IF num >= 1 AND num <= 9 THEN RETURN num; END IF;
  IF num IN (11, 22, 33) THEN RETURN num; END IF;

  sum := 0;
  temp_num := ABS(num);
  WHILE temp_num > 0 LOOP
    digit := temp_num % 10;
    sum := sum + digit;
    temp_num := temp_num / 10;
  END LOOP;

  IF sum IN (11, 22, 33) THEN RETURN sum; END IF;
  IF sum > 9 THEN RETURN reduce_number(sum); END IF;

  RETURN sum;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculer la valeur numérologique d'une lettre
CREATE OR REPLACE FUNCTION get_letter_value(letter CHAR)
RETURNS INTEGER AS $$
BEGIN
  CASE UPPER(letter)
    WHEN 'A' THEN RETURN 1; WHEN 'B' THEN RETURN 2; WHEN 'C' THEN RETURN 3;
    WHEN 'D' THEN RETURN 4; WHEN 'E' THEN RETURN 5; WHEN 'F' THEN RETURN 6;
    WHEN 'G' THEN RETURN 7; WHEN 'H' THEN RETURN 8; WHEN 'I' THEN RETURN 9;
    WHEN 'J' THEN RETURN 1; WHEN 'K' THEN RETURN 2; WHEN 'L' THEN RETURN 3;
    WHEN 'M' THEN RETURN 4; WHEN 'N' THEN RETURN 5; WHEN 'O' THEN RETURN 6;
    WHEN 'P' THEN RETURN 7; WHEN 'Q' THEN RETURN 8; WHEN 'R' THEN RETURN 9;
    WHEN 'S' THEN RETURN 1; WHEN 'T' THEN RETURN 2; WHEN 'U' THEN RETURN 3;
    WHEN 'V' THEN RETURN 4; WHEN 'W' THEN RETURN 5; WHEN 'X' THEN RETURN 6;
    WHEN 'Y' THEN RETURN 7; WHEN 'Z' THEN RETURN 8;
    -- Lettres accentuées
    WHEN 'À', 'Á', 'Â', 'Ã', 'Ä', 'Å' THEN RETURN 1;
    WHEN 'È', 'É', 'Ê', 'Ë' THEN RETURN 5;
    WHEN 'Ì', 'Í', 'Î', 'Ï' THEN RETURN 9;
    WHEN 'Ò', 'Ó', 'Ô', 'Õ', 'Ö' THEN RETURN 6;
    WHEN 'Ù', 'Ú', 'Û', 'Ü' THEN RETURN 3;
    WHEN 'Ý', 'Ÿ' THEN RETURN 7;
    WHEN 'Ç' THEN RETURN 3; WHEN 'Ñ' THEN RETURN 5;
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculer la valeur numérologique d'un nom
CREATE OR REPLACE FUNCTION calculate_name_value(name TEXT)
RETURNS INTEGER AS $$
DECLARE
  sum INTEGER := 0;
  letter CHAR;
  i INTEGER;
  clean_name TEXT;
BEGIN
  IF name IS NULL OR TRIM(name) = '' THEN RETURN 0; END IF;

  clean_name := UPPER(TRIM(name));
  clean_name := REGEXP_REPLACE(clean_name, '[^A-ZÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÇÑÆŒ]', '', 'g');

  FOR i IN 1..LENGTH(clean_name) LOOP
    letter := SUBSTRING(clean_name FROM i FOR 1);
    sum := sum + get_letter_value(letter);
  END LOOP;

  RETURN reduce_number(sum);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculer racine_1 (Chemin de vie)
CREATE OR REPLACE FUNCTION calculate_racine_1(birth_date DATE)
RETURNS INTEGER AS $$
DECLARE
  day INTEGER; month INTEGER; year INTEGER;
  reduced_day INTEGER; reduced_month INTEGER; reduced_year INTEGER;
  total INTEGER;
BEGIN
  IF birth_date IS NULL THEN RETURN NULL; END IF;

  day := EXTRACT(DAY FROM birth_date);
  month := EXTRACT(MONTH FROM birth_date);
  year := EXTRACT(YEAR FROM birth_date);

  reduced_day := reduce_number(day);
  reduced_month := reduce_number(month);
  reduced_year := reduce_number(year);
  total := reduced_day + reduced_month + reduced_year;

  RETURN reduce_number(total);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculer racine_2 (Expression)
CREATE OR REPLACE FUNCTION calculate_racine_2(
  first_name TEXT,
  last_name TEXT,
  middle_names TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  first_value INTEGER; middle_value INTEGER; last_value INTEGER; total INTEGER;
BEGIN
  IF first_name IS NULL AND last_name IS NULL THEN RETURN NULL; END IF;

  first_value := calculate_name_value(COALESCE(first_name, ''));
  last_value := calculate_name_value(COALESCE(last_name, ''));
  middle_value := calculate_name_value(COALESCE(middle_names, ''));
  total := first_value + last_value + middle_value;

  RETURN reduce_number(total);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculer tronc (Objectif de vie)
CREATE OR REPLACE FUNCTION calculate_tronc(birth_date DATE)
RETURNS INTEGER AS $$
DECLARE
  day INTEGER; month INTEGER;
  reduced_day INTEGER; reduced_month INTEGER; total INTEGER;
BEGIN
  IF birth_date IS NULL THEN RETURN NULL; END IF;

  day := EXTRACT(DAY FROM birth_date);
  month := EXTRACT(MONTH FROM birth_date);
  reduced_day := reduce_number(day);
  reduced_month := reduce_number(month);
  total := reduced_day + reduced_month;

  RETURN reduce_number(total);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculer dynamique de vie
CREATE OR REPLACE FUNCTION calculate_dynamique_de_vie(
  p_tronc INTEGER,
  p_racine_1 INTEGER,
  p_racine_2 INTEGER
)
RETURNS INTEGER AS $$
BEGIN
  IF p_tronc IS NULL OR p_racine_1 IS NULL OR p_racine_2 IS NULL THEN RETURN NULL; END IF;
  RETURN reduce_number(p_tronc + p_racine_1 + p_racine_2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculer écorce (jour de naissance)
CREATE OR REPLACE FUNCTION calculate_ecorce(birth_date DATE)
RETURNS INTEGER AS $$
BEGIN
  IF birth_date IS NULL THEN RETURN NULL; END IF;
  RETURN reduce_number(EXTRACT(DAY FROM birth_date)::INTEGER);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Vérifier si une lettre est une voyelle
CREATE OR REPLACE FUNCTION is_vowel(letter CHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN letter IN (
    'A', 'E', 'I', 'O', 'U', 'Y',
    'À', 'Á', 'Â', 'Ã', 'Ä', 'Å', 'È', 'É', 'Ê', 'Ë',
    'Ì', 'Í', 'Î', 'Ï', 'Ò', 'Ó', 'Ô', 'Õ', 'Ö',
    'Ù', 'Ú', 'Û', 'Ü', 'Ý', 'Ÿ'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculer branche (nombre de lettres A, J, S)
CREATE OR REPLACE FUNCTION calculate_branche(
  first_name TEXT,
  last_name TEXT,
  middle_names TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  full_name TEXT; clean_text TEXT; letter CHAR; count INTEGER := 0; i INTEGER;
BEGIN
  full_name := COALESCE(first_name, '') || COALESCE(middle_names, '') || COALESCE(last_name, '');
  IF TRIM(full_name) = '' THEN RETURN NULL; END IF;

  clean_text := UPPER(TRIM(full_name));
  clean_text := REGEXP_REPLACE(clean_text, '[^A-ZÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÇÑÆŒ]', '', 'g');

  FOR i IN 1..LENGTH(clean_text) LOOP
    letter := SUBSTRING(clean_text FROM i FOR 1);
    IF letter IN ('A', 'À', 'Á', 'Â', 'Ã', 'Ä', 'Å', 'J', 'S') THEN
      count := count + 1;
    END IF;
  END LOOP;

  RETURN reduce_number(count);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculer feuille (somme des voyelles)
CREATE OR REPLACE FUNCTION calculate_feuille(
  first_name TEXT,
  last_name TEXT,
  middle_names TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  full_name TEXT; clean_name TEXT; sum INTEGER := 0; letter CHAR; i INTEGER;
BEGIN
  full_name := COALESCE(first_name, '') || COALESCE(middle_names, '') || COALESCE(last_name, '');
  IF TRIM(full_name) = '' THEN RETURN NULL; END IF;

  clean_name := UPPER(TRIM(full_name));
  clean_name := REGEXP_REPLACE(clean_name, '[^A-ZÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÇÑÆŒ]', '', 'g');

  FOR i IN 1..LENGTH(clean_name) LOOP
    letter := SUBSTRING(clean_name FROM i FOR 1);
    IF is_vowel(letter) THEN
      sum := sum + get_letter_value(letter);
    END IF;
  END LOOP;

  RETURN reduce_number(sum);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculer fruit (somme des consonnes)
CREATE OR REPLACE FUNCTION calculate_fruits(
  first_name TEXT,
  last_name TEXT,
  middle_names TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  full_name TEXT; clean_name TEXT; sum INTEGER := 0; letter CHAR; i INTEGER;
BEGIN
  full_name := COALESCE(first_name, '') || COALESCE(middle_names, '') || COALESCE(last_name, '');
  IF TRIM(full_name) = '' THEN RETURN NULL; END IF;

  clean_name := UPPER(TRIM(full_name));
  clean_name := REGEXP_REPLACE(clean_name, '[^A-ZÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÇÑÆŒ]', '', 'g');

  FOR i IN 1..LENGTH(clean_name) LOOP
    letter := SUBSTRING(clean_name FROM i FOR 1);
    IF NOT is_vowel(letter) THEN
      sum := sum + get_letter_value(letter);
    END IF;
  END LOOP;

  RETURN reduce_number(sum);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- FONCTIONS : GESTION DES BÉNÉFICIAIRES
-- ============================================================================

-- Obtenir tous les bénéficiaires accessibles par un utilisateur
CREATE OR REPLACE FUNCTION get_user_beneficiaries(p_user_id UUID)
RETURNS TABLE (
  id UUID, owner_id UUID,
  first_name VARCHAR, middle_names VARCHAR, last_name VARCHAR,
  birth_date DATE, email VARCHAR, phone VARCHAR,
  notifications_enabled BOOLEAN,
  tronc INTEGER, racine_1 INTEGER, racine_2 INTEGER,
  dynamique_de_vie INTEGER, ecorce INTEGER, branche INTEGER,
  feuille INTEGER, fruit INTEGER,
  notes TEXT, metadata JSONB,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  created_by UUID, updated_by UUID,
  relationship VARCHAR, access_level VARCHAR,
  is_owner BOOLEAN, can_book BOOLEAN, can_view BOOLEAN,
  can_edit BOOLEAN, can_share BOOLEAN,
  appointments_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id, b.owner_id, b.first_name, b.middle_names, b.last_name,
    b.birth_date, b.email, b.phone, b.notifications_enabled,
    b.tronc, b.racine_1, b.racine_2, b.dynamique_de_vie,
    b.ecorce, b.branche, b.feuille, b.fruit,
    b.notes, b.metadata, b.created_at, b.updated_at,
    b.created_by, b.updated_by,
    COALESCE(ba.relationship::VARCHAR, 'owner') as relationship,
    COALESCE(ba.access_level::VARCHAR, 'admin') as access_level,
    (b.owner_id = p_user_id) as is_owner,
    COALESCE(ba.can_book, TRUE) as can_book,
    COALESCE(ba.can_view, TRUE) as can_view,
    COALESCE(ba.can_edit, b.owner_id = p_user_id) as can_edit,
    COALESCE(ba.can_share, b.owner_id = p_user_id) as can_share,
    (SELECT COUNT(*)::INTEGER FROM appointment_beneficiaries ab WHERE ab.beneficiary_id = b.id) as appointments_count
  FROM beneficiaries b
  LEFT JOIN beneficiary_access ba ON ba.beneficiary_id = b.id AND ba.user_id = p_user_id
  WHERE b.owner_id = p_user_id OR ba.user_id = p_user_id
  ORDER BY is_owner DESC, b.last_name, b.first_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vérifier les permissions d'un utilisateur sur un bénéficiaire
CREATE OR REPLACE FUNCTION check_beneficiary_permission(
  p_user_id UUID,
  p_beneficiary_id UUID,
  p_required_permission VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_owner BOOLEAN;
  v_access_level VARCHAR;
  v_can_edit BOOLEAN;
  v_can_book BOOLEAN;
BEGIN
  SELECT (owner_id = p_user_id) INTO v_is_owner
  FROM beneficiaries WHERE id = p_beneficiary_id;

  IF v_is_owner THEN RETURN TRUE; END IF;

  SELECT access_level, can_edit, can_book INTO v_access_level, v_can_edit, v_can_book
  FROM beneficiary_access
  WHERE user_id = p_user_id AND beneficiary_id = p_beneficiary_id
    AND (expires_at IS NULL OR expires_at > NOW());

  IF NOT FOUND THEN RETURN FALSE; END IF;

  CASE p_required_permission
    WHEN 'view' THEN RETURN TRUE;
    WHEN 'book' THEN RETURN v_can_book;
    WHEN 'edit' THEN RETURN v_can_edit;
    WHEN 'admin' THEN RETURN v_access_level = 'admin';
    ELSE RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Obtenir le nom complet d'un bénéficiaire
CREATE OR REPLACE FUNCTION get_beneficiary_full_name(p_beneficiary_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_first_name VARCHAR; v_middle_names VARCHAR; v_last_name VARCHAR; v_full_name VARCHAR;
BEGIN
  SELECT first_name, middle_names, last_name
  INTO v_first_name, v_middle_names, v_last_name
  FROM beneficiaries WHERE id = p_beneficiary_id;

  IF v_middle_names IS NOT NULL AND v_middle_names != '' THEN
    v_full_name := v_first_name || ' ' || v_middle_names || ' ' || v_last_name;
  ELSE
    v_full_name := v_first_name || ' ' || v_last_name;
  END IF;

  RETURN v_full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mettre à jour l'ordre d'affichage des bénéficiaires
CREATE OR REPLACE FUNCTION update_beneficiary_display_order(
  p_user_id UUID,
  p_beneficiary_orders JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_beneficiary_id UUID;
  v_order INTEGER;
  v_is_owner BOOLEAN;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_beneficiary_orders) LOOP
    v_beneficiary_id := (v_item->>'id')::UUID;
    v_order := (v_item->>'order')::INTEGER;

    SELECT EXISTS(
      SELECT 1 FROM beneficiaries
      WHERE id = v_beneficiary_id AND owner_id = p_user_id
    ) INTO v_is_owner;

    IF v_is_owner THEN
      UPDATE beneficiaries
      SET display_order = v_order
      WHERE id = v_beneficiary_id AND owner_id = p_user_id;
    ELSE
      UPDATE beneficiary_access
      SET display_order = v_order
      WHERE beneficiary_id = v_beneficiary_id AND user_id = p_user_id;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================================
-- FONCTIONS : CONFIRMATION DES DONNÉES
-- ============================================================================

-- Vérifier si un bénéficiaire peut être modifié
CREATE OR REPLACE FUNCTION can_modify_beneficiary_identity(p_beneficiary_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_confirmed_appointments BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM appointment_beneficiaries ab
        JOIN appointments a ON a.id = ab.appointment_id
        WHERE ab.beneficiary_id = p_beneficiary_id
        AND (a.status = 'beneficiaire_confirme' OR a.status = 'completed')
    ) INTO v_has_confirmed_appointments;

    RETURN NOT v_has_confirmed_appointments;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Confirmer les données d'un bénéficiaire pour un rendez-vous
CREATE OR REPLACE FUNCTION confirm_beneficiary_data(
    p_appointment_id UUID,
    p_beneficiary_id UUID,
    p_confirmed_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_appointment_status VARCHAR;
BEGIN
    SELECT status INTO v_appointment_status
    FROM appointments WHERE id = p_appointment_id;

    IF v_appointment_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rendez-vous non trouvé');
    END IF;

    UPDATE appointment_beneficiaries
    SET
        beneficiary_data_confirmed_at = NOW(),
        beneficiary_data_confirmed_by = COALESCE(p_confirmed_by, auth.uid())
    WHERE appointment_id = p_appointment_id AND beneficiary_id = p_beneficiary_id;

    IF v_appointment_status = 'confirmed' THEN
        UPDATE appointments SET status = 'beneficiaire_confirme' WHERE id = p_appointment_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'confirmed_at', NOW(),
        'new_appointment_status', COALESCE(
            (SELECT status FROM appointments WHERE id = p_appointment_id),
            v_appointment_status
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Confirmation automatique 72h avant le rendez-vous
CREATE OR REPLACE FUNCTION auto_confirm_beneficiary_data_before_appointment()
RETURNS TABLE (
    appointment_id UUID,
    beneficiary_id UUID,
    confirmed BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH appointments_to_confirm AS (
        SELECT a.id as appt_id, ab.beneficiary_id as ben_id
        FROM appointments a
        JOIN appointment_beneficiaries ab ON ab.appointment_id = a.id
        WHERE a.status = 'confirmed'
        AND a.start_time <= NOW() + INTERVAL '72 hours'
        AND a.start_time > NOW()
        AND ab.beneficiary_data_confirmed_at IS NULL
    ),
    updated AS (
        UPDATE appointment_beneficiaries ab
        SET
            beneficiary_data_confirmed_at = NOW(),
            beneficiary_data_confirmed_by = NULL
        FROM appointments_to_confirm atc
        WHERE ab.appointment_id = atc.appt_id AND ab.beneficiary_id = atc.ben_id
        RETURNING ab.appointment_id, ab.beneficiary_id
    ),
    status_updated AS (
        UPDATE appointments a
        SET status = 'beneficiaire_confirme'
        FROM appointments_to_confirm atc
        WHERE a.id = atc.appt_id
    )
    SELECT u.appointment_id, u.beneficiary_id, true as confirmed
    FROM updated u;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger : Mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_beneficiary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_beneficiary_updated_at ON beneficiaries;
CREATE TRIGGER trigger_update_beneficiary_updated_at
  BEFORE UPDATE ON beneficiaries
  FOR EACH ROW
  EXECUTE FUNCTION update_beneficiary_updated_at();

-- Trigger : Recalculer automatiquement tous les champs de numérologie
CREATE OR REPLACE FUNCTION recalculate_all_numerology()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.birth_date IS NOT NULL THEN
    NEW.racine_1 := calculate_racine_1(NEW.birth_date);
    NEW.tronc := calculate_tronc(NEW.birth_date);
    NEW.ecorce := calculate_ecorce(NEW.birth_date);
  END IF;

  IF NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL THEN
    NEW.racine_2 := calculate_racine_2(NEW.first_name, NEW.last_name, NEW.middle_names);
    NEW.branche := calculate_branche(NEW.first_name, NEW.last_name, NEW.middle_names);
    NEW.feuille := calculate_feuille(NEW.first_name, NEW.last_name, NEW.middle_names);
    NEW.fruit := calculate_fruits(NEW.first_name, NEW.last_name, NEW.middle_names);
  END IF;

  IF NEW.tronc IS NOT NULL AND NEW.racine_1 IS NOT NULL AND NEW.racine_2 IS NOT NULL THEN
    NEW.dynamique_de_vie := calculate_dynamique_de_vie(NEW.tronc, NEW.racine_1, NEW.racine_2);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalculate_numerology ON beneficiaries;
CREATE TRIGGER trigger_recalculate_numerology
  BEFORE INSERT OR UPDATE OF first_name, middle_names, last_name, birth_date
  ON beneficiaries
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_all_numerology();

-- Trigger : Empêcher la modification des données d'identité confirmées
CREATE OR REPLACE FUNCTION prevent_identity_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.first_name IS DISTINCT FROM NEW.first_name)
       OR (OLD.last_name IS DISTINCT FROM NEW.last_name)
       OR (OLD.birth_date IS DISTINCT FROM NEW.birth_date) THEN

        IF NOT can_modify_beneficiary_identity(OLD.id) THEN
            RAISE EXCEPTION 'Impossible de modifier les données d''identité : une étude a déjà été réalisée pour ce bénéficiaire'
                USING HINT = 'Les données d''identité ne peuvent plus être modifiées car le bénéficiaire a au moins un rendez-vous confirmé ou complété.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_identity_modification ON beneficiaries;
CREATE TRIGGER trigger_prevent_identity_modification
    BEFORE UPDATE ON beneficiaries
    FOR EACH ROW
    EXECUTE FUNCTION prevent_identity_modification();

-- Trigger : Empêcher la suppression d'un bénéficiaire avec rendez-vous actifs
CREATE OR REPLACE FUNCTION check_beneficiary_appointments_before_delete()
RETURNS TRIGGER AS $$
DECLARE
  active_appointments_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_appointments_count
  FROM appointment_beneficiaries ab
  JOIN appointments a ON ab.appointment_id = a.id
  WHERE ab.beneficiary_id = OLD.id AND a.status != 'cancelled';

  IF active_appointments_count > 0 THEN
    RAISE EXCEPTION 'Impossible de supprimer ce bénéficiaire : il a % rendez-vous actif(s). Veuillez d''abord annuler tous ses rendez-vous.', active_appointments_count;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_beneficiary_deletion_with_appointments ON beneficiaries;
CREATE TRIGGER prevent_beneficiary_deletion_with_appointments
  BEFORE DELETE ON beneficiaries
  FOR EACH ROW
  EXECUTE FUNCTION check_beneficiary_appointments_before_delete();

-- Trigger : Mettre à jour updated_at pour beneficiary_documents
CREATE OR REPLACE FUNCTION update_beneficiary_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_beneficiary_documents_updated_at ON beneficiary_documents;
CREATE TRIGGER trigger_update_beneficiary_documents_updated_at
  BEFORE UPDATE ON beneficiary_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_beneficiary_documents_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Activer RLS
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiary_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiary_documents ENABLE ROW LEVEL SECURITY;

-- Politiques pour beneficiaries
DROP POLICY IF EXISTS beneficiaries_select_policy ON beneficiaries;
CREATE POLICY beneficiaries_select_policy ON beneficiaries
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM beneficiary_access ba
      WHERE ba.beneficiary_id = beneficiaries.id
        AND ba.user_id = auth.uid()
        AND (ba.expires_at IS NULL OR ba.expires_at > NOW())
    )
  );

DROP POLICY IF EXISTS beneficiaries_insert_policy ON beneficiaries;
CREATE POLICY beneficiaries_insert_policy ON beneficiaries
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS beneficiaries_update_policy ON beneficiaries;
CREATE POLICY beneficiaries_update_policy ON beneficiaries
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM beneficiary_access ba
      WHERE ba.beneficiary_id = beneficiaries.id
        AND ba.user_id = auth.uid()
        AND ba.can_edit = true
        AND (ba.expires_at IS NULL OR ba.expires_at > NOW())
    )
  );

DROP POLICY IF EXISTS beneficiaries_delete_policy ON beneficiaries;
CREATE POLICY beneficiaries_delete_policy ON beneficiaries
  FOR DELETE
  USING (owner_id = auth.uid());

-- Politiques pour beneficiary_access
DROP POLICY IF EXISTS beneficiary_access_select_policy ON beneficiary_access;
CREATE POLICY beneficiary_access_select_policy ON beneficiary_access
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM beneficiaries b
      WHERE b.id = beneficiary_access.beneficiary_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS beneficiary_access_manage_policy ON beneficiary_access;
CREATE POLICY beneficiary_access_manage_policy ON beneficiary_access
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM beneficiaries b
      WHERE b.id = beneficiary_access.beneficiary_id
        AND b.owner_id = auth.uid()
    )
  );

-- Politiques pour appointment_beneficiaries
DROP POLICY IF EXISTS appointment_beneficiaries_select_policy ON appointment_beneficiaries;
CREATE POLICY appointment_beneficiaries_select_policy ON appointment_beneficiaries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM beneficiaries b
      WHERE b.id = appointment_beneficiaries.beneficiary_id
        AND (
          b.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM beneficiary_access ba
            WHERE ba.beneficiary_id = b.id AND ba.user_id = auth.uid()
          )
        )
    )
    OR EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_beneficiaries.appointment_id
        AND (
          a.client_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM practitioners p
            WHERE p.id = a.practitioner_id AND p.user_id = auth.uid()
          )
        )
    )
  );

-- Politiques pour beneficiary_documents
DROP POLICY IF EXISTS "Staff can view all documents of accessible beneficiaries" ON beneficiary_documents;
CREATE POLICY "Staff can view all documents of accessible beneficiaries"
ON beneficiary_documents
FOR SELECT
USING (
  beneficiary_id IN (SELECT id FROM beneficiaries WHERE owner_id = auth.uid())
  OR beneficiary_id IN (
    SELECT beneficiary_id FROM beneficiary_access
    WHERE user_id = auth.uid() AND can_view = true
  )
);

DROP POLICY IF EXISTS "Beneficiaries can view their own public documents" ON beneficiary_documents;
CREATE POLICY "Beneficiaries can view their own public documents"
ON beneficiary_documents
FOR SELECT
USING (
  visibility = 'public'
  AND beneficiary_id IN (SELECT id FROM beneficiaries WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can add documents to editable beneficiaries" ON beneficiary_documents;
CREATE POLICY "Users can add documents to editable beneficiaries"
ON beneficiary_documents
FOR INSERT
WITH CHECK (
  beneficiary_id IN (SELECT id FROM beneficiaries WHERE owner_id = auth.uid())
  OR beneficiary_id IN (
    SELECT beneficiary_id FROM beneficiary_access
    WHERE user_id = auth.uid() AND can_edit = true
  )
);

DROP POLICY IF EXISTS "Users can update their own uploaded documents" ON beneficiary_documents;
CREATE POLICY "Users can update their own uploaded documents"
ON beneficiary_documents
FOR UPDATE
USING (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Admins can update all documents" ON beneficiary_documents;
CREATE POLICY "Admins can update all documents"
ON beneficiary_documents
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

DROP POLICY IF EXISTS "Users can delete their own documents" ON beneficiary_documents;
CREATE POLICY "Users can delete their own documents"
ON beneficiary_documents
FOR DELETE
USING (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Admins can delete all documents" ON beneficiary_documents;
CREATE POLICY "Admins can delete all documents"
ON beneficiary_documents
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- ============================================================================
-- VUES
-- ============================================================================

-- Vue : Bénéficiaires avec leurs propriétaires
CREATE OR REPLACE VIEW beneficiaries_with_owners AS
SELECT
  b.*,
  p.first_name as owner_first_name,
  p.last_name as owner_last_name,
  p.email as owner_email,
  (SELECT COUNT(*) FROM appointment_beneficiaries ab WHERE ab.beneficiary_id = b.id) as appointments_count
FROM beneficiaries b
JOIN profiles p ON p.id = b.owner_id;

-- Vue : Rendez-vous avec tous leurs bénéficiaires
CREATE OR REPLACE VIEW appointments_with_beneficiaries AS
SELECT
  a.*,
  array_agg(
    json_build_object(
      'beneficiary_id', b.id,
      'first_name', b.first_name,
      'last_name', b.last_name,
      'role', ab.role,
      'role_order', ab.role_order
    ) ORDER BY ab.role_order
  ) as beneficiaries
FROM appointments a
LEFT JOIN appointment_beneficiaries ab ON ab.appointment_id = a.id
LEFT JOIN beneficiaries b ON b.id = ab.beneficiary_id
GROUP BY a.id;

-- Vue : Bénéficiaires verrouillés (avec rendez-vous confirmés)
CREATE OR REPLACE VIEW beneficiaries_locked AS
SELECT
    b.id,
    b.first_name,
    b.last_name,
    b.birth_date,
    COUNT(DISTINCT a.id) as confirmed_appointments_count,
    MIN(a.start_time) as first_confirmed_appointment,
    can_modify_beneficiary_identity(b.id) as can_modify
FROM beneficiaries b
JOIN appointment_beneficiaries ab ON ab.beneficiary_id = b.id
JOIN appointments a ON a.id = ab.appointment_id
WHERE a.status IN ('beneficiaire_confirme', 'completed')
GROUP BY b.id, b.first_name, b.last_name, b.birth_date;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION reduce_number(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_letter_value(CHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_name_value(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_racine_1(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_racine_2(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_tronc(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_dynamique_de_vie(INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_ecorce(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_branche(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_feuille(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_fruits(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_vowel(CHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_beneficiaries(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_beneficiary_permission(UUID, UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_beneficiary_full_name(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_beneficiary_display_order(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION can_modify_beneficiary_identity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_beneficiary_data(UUID, UUID, UUID) TO authenticated;

-- Permissions restreintes (service_role uniquement)
REVOKE EXECUTE ON FUNCTION auto_confirm_beneficiary_data_before_appointment() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auto_confirm_beneficiary_data_before_appointment() TO service_role;

-- ============================================================================
-- FIN DU SCHÉMA
-- ============================================================================
