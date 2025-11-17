# 🔧 Fix : Profil non créé lors de la connexion OAuth (Google/Apple)

## 🐛 Problème identifié

Lorsqu'un utilisateur se connecte via "Continuer avec Google" ou Apple :
- ✅ L'utilisateur est bien authentifié dans Supabase (`auth.users`)
- ❌ **MAIS** aucun profil n'est créé dans la table `profiles`
- ❌ L'application ne fonctionne pas sans profil FL2M

## 🔍 Cause

Le trigger de création automatique du profil (`on_auth_user_created`) n'existe pas ou n'a pas été exécuté dans votre base de données Supabase.

## ✅ Solution

### Étape 1 : Exécuter la migration du trigger (CRITIQUE)

1. **Ouvrir le Dashboard Supabase**
   - Aller sur https://supabase.com/dashboard
   - Sélectionner votre projet

2. **Ouvrir le SQL Editor**
   - Cliquer sur "SQL Editor" dans le menu de gauche
   - Cliquer sur "New query"

3. **Copier/Coller le SQL suivant** :

```sql
-- =====================================================
-- Migration: Trigger de création automatique du profil
-- Description: Crée automatiquement un profil dans 'profiles'
--              lors de l'inscription (Email/Google/Apple)
-- =====================================================

-- SECTION 1: Fonction trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    user_type,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    'client',
    true,
    NOW(),
    NOW()
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Erreur création profil pour %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECTION 2: Créer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Vérification
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

4. **Cliquer sur "Run"** (ou Ctrl+Enter)

5. **Vérifier le résultat**
   - Vous devriez voir dans les résultats :
   ```
   trigger_name         | event_manipulation | event_object_table
   ---------------------|--------------------|-----------------
   on_auth_user_created | INSERT            | users
   ```

### Étape 2 : Corriger les utilisateurs existants (si nécessaire)

Si des utilisateurs se sont déjà connectés via OAuth avant cette migration, leurs profils n'existent pas. Pour les créer :

```sql
-- Créer les profils manquants pour les utilisateurs existants
INSERT INTO public.profiles (id, email, user_type, is_active, created_at, updated_at)
SELECT
  u.id,
  u.email,
  'client',
  true,
  u.created_at,
  NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Vérifier combien de profils ont été créés
SELECT COUNT(*) as profiles_crees
FROM public.profiles;
```

### Étape 3 : Vérifier que tout fonctionne

1. **Déconnecter tous les utilisateurs de test**

2. **Tester une nouvelle connexion OAuth** :
   - Aller sur la page de connexion
   - Cliquer sur "Continuer avec Google"
   - Se connecter avec un nouveau compte Google (ou un compte qui n'avait pas de profil)

3. **Vérifier dans Supabase** :
   - Table Editor → `profiles`
   - Vous devriez voir le nouveau profil créé automatiquement

4. **Compléter le profil** :
   - L'utilisateur doit être redirigé vers "Complétez votre profil"
   - Saisir le pseudo
   - Cliquer sur "Suivant"
   - Remplir les informations complémentaires (facultatif)
   - Cliquer sur "Terminer"

5. **Vérifier que le profil est sauvegardé** :
   - Rafraîchir la page
   - Le pseudo et les informations doivent être conservés

## 🔧 Modifications du code (déjà effectuées)

### 1. `ProfileCompletionPage.tsx`
- ✅ Utilise maintenant `updateProfile()` du contexte AuthContext
- ✅ Met à jour à la fois la BDD et le contexte React

### 2. `AuthContext.tsx`
- ✅ Fonction `updateProfile()` améliorée
- ✅ Récupère les données mises à jour depuis la BDD avec `.select().single()`
- ✅ Gère le cas où le profil n'existe pas encore dans le contexte

### 3. Nouvelle migration
- ✅ `20250116_create_profile_trigger.sql` créé
- ✅ `ORDRE_MIGRATIONS.md` mis à jour

## 📋 Checklist de vérification

- [ ] Migration du trigger exécutée sur Supabase
- [ ] Trigger visible dans `information_schema.triggers`
- [ ] Profils créés pour les utilisateurs existants (si nécessaire)
- [ ] Test de connexion OAuth réussie
- [ ] Page "Complétez votre profil" s'affiche
- [ ] Pseudo sauvegardé correctement
- [ ] Bouton "Suivant" fonctionne
- [ ] Informations conservées après rafraîchissement

## 🆘 En cas de problème

### Le trigger ne se crée pas
**Erreur** : "permission denied"
**Solution** : Vérifier que vous êtes bien admin du projet Supabase

### Les profils ne se créent toujours pas
**Vérifier** :
```sql
-- Le trigger existe ?
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- La fonction existe ?
SELECT * FROM information_schema.routines
WHERE routine_name = 'handle_new_user';
```

### Le pseudo n'est pas sauvegardé
**Console du navigateur** : Ouvrir DevTools (F12) → Console
- Rechercher les logs `[UPDATE_PROFILE]`
- Vérifier s'il y a des erreurs

**Supabase** : Vérifier les politiques RLS sur la table `profiles`
```sql
-- Les utilisateurs peuvent-ils mettre à jour leur profil ?
SELECT * FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'UPDATE';
```

---

**Date de création** : 16 novembre 2025
**Fichier de migration** : `supabase/migrations/20250116_create_profile_trigger.sql`
