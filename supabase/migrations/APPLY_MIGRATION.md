# Instructions pour appliquer la migration du code unique

## Migration: `add_unique_code_to_appointments.sql`

Cette migration ajoute un code unique à chaque rendez-vous pour faciliter la facturation et la communication avec les utilisateurs.

### Option 1: Via Supabase Dashboard (Recommandé)

1. Connectez-vous à votre dashboard Supabase
2. Allez dans **SQL Editor**
3. Cliquez sur **New Query**
4. Copiez le contenu du fichier `add_unique_code_to_appointments.sql`
5. Collez-le dans l'éditeur
6. Cliquez sur **Run** pour exécuter la migration

### Option 2: Via psql (ligne de commande)

```bash
psql "postgresql://postgres.xjwrgpkzbncsjfopavhy:FloLaPuce2@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -f "supabase/migrations/add_unique_code_to_appointments.sql"
```

### Option 3: Via Supabase CLI

```bash
npx supabase db push
```

## Vérification

Après avoir appliqué la migration, vérifiez que:

1. La colonne `unique_code` existe dans la table `appointments`:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'appointments' AND column_name = 'unique_code';
```

2. Les rendez-vous existants ont reçu un code unique:
```sql
SELECT id, unique_code, created_at
FROM appointments
LIMIT 5;
```

3. Les nouvelles insertions génèrent automatiquement un code:
```sql
-- Tester avec un INSERT de test (ajuster les valeurs selon votre base)
-- Le unique_code devrait être généré automatiquement
```

## Rollback (en cas de problème)

Si vous devez annuler cette migration:

```sql
-- Supprimer le trigger
DROP TRIGGER IF EXISTS trigger_set_appointment_unique_code ON public.appointments;

-- Supprimer les fonctions
DROP FUNCTION IF EXISTS set_appointment_unique_code();
DROP FUNCTION IF EXISTS generate_appointment_code();

-- Supprimer l'index
DROP INDEX IF EXISTS idx_appointments_unique_code;

-- Supprimer la colonne
ALTER TABLE public.appointments DROP COLUMN IF EXISTS unique_code;
```

## Notes importantes

- Les codes générés sont au format: `RDV-XXXXXXXX` (8 caractères alphanumériques)
- Les codes sont uniques et non chronologiques
- Les codes sont générés automatiquement lors de la création d'un rendez-vous
- Tous les rendez-vous existants reçoivent un code unique lors de la migration
