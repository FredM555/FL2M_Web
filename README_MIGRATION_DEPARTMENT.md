# Migration : Ajout du champ Département

## Description

Cette migration ajoute un champ `department` à la table `profiles` pour permettre aux utilisateurs de renseigner leur département. Ce champ aide à mieux orienter les intervenants vers les clients de leur région.

## Fichiers modifiés

1. **add_department_to_profiles.sql** - Script de migration SQL
2. **src/services/supabase.ts** - Interface TypeScript `Profile` mise à jour
3. **src/pages/ProfilePage.tsx** - Formulaire utilisateur mis à jour avec le champ département

## Application de la migration

### Option 1: Via Supabase CLI (local)

```bash
npx supabase db push add_department_to_profiles.sql
```

### Option 2: Via l'interface Supabase

1. Connectez-vous à votre projet Supabase
2. Allez dans l'éditeur SQL
3. Copiez le contenu du fichier `add_department_to_profiles.sql`
4. Exécutez la requête

### Option 3: Via psql (si vous avez accès direct)

```bash
psql -h <votre_host> -U <votre_user> -d <votre_database> -f add_department_to_profiles.sql
```

## Détails du champ

- **Nom**: `department`
- **Type**: `VARCHAR(3)`
- **Nullable**: Oui (optionnel)
- **Exemples de valeurs**:
  - `75` - Paris
  - `59` - Nord
  - `13` - Bouches-du-Rhône
  - `2A` - Corse-du-Sud
  - `2B` - Haute-Corse

## Utilisation

Une fois la migration appliquée, les utilisateurs pourront :
1. Accéder à leur page de profil
2. Renseigner leur code département dans la section "Informations de base"
3. Ce champ sera visible par les intervenants pour mieux cibler les clients de leur région

## Test

Après l'application de la migration :
1. Connectez-vous à l'application
2. Allez sur votre page de profil
3. Vérifiez que le champ "Département" est bien présent
4. Renseignez votre département (ex: `75`)
5. Enregistrez et vérifiez que la modification est bien sauvegardée

## Rollback (si nécessaire)

Si vous souhaitez annuler cette migration :

```sql
-- Supprimer l'index
DROP INDEX IF EXISTS idx_profiles_department;

-- Supprimer la colonne
ALTER TABLE profiles DROP COLUMN IF EXISTS department;
```

## Notes

- Le champ est optionnel, les utilisateurs existants n'ont pas besoin de le renseigner
- Aucune donnée existante n'est affectée par cette migration
- Un index a été créé pour améliorer les performances des recherches par département
