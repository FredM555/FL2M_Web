# Instructions : Créer les politiques RLS pour le bucket documents

## 📍 Accès
https://supabase.com/dashboard/project/phokxjbocljahmbdkrbs/storage/buckets

1. Cliquez sur le bucket **"documents"**
2. Allez dans l'onglet **"Policies"**
3. Cliquez sur **"New Policy"** pour chaque politique ci-dessous

---

## 🔐 Politique 1 : SELECT (Lecture/Téléchargement)

**Nom de la politique :** `documents_beneficiaries_select`

**Operation :** `SELECT`

**Target roles :** `authenticated`

**USING expression :**
```sql
(
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'beneficiaries'
  AND (
    -- Propriétaire : documents publics uniquement
    (
      (storage.foldername(name))[2] IN (
        SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM beneficiary_documents bd
        WHERE bd.file_path = name
        AND bd.visibility = 'public'
      )
    )
    OR
    -- Accès partagé : documents publics uniquement
    (
      (storage.foldername(name))[2] IN (
        SELECT b.id::text
        FROM beneficiaries b
        JOIN beneficiary_access ba ON ba.beneficiary_id = b.id
        WHERE ba.user_id = auth.uid() AND ba.can_view = true
      )
      AND EXISTS (
        SELECT 1 FROM beneficiary_documents bd
        WHERE bd.file_path = name
        AND bd.visibility = 'public'
      )
    )
    OR
    -- Intervenants : TOUS les documents (public ET private)
    (storage.foldername(name))[2] IN (
      SELECT b.id::text
      FROM beneficiaries b
      JOIN appointment_beneficiaries ab ON ab.beneficiary_id = b.id
      JOIN appointments a ON a.id = ab.appointment_id
      JOIN practitioners p ON p.id = a.practitioner_id
      WHERE p.user_id = auth.uid()
    )
    OR
    -- Admins : TOUS les documents
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  )
)
```

---

## 📤 Politique 2 : INSERT (Upload)

**Nom de la politique :** `documents_beneficiaries_insert`

**Operation :** `INSERT`

**Target roles :** `authenticated`

**WITH CHECK expression :**
```sql
(
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'beneficiaries'
  AND (
    -- Propriétaire
    (storage.foldername(name))[2] IN (
      SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
    )
    OR
    -- Utilisateurs avec can_edit
    (storage.foldername(name))[2] IN (
      SELECT b.id::text
      FROM beneficiaries b
      JOIN beneficiary_access ba ON ba.beneficiary_id = b.id
      WHERE ba.user_id = auth.uid() AND ba.can_edit = true
    )
    OR
    -- Intervenants
    (storage.foldername(name))[2] IN (
      SELECT b.id::text
      FROM beneficiaries b
      JOIN appointment_beneficiaries ab ON ab.beneficiary_id = b.id
      JOIN appointments a ON a.id = ab.appointment_id
      JOIN practitioners p ON p.id = a.practitioner_id
      WHERE p.user_id = auth.uid()
    )
    OR
    -- Admins
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  )
)
```

---

## ✏️ Politique 3 : UPDATE (Modification)

**Nom de la politique :** `documents_beneficiaries_update`

**Operation :** `UPDATE`

**Target roles :** `authenticated`

**USING expression :**
```sql
(
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'beneficiaries'
  AND (
    -- Propriétaire
    (storage.foldername(name))[2] IN (
      SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
    )
    OR
    -- Utilisateurs avec can_edit
    (storage.foldername(name))[2] IN (
      SELECT b.id::text
      FROM beneficiaries b
      JOIN beneficiary_access ba ON ba.beneficiary_id = b.id
      WHERE ba.user_id = auth.uid() AND ba.can_edit = true
    )
    OR
    -- Admins
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  )
)
```

---

## 🗑️ Politique 4 : DELETE (Suppression)

**Nom de la politique :** `documents_beneficiaries_delete`

**Operation :** `DELETE`

**Target roles :** `authenticated`

**USING expression :**
```sql
(
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'beneficiaries'
  AND (
    -- Propriétaire
    (storage.foldername(name))[2] IN (
      SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
    )
    OR
    -- Utilisateurs avec can_edit
    (storage.foldername(name))[2] IN (
      SELECT b.id::text
      FROM beneficiaries b
      JOIN beneficiary_access ba ON ba.beneficiary_id = b.id
      WHERE ba.user_id = auth.uid() AND ba.can_edit = true
    )
    OR
    -- Admins
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  )
)
```

---

## ✅ Vérification finale

Après avoir créé les 4 politiques, vous devriez avoir :
- ✅ `documents_beneficiaries_select` (SELECT)
- ✅ `documents_beneficiaries_insert` (INSERT)
- ✅ `documents_beneficiaries_update` (UPDATE)
- ✅ `documents_beneficiaries_delete` (DELETE)

**Testez ensuite** en rafraîchissant la page des bénéficiaires !

---

## 🔐 Résumé des permissions

- **Bénéficiaires/Clients** : Voient uniquement les documents `visibility='public'`
- **Intervenants** : Voient TOUS les documents (public + private) de leurs patients
- **Admins** : Accès complet à tous les documents
