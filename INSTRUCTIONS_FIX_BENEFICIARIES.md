# 🔧 Instructions pour Corriger les Erreurs Bénéficiaires

## Problèmes Identifiés

1. **Erreur relation beneficiary_notes/profiles**: La table `beneficiary_notes` manque la colonne `user_id`
2. **Bucket beneficiary-documents manquant**: Le bucket de stockage n'existe pas encore

## ✅ Solutions Créées

Deux migrations SQL ont été créées :
- `supabase/migrations/20251223_fix_beneficiary_notes_add_user_id.sql`
- `supabase/migrations/20251223_create_beneficiary_documents_bucket.sql`

---

## 📋 Méthode 1 : Appliquer via le Dashboard Supabase (RECOMMANDÉ)

### Étape 1 : Corriger la table beneficiary_notes

1. **Ouvrez le Dashboard Supabase**
   - Allez sur https://supabase.com/dashboard
   - Sélectionnez votre projet FL2M

2. **Accédez au SQL Editor**
   - Dans le menu de gauche, cliquez sur **"SQL Editor"** (icône </> )

3. **Copiez et exécutez la migration 1**
   - Cliquez sur **"New query"**
   - Ouvrez le fichier `supabase/migrations/20251223_fix_beneficiary_notes_add_user_id.sql`
   - Copiez tout le contenu
   - Collez-le dans l'éditeur SQL
   - Cliquez sur **"Run"** (bouton en bas à droite)

4. **Vérifiez le résultat**
   - Vous devriez voir le message "Success. No rows returned"
   - La colonne `user_id` a été ajoutée à la table `beneficiary_notes`
   - Les politiques RLS ont été mises à jour

### Étape 2 : Créer le bucket beneficiary-documents

1. **Méthode A : Via SQL Editor (RECOMMANDÉ)**
   - Toujours dans le SQL Editor
   - Cliquez sur **"New query"**
   - Ouvrez le fichier `supabase/migrations/20251223_create_beneficiary_documents_bucket.sql`
   - Copiez tout le contenu
   - Collez-le dans l'éditeur SQL
   - Cliquez sur **"Run"**

2. **Méthode B : Via l'interface Storage (si la méthode A échoue)**
   - Dans le menu de gauche, cliquez sur **"Storage"**
   - Cliquez sur **"New bucket"**
   - Nom du bucket : `beneficiary-documents`
   - **Public bucket** : ❌ NON (décochez)
   - **File size limit** : 10 MB
   - Cliquez sur **"Create bucket"**
   - Ensuite, exécutez seulement la partie "Politiques RLS" de la migration SQL :
     ```sql
     -- Copiez uniquement les sections 3, 4, 5, 6 de 20251223_create_beneficiary_documents_bucket.sql
     -- (les CREATE POLICY...)
     ```

### Étape 3 : Vérification

1. **Vérifiez la table beneficiary_notes**
   - SQL Editor > New query
   - Exécutez :
     ```sql
     SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_name = 'beneficiary_notes'
     ORDER BY ordinal_position;
     ```
   - Vous devriez voir la colonne `user_id` dans la liste

2. **Vérifiez le bucket**
   - Allez dans Storage
   - Vous devriez voir `beneficiary-documents` dans la liste des buckets
   - Cliquez dessus
   - Vérifiez que le bucket est **privé** (icône cadenas 🔒)

3. **Vérifiez les politiques RLS du bucket**
   - Dans le bucket `beneficiary-documents`, cliquez sur l'onglet **"Policies"**
   - Vous devriez voir 4 politiques :
     - Users can download beneficiary documents (SELECT)
     - Users can upload beneficiary documents (INSERT)
     - Users can update beneficiary documents (UPDATE)
     - Users can delete beneficiary documents (DELETE)

---

## 🧪 Méthode 2 : Appliquer via la ligne de commande

Si vous préférez utiliser la ligne de commande et que la connexion fonctionne :

