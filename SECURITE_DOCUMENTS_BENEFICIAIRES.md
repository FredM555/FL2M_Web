# 🔐 Sécurité des Documents Bénéficiaires - Analyse Complète

## 📊 Résumé

Le système de documents bénéficiaires utilise **3 niveaux de sécurité** pour protéger les documents privés :

1. **RLS sur la table `beneficiary_documents`** ✅ (Base de données)
2. **RLS sur le bucket Storage `documents`** ✅ (Fichiers)
3. **Filtrage côté client** ✅ (Interface utilisateur)

---

## 🛡️ Niveau 1 : RLS sur la table `beneficiary_documents`

**Fichier :** `supabase/migrations/20251223_fix_beneficiary_documents_rls_visibility.sql`

### Règles SELECT (Qui peut voir les métadonnées des documents)

```sql
-- Les propriétaires voient UNIQUEMENT les documents publics
(
  visibility = 'public'
  AND EXISTS (
    SELECT 1 FROM beneficiaries b
    WHERE b.id = beneficiary_documents.beneficiary_id
    AND b.owner_id = auth.uid()
  )
)
OR
-- Les utilisateurs avec accès partagé voient UNIQUEMENT les publics
(
  visibility = 'public'
  AND EXISTS (
    SELECT 1 FROM beneficiary_access ba
    WHERE ba.beneficiary_id = beneficiary_documents.beneficiary_id
    AND ba.user_id = auth.uid()
    AND ba.can_view = true
  )
)
OR
-- Les intervenants voient TOUS les documents (public ET private)
EXISTS (
  SELECT 1 FROM appointment_beneficiaries ab
  JOIN appointments a ON a.id = ab.appointment_id
  JOIN practitioners p ON p.id = a.practitioner_id
  WHERE ab.beneficiary_id = beneficiary_documents.beneficiary_id
  AND p.user_id = auth.uid()
)
OR
-- Les admins voient TOUS les documents
EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.user_type = 'admin'
)
```

### ✅ Protection niveau table

- ❌ Les clients **NE PEUVENT PAS** voir les lignes des documents privés dans la table
- ✅ Les clients voient uniquement les documents `visibility='public'`
- ✅ Les intervenants voient tous les documents de leurs patients
- ✅ Les admins voient tout

---

## 🛡️ Niveau 2 : RLS sur le bucket Storage `documents`

**Fichier :** `supabase/migrations/20251225_fix_documents_bucket_rls_v2.sql`

### Règles SELECT (Qui peut télécharger les fichiers PDF)

```sql
bucket_id = 'documents'
AND (storage.foldername(name))[1] = 'beneficiaries'
AND (
  -- Le propriétaire peut voir UNIQUEMENT les documents publics
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
  -- Les utilisateurs avec accès partagé : documents publics uniquement
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
  -- Les intervenants : TOUS les documents (public ET private)
  (storage.foldername(name))[2] IN (
    SELECT b.id::text
    FROM beneficiaries b
    JOIN appointment_beneficiaries ab ON ab.beneficiary_id = b.id
    JOIN appointments a ON a.id = ab.appointment_id
    JOIN practitioners p ON p.id = a.practitioner_id
    WHERE p.user_id = auth.uid()
  )
  OR
  -- Les admins : TOUS les documents
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
)
```

### ✅ Protection niveau Storage

- ❌ Même si un client devine l'URL d'un document privé, il recevra **403 Forbidden**
- ✅ Les URLs signées ne fonctionneront que pour les documents autorisés
- ✅ Les blobs téléchargés seront bloqués si l'utilisateur n'a pas les droits
- ✅ Protection contre l'accès direct aux fichiers

**Exemple de test :**
```javascript
// Un client essaie d'accéder directement à un document privé
const url = 'https://phokxjbocljahmbdkrbs.supabase.co/storage/v1/object/public/documents/beneficiaries/abc-123/private-doc.pdf';
// Résultat : 403 Forbidden (bloqué par RLS)
```

---

## 🛡️ Niveau 3 : Filtrage côté client (Interface)

**Fichier :** `src/components/beneficiaries/BeneficiaryDocuments.tsx`

### Code de filtrage (lignes 130-136)

```typescript
// Filtrer les documents selon le type d'utilisateur
let filteredDocuments = data || [];

// Si l'utilisateur n'est pas intervenant ou admin, ne montrer que les documents publics
if (profile && profile.user_type !== 'intervenant' && profile.user_type !== 'admin') {
  filteredDocuments = filteredDocuments.filter(doc => doc.visibility === 'public');
}

setDocuments(filteredDocuments);
```

