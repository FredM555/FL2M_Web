# 🔐 Configuration des Permissions RLS pour les Bénéficiaires

## 🎯 Problème Identifié

Les bénéficiaires sont bien stockés dans la base de données, mais les **intervenants et admins ne peuvent pas les voir** à cause des permissions RLS (Row Level Security) manquantes.

**Symptômes :**
- ✅ Les clients voient leurs bénéficiaires
- ❌ Les intervenants/admins voient "1 / 1 bénéficiaire(s)" mais la liste est vide
- ❌ L'onglet "Bénéficiaire" ne montre aucun détail

## 🚀 Solution : Appliquer les Policies RLS

### 📋 Instructions Pas-à-Pas

1. **Ouvrez Supabase Dashboard**
   - Allez sur https://supabase.com/dashboard
   - Sélectionnez votre projet FL2M

2. **Ouvrez l'Éditeur SQL**
   - Cliquez sur **"SQL Editor"** dans le menu de gauche (icône </>)
   - Cliquez sur **"New query"**

3. **Copiez le Script SQL**
   - Ouvrez le fichier `APPLY_BENEFICIARIES_RLS_COMPLETE.sql`
   - Sélectionnez tout le contenu (Ctrl+A)
   - Copiez (Ctrl+C)

4. **Exécutez le Script**
   - Collez dans l'éditeur SQL de Supabase (Ctrl+V)
   - Cliquez sur le bouton **"Run"** (ou appuyez sur Ctrl+Enter)
   - Attendez la confirmation ✅

5. **Vérifiez le Résultat**
   - Vous devriez voir un message de succès
   - Rechargez votre application (F5)
   - Testez en ouvrant un rendez-vous côté intervenant
   - L'onglet "Bénéficiaire" devrait maintenant afficher les bénéficiaires

## 📊 Que Fait Cette Migration ?

Cette migration ajoute les permissions RLS sur **4 tables** :

### 1. `appointment_beneficiaries`
Permet aux intervenants de voir quels bénéficiaires sont liés à leurs rendez-vous

### 2. `beneficiaries`
**⚠️ CRUCIAL** - Permet aux intervenants de lire les détails des bénéficiaires (nom, prénom, etc.)

### 3. `beneficiary_notes`
Permet aux intervenants d'ajouter et consulter des notes sur les bénéficiaires

### 4. `beneficiary_documents`
Permet aux intervenants d'uploader et consulter des documents pour les bénéficiaires

## ✅ Permissions Accordées

Pour chaque table, les permissions sont accordées à :

- 👤 **Le propriétaire** (owner_id) du bénéficiaire
- 🤝 **Les utilisateurs autorisés** (via beneficiary_access)
- 👨‍⚕️ **L'intervenant** du rendez-vous où le bénéficiaire est lié
- 👑 **Les admins** (user_type = 'admin')

## 🧪 Comment Tester

1. **En tant qu'intervenant/admin :**
   - Allez dans "Mes rendez-vous clients"
   - Sélectionnez l'onglet "A préparer"
   - Double-cliquez sur un rendez-vous
   - Cliquez sur l'onglet "Bénéficiaire"
   - **Vous devriez maintenant voir les bénéficiaires** 🎉

2. **Ajouter un document :**
   - Cliquez sur un bénéficiaire pour l'ouvrir
   - Cliquez sur le bouton "Documents"
   - Uploadez un fichier
   - Le document est lié au **bénéficiaire**, pas au rendez-vous

3. **Ajouter une note :**
   - Cliquez sur un bénéficiaire pour l'ouvrir
   - Cliquez sur le bouton "Notes"
   - Rédigez une note
   - La note est privée et visible seulement par vous et les admins

## ⚠️ En Cas de Problème

Si après l'application du script, les bénéficiaires ne s'affichent toujours pas :

1. **Vérifiez les policies créées :**
   ```sql
   SELECT tablename, policyname, cmd
   FROM pg_policies
   WHERE tablename IN ('beneficiaries', 'appointment_beneficiaries', 'beneficiary_notes', 'beneficiary_documents')
   ORDER BY tablename, policyname;
   ```

2. **Vérifiez que vous êtes bien intervenant/admin :**
   ```sql
   SELECT id, user_type FROM profiles WHERE id = auth.uid();
   ```

3. **Vérifiez que RLS est activé :**
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE tablename IN ('beneficiaries', 'appointment_beneficiaries', 'beneficiary_notes', 'beneficiary_documents');
   ```

4. **Rechargez complètement l'application :**
   - Ctrl+Shift+R (hard reload)
   - Ou fermez et rouvrez le navigateur

## 📞 Support

Si le problème persiste, vérifiez :
- Que l'utilisateur a bien un `practitioner_id` dans la table `practitioners`
- Que le `user_id` du practitioner correspond bien à l'ID de l'utilisateur connecté
- Les logs de la console navigateur (F12) pour voir les erreurs SQL

## 🔄 Pour Annuler (en cas de besoin)

```sql
-- ATTENTION: Ceci supprime toutes les policies
DROP POLICY IF EXISTS "appointment_beneficiaries_select_policy" ON appointment_beneficiaries;
DROP POLICY IF EXISTS "beneficiaries_select_for_practitioners" ON beneficiaries;
DROP POLICY IF EXISTS "beneficiary_notes_select_policy" ON beneficiary_notes;
DROP POLICY IF EXISTS "beneficiary_documents_select_policy" ON beneficiary_documents;
-- etc...
```
