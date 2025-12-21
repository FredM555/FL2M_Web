# 📁 Configuration du Stockage pour Documents Bénéficiaires

## 🎯 Objectif

Configurer le bucket Supabase Storage pour permettre l'upload, le téléchargement et la gestion des documents des bénéficiaires.

## 🚀 Étapes de Configuration

### ÉTAPE 1 : Créer le Bucket

1. **Ouvrez Supabase Dashboard**
   - Allez sur https://supabase.com/dashboard
   - Sélectionnez votre projet FL2M

2. **Accédez à Storage**
   - Dans le menu de gauche, cliquez sur **"Storage"** (icône 📁)

3. **Créez le Bucket**
   - Cliquez sur **"New bucket"** (ou "Create a new bucket")
   - Nom du bucket : `beneficiary-documents`
   - **Public bucket** : ❌ NON (décochez)
   - **File size limit** : 10 MB (ou selon vos besoins)
   - **Allowed MIME types** : Laissez vide pour accepter tous les types
   - Cliquez sur **"Create bucket"**

### ÉTAPE 2 : Configurer les Policies RLS sur le Bucket

1. **Cliquez sur le bucket** `beneficiary-documents` que vous venez de créer

2. **Allez dans "Policies"** (onglet en haut)

3. **Cliquez sur "New Policy"**

#### Policy 1 : SELECT (Lecture) - Télécharger les fichiers

```sql
-- Nom de la policy
SELECT policy for beneficiary documents

-- Operation
SELECT (download)

-- Target roles
authenticated

-- Policy definition (USING)
(
  -- Le propriétaire du bénéficiaire
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
  )
  OR
  -- Intervenant ayant accès au bénéficiaire
  (storage.foldername(name))[1] IN (
    SELECT b.id::text
    FROM beneficiaries b
    JOIN appointment_beneficiaries ab ON ab.beneficiary_id = b.id
    JOIN appointments a ON a.id = ab.appointment_id
    JOIN practitioners p ON p.id = a.practitioner_id
    WHERE p.user_id = auth.uid()
  )
  OR
  -- Les admins
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin'
  )
)
```

#### Policy 2 : INSERT (Upload) - Uploader les fichiers

```sql
-- Nom de la policy
INSERT policy for beneficiary documents

-- Operation
INSERT (upload)

-- Target roles
authenticated

-- Policy definition (WITH CHECK)
(
  -- Le propriétaire du bénéficiaire
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
  )
  OR
  -- Intervenant ayant accès au bénéficiaire
  (storage.foldername(name))[1] IN (
    SELECT b.id::text
    FROM beneficiaries b
    JOIN appointment_beneficiaries ab ON ab.beneficiary_id = b.id
    JOIN appointments a ON a.id = ab.appointment_id
    JOIN practitioners p ON p.id = a.practitioner_id
    WHERE p.user_id = auth.uid()
  )
  OR
  -- Les admins
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin'
  )
)
```

#### Policy 3 : UPDATE - Modifier les fichiers

```sql
-- Nom de la policy
UPDATE policy for beneficiary documents

-- Operation
UPDATE

-- Target roles
authenticated

-- Policy definition (USING)
(
  -- Le propriétaire du bénéficiaire
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
  )
  OR
  -- Les admins
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin'
  )
)
```

#### Policy 4 : DELETE - Supprimer les fichiers

```sql
-- Nom de la policy
DELETE policy for beneficiary documents

-- Operation
DELETE

-- Target roles
authenticated

-- Policy definition (USING)
(
  -- Le propriétaire du bénéficiaire
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
  )
  OR
  -- Les admins
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin'
  )
)
```

### ÉTAPE 3 : Structure de Stockage

Les fichiers sont organisés ainsi :
```
beneficiary-documents/
  └── {beneficiary_id}/
      ├── 1234567890.pdf
      ├── 1234567891.jpg
      └── 1234567892.docx
```

Chaque fichier est stocké dans un dossier nommé avec l'ID du bénéficiaire.

## ✅ Vérification

1. **Rechargez votre application** (Ctrl+Shift+R)

2. **Testez l'upload :**
   - Allez dans "Mes rendez-vous clients" (intervenant)
   - Onglet "A préparer"
   - Double-cliquez sur un rendez-vous
   - Onglet "Bénéficiaire"
   - Cliquez sur un bénéficiaire pour l'ouvrir
   - Cliquez sur le bouton **"Documents"**
   - Vous devriez voir :
     - ✅ Le formulaire d'upload
     - ✅ "Sélectionner un fichier"
     - ✅ Description (optionnel)
     - ✅ Switch "Visible par le client"
     - ✅ Bouton "Uploader"

3. **Uploadez un fichier de test :**
   - Sélectionnez un fichier (PDF, image, etc.)
   - Ajoutez une description (optionnel)
   - Cliquez sur "Uploader"
   - Le fichier devrait apparaître dans la liste

## 🔐 Permissions

Avec cette configuration :

### **Intervenants** peuvent :
- ✅ Uploader des documents pour les bénéficiaires de leurs rendez-vous
- ✅ Télécharger les documents
- ✅ Changer la visibilité (public/privé)
- ✅ Voir tous les documents du bénéficiaire

### **Clients** peuvent :
- ✅ Uploader des documents pour leurs propres bénéficiaires
- ✅ Télécharger leurs documents
- ✅ Supprimer leurs documents

### **Admins** peuvent :
- ✅ Tout faire sur tous les documents

## 🎨 Fonctionnalités du Panel Documents

Le composant `BeneficiaryDocumentsPanel` offre :

### **Upload** :
- Sélection de fichier (tous types acceptés)
- Description optionnelle
- Visibilité client (switch)
- Barre de progression
- Association automatique au RDV

### **Liste** :
- Nom et taille du fichier
- Qui a uploadé le document
- Date d'upload
- Description si renseignée
- RDV associé
- Badge de visibilité (Visible client / Privé)

### **Actions** :
- 📥 Télécharger
- 👁️ Toggle visibilité (visible/privé)
- 🗑️ Supprimer

## ⚠️ En Cas de Problème

### Erreur "Bucket not found"
→ Le bucket n'existe pas, suivez l'ÉTAPE 1

### Erreur "new row violates row-level security policy"
→ Les policies RLS ne sont pas configurées, suivez l'ÉTAPE 2

### Erreur "Storage API error"
→ Vérifiez que les policies sont bien actives dans Supabase Storage → Policies

### Les documents ne s'affichent pas
→ Vérifiez les policies RLS sur la table `beneficiary_documents` (déjà configurées normalement)

## 📝 Notes

- Les fichiers sont stockés de manière sécurisée dans Supabase Storage
- Chaque fichier est associé à un bénéficiaire spécifique
- Les intervenants ne peuvent voir que les documents des bénéficiaires de leurs RDV
- Les documents marqués "Visible par le client" seront accessibles dans l'espace client
- Les documents "Privés" sont visibles seulement par les intervenants et admins
