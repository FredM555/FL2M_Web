# Nouvelles Fonctionnalités pour les Intervenants

## 📋 Résumé des Changements

Ce document décrit les nouvelles fonctionnalités ajoutées pour les intervenants :

1. **Proposition d'abonnement initial** : Les intervenants approuvés sans contrat peuvent choisir leur abonnement
2. **Annulation de changement d'abonnement** : Possibilité d'annuler un changement planifié
3. **Gestion de la visibilité du profil** : Toggle pour afficher/masquer le profil dans la liste publique
4. **Aperçu du profil** : Nouvel onglet pour voir comment le profil apparaît aux clients

## 🎯 Fonctionnalité 1 : Proposition d'Abonnement Initial

### Description
Lorsqu'un intervenant est approuvé mais n'a pas encore de contrat actif, l'onglet "Mon Abonnement" affiche maintenant :
- Un message de bienvenue
- Un sélecteur de type d'abonnement (FREE, STARTER, PRO, PREMIUM)
- Un bouton pour activer l'abonnement choisi

### Fichiers modifiés
- `src/components/practitioner/SubscriptionManagement.tsx`
  - Ajout de `handleInitialSubscription()` (lignes 116-151)
  - Modification de l'affichage quand `currentContract` est null (lignes 260-301)

### Comportement
- **FREE** : Activé immédiatement avec `status='active'`
- **STARTER/PRO/PREMIUM** : Créé avec `status='pending_payment'`, nécessite validation de paiement

## 🎯 Fonctionnalité 2 : Annulation de Changement d'Abonnement

### Description
Les intervenants peuvent maintenant annuler un changement d'abonnement planifié s'il est en statut `pending_payment`.

### Fichiers modifiés
- `src/components/practitioner/SubscriptionManagement.tsx`
  - Ajout de `handleCancelChange()` (lignes 153-189)
  - Ajout du bouton "Annuler ce changement" sur la carte du contrat suivant (lignes 339-359)
  - Ajout d'un dialog de confirmation (lignes 549-588)

### Comportement
L'annulation :
1. Supprime le contrat en `pending_payment`
2. Réinitialise l'`end_date` du contrat actuel à `null`
3. Supprime les notes admin du contrat actuel
4. Affiche une confirmation de succès

## 🎯 Fonctionnalité 3 : Gestion de la Visibilité du Profil

### Description
Un nouveau champ `profile_visible` permet aux intervenants de contrôler si leur profil apparaît dans la liste publique des intervenants.

### Fichiers créés/modifiés

#### Migration SQL
- `supabase/migrations/add_profile_visible_to_practitioners.sql`
  ```sql
  ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS profile_visible BOOLEAN NOT NULL DEFAULT true;
  ```

#### Types TypeScript
- `src/services/supabase.ts` (ligne 61)
  - Ajout de `profile_visible: boolean` dans le type `Practitioner`

#### Formulaire du profil
- `src/components/practitioner/PractitionerProfileForm.tsx`
  - Ajout du Switch dans l'UI (lignes 166-196)
  - Support du champ dans `formData` et `hasChanges()`
  - Visuel dynamique : vert si visible, gris si masqué

### Comportement
- **Par défaut** : `true` (profil visible)
- **Switch activé** : Profil visible dans la liste publique
- **Switch désactivé** : Profil masqué de la liste publique

## 🎯 Fonctionnalité 4 : Aperçu du Profil

### Description
Un nouvel onglet "Aperçu" permet aux intervenants de voir comment leur profil sera affiché aux clients.

### Fichiers créés/modifiés

#### Nouveau composant
- `src/components/practitioner/PractitionerProfilePreview.tsx`
  - Affiche une carte de profil comme elle apparaîtra publiquement
  - Inclut : nom, titre, résumé, domaines d'expertise, formations, biographie
  - Affiche un avertissement si le profil est masqué
  - Affiche une alerte si le profil est incomplet

#### Page du profil intervenant
- `src/pages/PractitionerProfilePage.tsx`
  - Ajout de l'onglet "Aperçu" (2ème position)
  - Réorganisation des index des onglets :
    - 0 : Mon Profil
    - 1 : Aperçu ← **NOUVEAU**
    - 2 : Mon Abonnement
    - 3 : Mes Transactions

### Comportement
- **Profil visible** : Affiche l'aperçu complet du profil public
- **Profil masqué** : Affiche un message d'avertissement
- **Profil incomplet** : Affiche une alerte encourageant à compléter le profil

## 🔒 Sécurité : Row Level Security (RLS)

### Nouvelles policies créées

#### Fichier
- `supabase/migrations/add_rls_practitioner_contracts.sql`

#### Policies pour `practitioner_contracts`

1. **SELECT - Praticiens**
   ```sql
   Practitioners can view their own contracts
   ```
   Les praticiens peuvent voir leurs propres contrats

