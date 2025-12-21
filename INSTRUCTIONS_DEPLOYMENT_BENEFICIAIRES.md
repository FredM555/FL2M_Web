# Instructions de déploiement du système de notes et documents des bénéficiaires

## Vue d'ensemble

Ce document décrit les étapes nécessaires pour déployer le système complet de gestion des notes et documents des bénéficiaires avec 3 types de notes :
- **user** : Notes créées par le client, visibles uniquement par lui
- **practitioner** : Notes créées par l'intervenant, visibles uniquement par lui
- **shared** : Notes créées par l'intervenant, visibles par tous les intervenants (mais pas par le client)

## Étape 1 : Appliquer les migrations SQL

### Via Supabase Dashboard (Recommandé)

1. Ouvrir Supabase Dashboard : [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionner votre projet
3. Aller dans **SQL Editor**
4. Copier le contenu complet du fichier `apply_beneficiary_complete_system.sql`
5. Coller dans l'éditeur SQL
6. Cliquer sur **Run** pour exécuter le script

Le script va :
- ✅ Créer le type ENUM `beneficiary_note_type` avec 3 valeurs (user, practitioner, shared)
- ✅ Créer la table `beneficiary_notes` avec les champs `practitioner_id` et `user_id`
- ✅ Configurer les politiques RLS pour les 3 types de notes
- ✅ Créer la table `beneficiary_documents` avec visibilité contrôlée
- ✅ Configurer les politiques RLS pour les documents
- ✅ Supprimer les champs legacy de la table `appointments`
- ✅ Recréer la vue `appointments_with_beneficiaries`
- ✅ Créer tous les index nécessaires

### Vérification

Après l'exécution, vérifier que :
```sql
-- Vérifier que les tables existent
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('beneficiary_notes', 'beneficiary_documents');

-- Vérifier le type ENUM
SELECT enum_range(NULL::beneficiary_note_type);
-- Devrait retourner: {user,practitioner,shared}

-- Vérifier que les colonnes legacy ont été supprimées
SELECT column_name FROM information_schema.columns
WHERE table_name = 'appointments'
  AND column_name LIKE 'beneficiary_%';
-- Ne devrait rien retourner
```

## Étape 2 : Créer le bucket Supabase Storage

### Via Supabase Dashboard

1. Ouvrir Supabase Dashboard
2. Aller dans **Storage**
3. Cliquer sur **New bucket**
4. Configurer le bucket :
   - **Name** : `beneficiary-documents`
   - **Public bucket** : ❌ Non (privé)
   - **Allowed MIME types** : Laisser vide (tous les types autorisés)
   - **File size limit** : 50 MB (ou selon vos besoins)

### Configurer les politiques RLS du bucket

Aller dans l'onglet **Policies** du bucket et créer les politiques suivantes :

#### Politique 1 : Les intervenants peuvent uploader
```sql
CREATE POLICY "Practitioners can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'beneficiary-documents'
  AND EXISTS (
    SELECT 1 FROM practitioners
    WHERE user_id = auth.uid()
  )
);
```

#### Politique 2 : Les intervenants peuvent voir tous les documents
```sql
CREATE POLICY "Practitioners can view all documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'beneficiary-documents'
  AND EXISTS (
    SELECT 1 FROM practitioners
    WHERE user_id = auth.uid()
  )
);
```

#### Politique 3 : Les clients peuvent voir leurs documents visibles
```sql
CREATE POLICY "Users can view their visible documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'beneficiary-documents'
  AND (
    -- Vérifier que le document est visible et appartient à un bénéficiaire de l'utilisateur
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
      UNION
      SELECT beneficiary_id::text FROM beneficiary_access WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM beneficiary_documents bd
    WHERE bd.file_path = (storage.foldername(name))[1] || '/' || (storage.filename(name))[1]
      AND bd.is_visible_to_user = true
  )
);
```

#### Politique 4 : Les intervenants peuvent supprimer leurs documents
```sql
CREATE POLICY "Practitioners can delete their documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'beneficiary-documents'
  AND EXISTS (
    SELECT 1 FROM practitioners
    WHERE user_id = auth.uid()
  )
);
```

#### Politique 5 : Les admins peuvent tout faire
```sql
CREATE POLICY "Admins can manage all documents"
ON storage.objects FOR ALL
USING (
  bucket_id = 'beneficiary-documents'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);
```

## Étape 3 : Tester le système

### Test 1 : Créer une note (intervenant)

1. Se connecter en tant qu'intervenant
2. Ouvrir un rendez-vous avec un bénéficiaire
3. Cliquer sur l'onglet **Bénéficiaires**
4. Cliquer sur le bouton **Notes** d'un bénéficiaire
5. Créer une note de type **Privée** (practitioner)
6. Créer une note de type **Partagée** (shared)
7. Vérifier que les deux notes s'affichent correctement

### Test 2 : Upload de document

1. Dans le même contexte (intervenant)
2. Cliquer sur le bouton **Documents** d'un bénéficiaire
3. Sélectionner un fichier (PDF, image, etc.)
4. Ajouter une description (optionnel)
5. Cocher/décocher **Visible par le client**
6. Cliquer sur **Uploader**
7. Vérifier que le document apparaît dans la liste

### Test 3 : Visibilité des documents

1. Se connecter en tant que client propriétaire du bénéficiaire
2. Naviguer vers l'espace client (à implémenter si pas encore fait)
3. Vérifier que seuls les documents marqués "Visible client" sont accessibles
4. Vérifier que les notes de type **user** sont visibles
5. Vérifier que les notes **practitioner** et **shared** ne sont PAS visibles

### Test 4 : Téléchargement et suppression

1. En tant qu'intervenant
2. Cliquer sur l'icône **Télécharger** d'un document
3. Vérifier que le fichier se télécharge correctement
4. Cliquer sur l'icône **Visibilité** pour changer le statut
5. Cliquer sur l'icône **Supprimer** pour supprimer un document
6. Confirmer la suppression

## Étape 4 : Vérifications post-déploiement

### Base de données

```sql
-- Compter les notes par type
SELECT note_type, COUNT(*)
FROM beneficiary_notes
GROUP BY note_type;

-- Compter les documents
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN is_visible_to_user THEN 1 ELSE 0 END) as visible_to_users
FROM beneficiary_documents;

-- Vérifier les rendez-vous sans bénéficiaires
SELECT id, start_time
FROM appointments
WHERE id NOT IN (SELECT appointment_id FROM appointment_beneficiaries);
```

### Storage

1. Aller dans **Storage** > **beneficiary-documents**
2. Vérifier que les dossiers sont créés par beneficiary_id
3. Vérifier que les fichiers ont des noms uniques (timestamp)

## Fonctionnalités implémentées

### Composants créés/modifiés

- ✅ `BeneficiaryNotesPanel.tsx` - Gestion des notes avec 3 types
- ✅ `BeneficiaryDocumentsPanel.tsx` - Gestion complète des documents
- ✅ `AppointmentBeneficiaryList.tsx` - Mise à jour pour passer le practitionerId

### Services créés/modifiés

- ✅ `beneficiaries.ts` - Ajout des fonctions CRUD pour notes et documents
  - `getBeneficiaryNotes()` - Récupérer les notes
  - `createBeneficiaryNote()` - Créer une note avec type
  - `updateBeneficiaryNote()` - Modifier une note
  - `deleteBeneficiaryNote()` - Supprimer une note
  - `getBeneficiaryDocuments()` - Récupérer les documents
  - `createBeneficiaryDocument()` - Créer un document
  - `updateBeneficiaryDocument()` - Modifier un document
  - `deleteBeneficiaryDocument()` - Supprimer un document

### Types TypeScript

- ✅ `beneficiary.ts` - Types mis à jour
  - `BeneficiaryNoteType` : `'user' | 'practitioner' | 'shared'`
  - `BeneficiaryNote` : Avec champs `practitioner_id` et `user_id`
  - `BeneficiaryDocument` : Interface complète
  - `CreateBeneficiaryDocumentData` : Pour la création
  - `UpdateBeneficiaryDocumentData` : Pour la mise à jour

## Problèmes connus et solutions

### Erreur : "Bucket not found"

**Cause** : Le bucket n'existe pas encore dans Supabase Storage

**Solution** : Suivre l'Étape 2 pour créer le bucket

### Erreur : "permission denied for table beneficiary_notes"

**Cause** : Les politiques RLS ne sont pas correctement configurées

**Solution** : Réexécuter le script SQL de migration

### Erreur : "Cannot access before initialization"

**Cause** : Ordre d'export incorrect dans beneficiaries.ts

**Solution** : Déjà corrigé - les exports sont après toutes les déclarations de fonctions

## Prochaines étapes (optionnel)

### Interface client pour les notes

Pour permettre aux clients de créer leurs propres notes de type `user`, créer un composant similaire à `BeneficiaryNotesPanel` mais :
- Utiliser `user_id` au lieu de `practitioner_id`
- Afficher uniquement les notes de type `user`
- Permettre uniquement la création de notes `user`

### Notifications

Ajouter des notifications quand :
- Un document visible est ajouté (notifier le client)
- Une note importante est partagée (notifier les intervenants concernés)

### Export de documents

Permettre le téléchargement groupé de tous les documents d'un bénéficiaire en ZIP.

## Support

En cas de problème, vérifier :
1. Les logs du navigateur (Console)
2. Les logs Supabase (Dashboard > Logs)
3. Les politiques RLS (Dashboard > Authentication > Policies)
4. Les permissions du bucket (Dashboard > Storage > Policies)