```bash
# Exécuter les migrations
npx supabase db push
```

Si cela échoue avec un timeout, utilisez la Méthode 1.

---

## ✅ Test des Corrections

Une fois les migrations appliquées, testez :

### Test 1 : Créer une Note

1. Allez dans "Mes rendez-vous clients" (intervenant)
2. Onglet "A préparer"
3. Double-cliquez sur un rendez-vous
4. Onglet "Bénéficiaire"
5. Cliquez sur un bénéficiaire
6. Cliquez sur **"Ajouter une note"**
7. Rédigez une note
8. Sélectionnez le type (Privée/Publique)
9. Enregistrez

**Résultat attendu** : ✅ Pas d'erreur "Could not find a relationship between 'beneficiary_notes' and 'profiles'"

### Test 2 : Uploader un Document

1. Dans le même écran
2. Cliquez sur **"Documents"**
3. Cliquez sur **"Sélectionner un fichier"**
4. Choisissez un fichier (PDF, image, etc.)
5. Ajoutez une description (optionnel)
6. Cochez/Décochez "Visible par le client"
7. Cliquez sur **"Uploader"**

**Résultat attendu** :
- ✅ Pas d'erreur "Le bucket de stockage n'existe pas"
- ✅ Le fichier apparaît dans la liste
- ✅ Une barre de progression s'affiche pendant l'upload

---

## 🔍 En Cas de Problème

### Erreur "duplicate key value violates unique constraint"
→ La migration a déjà été appliquée partiellement. Pas de problème, les `ON CONFLICT` gèrent cela.

### Erreur "column user_id already exists"
→ La migration a déjà été appliquée. Tout va bien.

### Erreur "bucket already exists"
→ Le bucket existe déjà. Appliquez seulement les politiques RLS (section 3-6 de la migration).

### Les notes ne s'enregistrent toujours pas
1. Vérifiez que la colonne `user_id` existe bien
2. Vérifiez que les politiques RLS sont actives
3. Vérifiez les logs dans le Dashboard Supabase > Logs

### Les documents ne s'uploadent toujours pas
1. Vérifiez que le bucket existe
2. Vérifiez que le bucket est privé
3. Vérifiez les politiques RLS sur storage.objects
4. Vérifiez la taille des fichiers (max 10 MB)

---

## 📊 Récapitulatif des Changements

### Table `beneficiary_notes`
**Avant** :
- `practitioner_id` (NOT NULL, référence practitioners)
- Pas de `user_id`
- Types de notes : 'private', 'public'

**Après** :
- `practitioner_id` (NULLABLE, référence practitioners)
- `user_id` (NOUVELLE, référence profiles)
- Types de notes : 'private', 'public', 'practitioner', 'shared', 'user'
- Contrainte : Au moins un des deux (practitioner_id ou user_id) doit être renseigné

### Bucket Storage
**Avant** :
- ❌ N'existait pas

**Après** :
- ✅ Bucket `beneficiary-documents` créé
- ✅ Privé (pas d'accès public)
- ✅ Limite de 10 MB par fichier
- ✅ 4 politiques RLS configurées
- ✅ Structure : `{beneficiary_id}/{timestamp}_{filename}`

---

## 🎯 Prochaines Étapes

Une fois les migrations appliquées et testées :

1. ✅ Supprimer les anciens fichiers de migration temporaires si tout fonctionne
2. ✅ Documenter le nouveau système de notes avec user_id
3. ✅ Informer l'équipe des nouveaux types de notes disponibles
4. ✅ Tester l'accès aux documents depuis l'espace client (si implémenté)

---

## 📞 Support

Si vous rencontrez des problèmes persistants :
1. Vérifiez les logs dans Supabase Dashboard > Logs
2. Consultez la documentation Supabase Storage : https://supabase.com/docs/guides/storage
3. Vérifiez les politiques RLS dans Table Editor > beneficiary_notes > RLS
