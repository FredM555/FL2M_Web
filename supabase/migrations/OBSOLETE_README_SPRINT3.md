# Sprint 3 - Interface Admin de Gestion des Contrats Praticiens

## Vue d'ensemble

Sprint 3 implémente l'interface administrateur pour gérer les demandes d'inscription en tant qu'intervenant et créer les contrats praticiens selon le **Modèle D** (4 paliers + 3 RDV gratuits).

## Prérequis

- ✅ Sprint 1 appliqué : Tables `practitioner_contracts`, `transactions`, `invoices`, `payouts`
- ✅ Sprint 2 implémenté : Services TypeScript `contracts.ts`, `commission-calculator.ts`
- ✅ Accès administrateur à Supabase Dashboard
- ✅ Accès au SQL Editor de Supabase

## Migration : Table practitioner_requests

### Étape 1 : Appliquer la migration SQL

**Méthode recommandée : Via Supabase Dashboard**

1. Ouvrez votre projet Supabase Dashboard : https://supabase.com/dashboard/project/YOUR_PROJECT_ID

2. Naviguez vers **SQL Editor** (icône dans la barre latérale gauche)

3. Cliquez sur **New Query**

4. Copiez l'intégralité du fichier `create_practitioner_requests.sql`

5. Collez le contenu dans l'éditeur SQL

6. Cliquez sur **Run** (ou appuyez sur Ctrl+Enter / Cmd+Enter)

7. Vérifiez qu'aucune erreur n'apparaît dans la console

**Alternative : Via CLI Supabase** (si configuré localement)

```bash
# Note : Cette méthode nécessite que Supabase CLI soit configuré
npx supabase db push
```

### Étape 2 : Vérifier l'installation

Exécutez ces requêtes dans le SQL Editor pour confirmer :

```sql
-- 1. Vérifier que la table existe
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_name = 'practitioner_requests';
-- Résultat attendu : 1 ligne avec table_name = 'practitioner_requests'

-- 2. Vérifier les colonnes de la table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'practitioner_requests'
ORDER BY ordinal_position;
-- Résultat attendu : 16 colonnes (id, user_id, motivation, etc.)

-- 3. Vérifier que les fonctions RPC existent
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('approve_practitioner_request', 'reject_practitioner_request');
-- Résultat attendu : 2 lignes (approve et reject)

-- 4. Vérifier les policies RLS
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'practitioner_requests';
-- Résultat attendu : 6 policies
```

### Étape 3 : Créer le bucket Supabase Storage

**Important** : Pour que l'upload de documents PDF fonctionne, vous devez créer le bucket de stockage.

1. Dans Supabase Dashboard, naviguez vers **Storage** (icône dans la barre latérale)

2. Cliquez sur **New Bucket**

3. Configurez le bucket :
   - **Name** : `practitioner-documents`
   - **Public bucket** : ❌ NON (décoché)
   - **File size limit** : 5 MB (optionnel)
   - **Allowed MIME types** : `application/pdf` (optionnel mais recommandé)

4. Cliquez sur **Create Bucket**

### Étape 4 : Configurer les RLS Policies pour le Storage

Exécutez dans le SQL Editor :

```sql
-- Policy 1 : Les admins peuvent uploader des documents
CREATE POLICY "Admins can upload practitioner documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'practitioner-documents'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- Policy 2 : Les admins peuvent lire tous les documents
CREATE POLICY "Admins can read all practitioner documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'practitioner-documents'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- Policy 3 : Les praticiens peuvent lire leurs propres documents
CREATE POLICY "Practitioners can read their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'practitioner-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4 : Les admins peuvent supprimer des documents
CREATE POLICY "Admins can delete practitioner documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'practitioner-documents'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);
```

## Architecture du Workflow

### 1. Soumission de la demande (Utilisateur)

**Page** : `/account` ou toute page avec `BecomePractitionerCard`

**Composant** : `src/components/practitioner/BecomePractitionerCard.tsx`