### Message informatif (lignes 366-370)

```typescript
{profile && profile.user_type !== 'intervenant' && profile.user_type !== 'admin' && (
  <Alert severity="info" sx={{ mb: 2 }}>
    Vous voyez uniquement les documents qui vous ont été partagés par votre intervenant.
  </Alert>
)}
```

### ✅ Protection niveau UI

- ✅ Les documents privés ne s'affichent pas dans l'interface
- ✅ Message clair expliquant la limitation
- ⚠️ **Note :** Ce filtrage est une amélioration UX, mais la vraie sécurité vient des RLS

---

## 🧪 Scénarios de test

### ✅ Test 1 : Client essaie de voir un document privé dans l'interface
1. Intervenant upload un document et le marque comme "Privé"
2. Client se connecte et va sur la page bénéficiaires
3. **Résultat attendu :** Le document n'apparaît pas dans la liste

### ✅ Test 2 : Client essaie d'accéder directement à l'URL d'un document privé
1. Client récupère l'URL d'un document privé (par inspection du code, etc.)
2. Client essaie d'accéder directement à cette URL
3. **Résultat attendu :** Erreur 403 Forbidden (bloqué par RLS Storage)

### ✅ Test 3 : Client essaie de query la table beneficiary_documents
1. Client ouvre la console et tente :
```javascript
const { data } = await supabase.from('beneficiary_documents').select('*');
```
2. **Résultat attendu :** Seuls les documents publics sont retournés (bloqué par RLS Table)

### ✅ Test 4 : Intervenant voit tous les documents
1. Intervenant se connecte
2. Ouvre un bénéficiaire avec qui il a un RDV
3. **Résultat attendu :** Voit TOUS les documents (public + private)

---

## 🔒 Matrice des permissions

| Type d'utilisateur | Documents publics | Documents privés | Peut uploader | Peut modifier |
|--------------------|-------------------|------------------|---------------|---------------|
| **Client (propriétaire)** | ✅ Oui | ❌ Non | ✅ Oui | ✅ Oui (ses docs) |
| **Accès partagé (can_view)** | ✅ Oui | ❌ Non | ❌ Non | ❌ Non |
| **Accès partagé (can_edit)** | ✅ Oui | ❌ Non | ✅ Oui | ✅ Oui |
| **Intervenant (avec RDV)** | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui (ses docs) |
| **Admin** | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui (tous) |

---

## ⚡ Points de sécurité critiques

### ✅ Ce qui EST protégé

1. **Accès aux métadonnées** (table beneficiary_documents)
   - RLS empêche les clients de voir les lignes des documents privés

2. **Téléchargement des fichiers** (bucket Storage)
   - RLS empêche le téléchargement direct des PDFs privés

3. **URLs signées**
   - Même avec une URL signée valide, RLS vérifie les permissions

4. **Blobs locaux**
   - `getBeneficiaryDocumentBlob()` télécharge via `.download()` qui respecte les RLS

### ⚠️ Ce qu'il faut surveiller

1. **Migration bien appliquée**
   - Vérifier que la migration `20251225_fix_documents_bucket_rls_v2.sql` est bien appliquée

2. **Type d'utilisateur correct**
   - S'assurer que `profiles.user_type` est bien renseigné ('client', 'intervenant', 'admin')

3. **Lien bénéficiaire-intervenant**
   - S'assurer qu'il existe bien une ligne dans `appointment_beneficiaries` pour que l'intervenant ait accès

---

## 🎯 Conclusion

**Le système est sécurisé à 3 niveaux :**

1. ✅ **Table RLS** : Empêche de voir les métadonnées des documents privés
2. ✅ **Storage RLS** : Empêche de télécharger les fichiers privés
3. ✅ **UI Filtering** : Cache les documents privés de l'interface

**Un client ne peut PAS :**
- ❌ Voir les documents privés dans la liste
- ❌ Télécharger un document privé même avec l'URL directe
- ❌ Query les documents privés via l'API Supabase

**Un intervenant peut :**
- ✅ Voir TOUS les documents (public + private) de ses patients
- ✅ Uploader des documents et choisir la visibilité
- ✅ Modifier/supprimer ses propres documents

---

## 📝 Fichiers concernés

- `supabase/migrations/20251223_fix_beneficiary_documents_rls_visibility.sql` - RLS Table
- `supabase/migrations/20251225_fix_documents_bucket_rls_v2.sql` - RLS Storage
- `src/components/beneficiaries/BeneficiaryDocuments.tsx` - Interface utilisateur
- `src/services/beneficiaryDocuments.ts` - Services de gestion des documents
