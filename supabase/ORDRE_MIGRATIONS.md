# Ordre d'exécution des migrations Supabase

## ⚠️ Important
Ces migrations doivent être exécutées **dans cet ordre** sur une base de données existante avec la structure de base déjà créée.

## 📋 Ordre recommandé

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

-- 7. Ajout colonnes audit (CRITIQUE - doit être exécuté en dernier)
supabase/migrations/20250116_add_audit_columns_to_appointment_documents.sql
```

## ✅ Vérification

Après avoir exécuté toutes les migrations :

```sql
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

### Migration critique
⚠️ **20250116_add_audit_columns_to_appointment_documents.sql** est **CRITIQUE** !

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

**Total migrations** : 7 fichiers
**Dernière mise à jour** : 16 novembre 2025