**Flux** :
1. L'utilisateur clique sur "Devenir Intervenant"
2. Remplit le formulaire (motivation, expérience, certifications, etc.)
3. Soumet la demande
4. Une nouvelle ligne est créée dans `practitioner_requests` avec `status = 'pending'`

**Code** :
```typescript
await supabase.from('practitioner_requests').insert({
  user_id: user.id,
  motivation: formData.motivation,
  experience: formData.experience,
  // ...
  status: 'pending'
});
```

### 2. Consultation des demandes (Admin)

**Page** : `/admin/demandes-intervenant`

**Composant** : `src/pages/Admin/PractitionerRequestsPage.tsx`

**Flux** :
1. L'admin accède à la page
2. Voit la liste de toutes les demandes `pending`
3. Peut filtrer par statut (pending/approved/rejected)
4. Clique sur "Approuver" ou "Rejeter"

**Requête** :
```typescript
const { data } = await supabase
  .from('practitioner_requests')
  .select('*, profiles(*)')
  .order('created_at', { ascending: false });
```

### 3. Approbation d'une demande (Admin)

**Modal** : `src/components/admin/PromotePractitionerModal.tsx`

**Flux en 4 étapes** :

#### Étape 1 : Choix du type de contrat
- Composant : `ContractTypeSelector`
- L'admin choisit parmi : FREE, STARTER, PRO, PREMIUM
- Affiche les détails de chaque palier (prix mensuel, commission, limites)

#### Étape 2 : Upload du document PDF (optionnel)
- Composant : `ContractUploader`
- Upload du PDF vers `practitioner-documents` bucket
- Validation : PDF uniquement, max 5 MB
- Génère l'URL publique du document

#### Étape 3 : Configuration Stripe (optionnel)
- Composant : `StripeAccountSetup`
- Saisie manuelle du Stripe Account ID
- Format validé : `acct_XXXXXXXXXXXXXXXXXX`

#### Étape 4 : Confirmation et notes
- Révision de tous les choix
- Saisie de notes admin (optionnel)
- Clic sur "Créer le Contrat"

**Action finale** :
```typescript
// 1. Créer le contrat
const contract = await ContractsService.createContract({
  practitioner_id: practitionerId,
  contract_type: contractType,
  start_date: startDate,
  contract_document_url: documentUrl,
  admin_notes: notes
}, adminUserId);

// 2. Approuver la demande (RPC function)
const { data } = await supabase.rpc('approve_practitioner_request', {
  p_request_id: requestId,
  p_admin_id: adminUserId,
  p_admin_notes: notes
});
```

**Logique de la fonction RPC `approve_practitioner_request`** :
1. Vérifie que la demande existe et est `pending`
2. Vérifie si l'utilisateur a déjà un profil `practitioners`
3. Si NON → Crée automatiquement le profil practitioner avec les infos proposées
4. Met à jour la demande : `status = 'approved'`, `reviewed_by = admin_id`, `reviewed_at = NOW()`
5. Retourne la demande mise à jour

### 4. Rejet d'une demande (Admin)

**Flux** :
1. L'admin clique sur "Rejeter"
2. Saisit une note explicative (optionnel)
3. Confirme le rejet

**Action** :
```typescript
await supabase.rpc('reject_practitioner_request', {
  p_request_id: requestId,
  p_admin_id: adminUserId,
  p_admin_notes: 'Profil incomplet, manque de certifications...'
});
```

**Logique de la fonction RPC `reject_practitioner_request`** :
1. Vérifie que la demande existe et est `pending`
2. Met à jour : `status = 'rejected'`, `reviewed_by = admin_id`, `reviewed_at = NOW()`
3. NE crée PAS de profil practitioner
4. L'utilisateur peut soumettre une nouvelle demande plus tard

### 5. Visualisation des contrats (Admin)

**Page** : `/admin/intervenants`

**Composant** : `src/pages/Admin/PractitionersPage.tsx`

**Flux** :
1. L'admin voit la liste de tous les praticiens
2. Colonne "Contrat Actif" affiche un Chip avec le type de contrat
3. Clic sur "Voir Historique" ouvre un dialog
4. Dialog affiche `ContractHistory` : timeline des contrats

