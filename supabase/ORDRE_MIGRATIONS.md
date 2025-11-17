# Ordre d'exécution des migrations Supabase

## ⚠️ Important
Ces migrations doivent être exécutées **dans cet ordre** sur une base de données existante avec la structure de base déjà créée.

## 📋 Ordre recommandé

### 0. Triggers et RLS de base (CRITIQUE - À EXÉCUTER EN PREMIER !)
```sql
-- 0a. Trigger de création automatique du profil lors de l'inscription OAuth/Email + RLS profiles
supabase/migrations/20250116_create_profile_trigger.sql

-- 0b. Corriger les politiques RLS de practitioners (éviter récursion)
supabase/migrations/20250116_fix_practitioners_rls.sql

-- 0c. Trigger pour créer un profil practitioner pour les admins
supabase/migrations/20250116_create_practitioner_for_admins.sql
```

⚠️ **ESSENTIEL** : Ces migrations doivent être exécutées DANS CET ORDRE et AVANT toute connexion utilisateur.
- 0a crée la fonction `get_my_user_type()` nécessaire pour 0b
- 0b corrige les RLS de practitioners pour éviter les récursions infinies
- 0c permet aux admins d'avoir une page de présentation comme les intervenants

### 1. Système d'intervenants
```sql
-- 1. Demandes pour devenir intervenant
supabase/migrations/20250115_create_practitioner_requests.sql
```

### 2. Fonctionnalités rendez-vous
```sql
-- 2. Ajout lien visioconférence
supabase/migrations/20250115_add_meeting_link.sql

-- 3. Ajout prix personnalisé
supabase/migrations/20250115_add_custom_price.sql
```

### 3. Documents et commentaires
```sql
-- 4. Tables documents et commentaires
supabase/migrations/20250115_add_documents_and_comments.sql

-- 5. Mise à jour table documents
supabase/migrations/20250115_update_appointment_documents.sql

-- 6. Configuration Storage bucket
supabase/migrations/20250115_setup_storage_documents.sql

-- 7. Ajout colonnes audit
supabase/migrations/20250116_add_audit_columns_to_appointment_documents.sql
```

## ✅ Vérification

Après avoir exécuté toutes les migrations :

```sql
-- Vérifier que le trigger de profil existe
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Résultat attendu:
-- on_auth_user_created | INSERT | users

-- Vérifier que created_by et updated_by existent
SELECT column_name FROM information_schema.columns
WHERE table_name = 'appointment_documents'
AND column_name IN ('created_by', 'updated_by');

-- Résultat attendu:
-- created_by
-- updated_by

-- Vérifier le bucket Storage
SELECT * FROM storage.buckets WHERE id = 'documents';

-- Vérifier la table practitioner_requests
SELECT COUNT(*) FROM practitioner_requests;
```

## 📝 Notes importantes

### Structure de base requise
Ces migrations supposent que les tables suivantes existent déjà :
- `profiles` (avec colonnes `created_by`, `updated_by`)
- `practitioners`
- `appointments`
- `services`

### Migrations critiques

⚠️ **20250116_create_profile_trigger.sql** est **ULTRA CRITIQUE** !

Cette migration crée le trigger qui génère automatiquement un profil dans la table `profiles`
lors de l'inscription d'un nouvel utilisateur (Email ou OAuth Google/Apple).

**Sans ce trigger**, les utilisateurs se connectant avec Google/Apple seront authentifiés
mais n'auront PAS de profil FL2M, ce qui bloquera l'application.

---

⚠️ **20250116_add_audit_columns_to_appointment_documents.sql** est également **CRITIQUE** !

Cette migration ajoute les colonnes `created_by` et `updated_by` à la table `appointment_documents`.
Sans ces colonnes, le trigger `update_audit_columns()` échouera avec l'erreur :
```
record "new" has no field "created_by"
```

### Bucket Storage
Si la migration `20250115_setup_storage_documents.sql` échoue :
1. Créez manuellement le bucket `documents` dans Supabase Dashboard
2. Configurez-le en **privé** (non public)
3. Réexécutez la migration pour créer les politiques

## 🔄 En cas d'erreur

### Erreur "table already exists"
La migration a déjà été exécutée. Passez à la suivante.

### Erreur "column already exists"
Normal si vous réexécutez une migration. Les migrations utilisent `IF NOT EXISTS`.

### Erreur sur les politiques RLS
Supprimez les anciennes politiques avant de réexécuter :
```sql
DROP POLICY IF EXISTS "nom_de_la_politique" ON nom_table;
```

---

**Total migrations** : 10 fichiers
**Dernière mise à jour** : 16 novembre 2025