2. **UPDATE - Praticiens**
   ```sql
   Practitioners can update their own contracts
   ```
   Les praticiens peuvent mettre à jour leurs propres contrats (nécessaire pour réinitialiser `end_date`)

3. **DELETE - Praticiens**
   ```sql
   Practitioners can delete their pending contracts
   ```
   Les praticiens peuvent supprimer **uniquement** leurs contrats en `pending_payment`

4. **ALL - Admins**
   ```sql
   Admins can view all contracts
   Admins can manage all contracts
   ```
   Les admins ont tous les droits sur tous les contrats

## 📦 Migrations à Appliquer

### Option 1 : SQL Editor (Recommandé)

1. Accédez au [Supabase Dashboard → SQL Editor](https://supabase.com/dashboard/project/ynvvysmtvzgfdzakyqzf/editor)

2. **Migration 1 : RLS sur practitioner_contracts**
   - Créez une nouvelle requête
   - Copiez-collez le contenu de `supabase/migrations/add_rls_practitioner_contracts.sql`
   - Exécutez

3. **Migration 2 : Champ profile_visible**
   - Créez une nouvelle requête
   - Copiez-collez le contenu de `supabase/migrations/add_profile_visible_to_practitioners.sql`
   - Exécutez

### Option 2 : Script helper

Un script `apply_rls_migration.cjs` est disponible pour voir les détails des migrations, mais l'application manuelle via SQL Editor est recommandée.

## ✅ Tests Recommandés

### Test 1 : Abonnement Initial
1. Connectez-vous en tant qu'intervenant approuvé sans contrat
2. Allez sur "Mon Profil Intervenant" → "Mon Abonnement"
3. Vérifiez que le sélecteur d'abonnement s'affiche
4. Choisissez un abonnement et activez-le
5. Vérifiez que le contrat est créé correctement

### Test 2 : Annulation de Changement
1. Ayez un contrat actif et un contrat suivant en `pending_payment`
2. Allez sur "Mon Abonnement"
3. Cliquez sur "Annuler ce changement" sur la carte du contrat suivant
4. Confirmez l'annulation
5. Vérifiez que le contrat suivant est supprimé et que l'`end_date` du contrat actuel est `null`

### Test 3 : Visibilité du Profil
1. Allez sur "Mon Profil" → "Mon Profil"
2. Activez/désactivez le switch "Profil visible"
3. Enregistrez
4. Vérifiez dans l'onglet "Aperçu" que le statut est correct
5. Vérifiez que le profil apparaît/disparaît de la liste publique des intervenants

### Test 4 : Aperçu du Profil
1. Allez sur "Mon Profil" → "Aperçu"
2. Vérifiez que le profil s'affiche correctement
3. Modifiez des informations dans "Mon Profil"
4. Revenez à "Aperçu" et vérifiez que les changements sont reflétés

## 🎨 UI/UX

### Onglets
- **Mon Profil** : Formulaire d'édition avec le nouveau toggle de visibilité
- **Aperçu** ← NOUVEAU : Prévisualisation du profil public
- **Mon Abonnement** : Gestion des contrats, proposition initiale, annulation
- **Mes Transactions** : Historique des transactions (inchangé)

### Couleurs et icônes
- **Profil visible** : Vert avec ✅ VisibilityIcon
- **Profil masqué** : Gris avec 🚫 VisibilityOffIcon
- **Contrat suivant** : Bleu clair avec bordure pointillée
- **Bouton annuler** : Rouge avec texte d'avertissement

## 📝 Notes Importantes

1. **RLS** : Les migrations RLS doivent être appliquées pour que les praticiens puissent supprimer leurs contrats `pending_payment`

2. **Valeur par défaut** : `profile_visible` est `true` par défaut, donc tous les profils existants seront visibles

3. **Cycle mensuel** : Le calcul des dates d'abonnement utilise maintenant le jour anniversaire de la souscription (ex: souscription le 02/12 → renouvellement le 02/01)

4. **Contrat FREE** : Activé immédiatement sans paiement requis

5. **Profil incomplet** : L'aperçu affiche une alerte si le profil manque d'informations importantes

## 🔗 Fichiers Principaux Modifiés

- `src/components/practitioner/SubscriptionManagement.tsx`
- `src/components/practitioner/PractitionerProfileForm.tsx`
- `src/components/practitioner/PractitionerProfilePreview.tsx` ← NOUVEAU
- `src/pages/PractitionerProfilePage.tsx`
- `src/services/supabase.ts`
- `supabase/migrations/add_rls_practitioner_contracts.sql` ← NOUVEAU
- `supabase/migrations/add_profile_visible_to_practitioners.sql` ← NOUVEAU

## 📞 Support

Pour toute question ou problème, veuillez créer une issue dans le dépôt GitHub.