**Composant** : `src/components/admin/ContractHistory.tsx`
- Affiche chronologiquement tous les contrats d'un praticien
- Highlight du contrat actif avec animation
- Détails : type, prix mensuel, commission, compteur RDV, document PDF
- Icônes différentes selon le statut (active/suspended/terminated)

## Sécurité et Permissions

### RLS Policies sur practitioner_requests

| Action | Utilisateur | Admin |
|--------|-------------|-------|
| SELECT | ✅ Ses propres demandes uniquement | ✅ Toutes les demandes |
| INSERT | ✅ Peut créer pour lui-même | ❌ Non autorisé (via frontend) |
| UPDATE | ✅ Ses demandes `pending` uniquement | ✅ Toutes les demandes |
| DELETE | ❌ Non autorisé | ✅ Toutes les demandes |

### RPC Functions avec SECURITY DEFINER

Les fonctions `approve_practitioner_request` et `reject_practitioner_request` utilisent `SECURITY DEFINER` pour :
- Contourner les RLS policies (nécessaire pour créer un practitioner)
- Garantir que seuls les admins peuvent exécuter ces fonctions
- Valider les données avant modification

### Protection contre les doublons

**Contrainte UNIQUE** : `UNIQUE(user_id, created_at)`
- Empêche un utilisateur de créer plusieurs demandes exactement au même moment
- Permet de soumettre une nouvelle demande après rejet

**Contrainte CHECK** :
```sql
CHECK (
  (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL) OR
  (status IN ('approved', 'rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
)
```
- Garantit l'intégrité des données de révision
- Une demande approuvée/rejetée DOIT avoir un reviewer et une date

## Modèle D : Les 4 Paliers de Contrat

| Palier | Abonnement Mensuel | Commission Fixe | Commission % | Plafond Commission | Max RDV/mois |
|--------|-------------------|-----------------|--------------|-------------------|--------------|
| **FREE** | 0€ | 3€ | 10% | 20€ | Illimité |
| **STARTER** | 20€ | 1€ | 5% | 15€ | 12 RDV |
| **PRO** | 50€ | 1€ | 3% | 10€ | Illimité |
| **PREMIUM** | 100€ | 0€ | 0% | 0€ | Illimité |

**Note importante** : Tous les praticiens bénéficient de **3 RDV gratuits** (sans commission) avant l'application du modèle tarifaire.

## Tests de Validation

### 1. Test du workflow complet

```sql
-- 1. Créer une demande de test
INSERT INTO public.practitioner_requests (
  user_id,
  motivation,
  experience,
  proposed_display_name,
  proposed_title
) VALUES (
  'USER_UUID_ICI',
  'Je souhaite partager mon expertise en numérologie',
  '5 ans d''expérience',
  'Marie Dupont',
  'Numérologue Certifiée'
);

-- 2. Récupérer l'ID de la demande
SELECT id, status FROM public.practitioner_requests
WHERE user_id = 'USER_UUID_ICI'
ORDER BY created_at DESC LIMIT 1;

-- 3. Approuver la demande (remplacer REQUEST_ID et ADMIN_ID)
SELECT * FROM approve_practitioner_request(
  'REQUEST_ID_ICI'::uuid,
  'ADMIN_ID_ICI'::uuid,
  'Profil complet et professionnel'
);

-- 4. Vérifier que le praticien a été créé
SELECT * FROM public.practitioners
WHERE user_id = 'USER_UUID_ICI';

-- 5. Vérifier que la demande a été mise à jour
SELECT status, reviewed_by, reviewed_at
FROM public.practitioner_requests
WHERE id = 'REQUEST_ID_ICI';
```

### 2. Test de rejet

```sql
-- Rejeter une demande
SELECT * FROM reject_practitioner_request(
  'REQUEST_ID_ICI'::uuid,
  'ADMIN_ID_ICI'::uuid,
  'Manque de certifications'
);

-- Vérifier que AUCUN praticien n'a été créé
SELECT COUNT(*) FROM public.practitioners
WHERE user_id = 'USER_UUID_ICI';
-- Résultat attendu : 0
```

### 3. Test de l'upload de documents

Dans le frontend (`ContractUploader.tsx`), testez :
1. Upload d'un PDF valide (< 5 MB) → ✅ Succès
2. Upload d'un fichier non-PDF (jpg, png) → ❌ Erreur
3. Upload d'un PDF trop lourd (> 5 MB) → ❌ Erreur

## Dépannage

### Erreur : "Could not find the table 'public.practitioner_requests'"

**Cause** : La migration n'a pas été appliquée

**Solution** : Suivre l'Étape 1 ci-dessus pour appliquer `create_practitioner_requests.sql`

### Erreur : "Invalid Refresh Token: Refresh Token Not Found"

**Cause** : Session expirée ou corrompue

**Solution** : Dans la console du navigateur :
```javascript
localStorage.clear();
location.reload();
```

### Erreur : "Storage bucket not found: practitioner-documents"

**Cause** : Le bucket Supabase Storage n'existe pas

**Solution** : Suivre l'Étape 3 ci-dessus pour créer le bucket

### Erreur : "Permission denied for storage bucket"

**Cause** : Les RLS policies du Storage ne sont pas configurées

**Solution** : Suivre l'Étape 4 ci-dessus pour créer les policies

### Erreur : "PGRST116: Cannot coerce the result to a single JSON object"

**Cause** : Utilisation de `.single()` quand le résultat peut être vide

**Solution** : Utiliser `.maybeSingle()` à la place (déjà corrigé dans `contracts.ts:37`)

## Fichiers Modifiés/Créés

### Migrations SQL
- ✅ `supabase/migrations/create_practitioner_requests.sql` (NOUVEAU)

### Services TypeScript
- ✅ `src/services/contracts.ts` (MODIFIÉ : .maybeSingle())

### Composants Admin
- ✅ `src/components/admin/ContractTypeSelector.tsx` (NOUVEAU)
- ✅ `src/components/admin/ContractUploader.tsx` (NOUVEAU)
- ✅ `src/components/admin/ContractHistory.tsx` (NOUVEAU)
- ✅ `src/components/admin/StripeAccountSetup.tsx` (NOUVEAU)
- ✅ `src/components/admin/PromotePractitionerModal.tsx` (NOUVEAU)

### Pages Admin
- ✅ `src/pages/Admin/PractitionerRequestsPage.tsx` (MODIFIÉ)
- ✅ `src/pages/Admin/PractitionersPage.tsx` (MODIFIÉ)

### Documentation
- ✅ `supabase/migrations/README_SPRINT3.md` (NOUVEAU - ce fichier)

## Prochaines Étapes (Sprint 4+)

### Automatisation
- Cronjob pour réinitialiser `appointments_this_month` au 1er de chaque mois
- Webhook Stripe pour synchroniser les paiements d'abonnement

### Notifications
- Email automatique à l'utilisateur lors de l'approbation/rejet
- Notification in-app pour les nouvelles demandes (admin)

### Tableau de bord praticien
- Page `/practitioner/dashboard` avec statistiques personnelles
- Suivi des commissions et paiements
- Calendrier de disponibilités

### Gestion des paiements
- Intégration Stripe Checkout pour les abonnements mensuels
- Calcul automatique des commissions (déjà implémenté dans `commission-calculator.ts`)
- Génération des factures mensuelles

## Support

Pour toute question ou problème :
1. Vérifiez les logs Supabase Dashboard (API Logs)
2. Consultez la console navigateur pour les erreurs frontend
3. Testez les requêtes SQL dans le SQL Editor
4. Vérifiez que toutes les migrations Sprint 1-3 sont appliquées

## Changelog

**2025-01-26** - Sprint 3 Initial Release
- Création de la table `practitioner_requests`
- Fonctions RPC `approve_practitioner_request` et `reject_practitioner_request`
- 5 nouveaux composants admin pour la gestion des contrats
- Intégration complète du workflow d'approbation
- Documentation complète
