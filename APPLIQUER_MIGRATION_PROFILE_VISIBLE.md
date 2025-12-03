# 🚀 Guide Rapide : Appliquer la Migration profile_visible

## Le Problème

Le bouton "Enregistrer" ne fonctionne pas quand vous modifiez l'interrupteur "Profil masqué" car le champ `profile_visible` n'existe pas encore dans la base de données.

## ✅ Solution : Appliquer la Migration SQL

### Étape 1 : Ouvrir le SQL Editor

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard/project/ynvvysmtvzgfdzakyqzf)
2. Dans le menu de gauche, cliquez sur "SQL Editor"

### Étape 2 : Créer une Nouvelle Requête

1. Cliquez sur le bouton "+ New Query"

### Étape 3 : Coller le Code SQL

Copiez-collez exactement ce code SQL :

```sql
-- =====================================================
-- Migration: Ajout du champ profile_visible
-- Description: Permet aux intervenants de contrôler la visibilité de leur profil public
-- Date: 2025-12-03
-- =====================================================

-- Ajouter le champ profile_visible
ALTER TABLE public.practitioners
ADD COLUMN IF NOT EXISTS profile_visible BOOLEAN NOT NULL DEFAULT true;

-- Commentaire
COMMENT ON COLUMN public.practitioners.profile_visible IS 'Contrôle si le profil de l''intervenant est visible publiquement dans la liste des intervenants';
```

### Étape 4 : Exécuter la Requête

1. Cliquez sur le bouton "Run" (ou appuyez sur Ctrl+Enter)
2. Vous devriez voir un message de succès : "Success. No rows returned"

### Étape 5 : Vérifier

Retournez sur votre application et testez à nouveau :
1. Allez sur "Mon Profil Intervenant" → "Mon Profil"
2. Changez l'interrupteur "Profil visible/masqué"
3. Cliquez sur "Enregistrer"
4. ✅ Le bouton devrait maintenant fonctionner !

## 🔍 Vérifier que la Migration a Réussi

Si vous voulez vérifier que le champ a bien été ajouté, exécutez cette requête dans le SQL Editor :

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'practitioners'
AND column_name = 'profile_visible';
```

Vous devriez voir :
- **column_name** : `profile_visible`
- **data_type** : `boolean`
- **column_default** : `true`

## 🎯 Valeurs par Défaut

- Tous les profils existants auront automatiquement `profile_visible = true`
- Les nouveaux profils auront aussi `profile_visible = true` par défaut
- Les intervenants peuvent ensuite modifier cette valeur via le formulaire

## ❓ En Cas de Problème

Si vous voyez une erreur comme :
```
column "profile_visible" of relation "practitioners" already exists
```

C'est normal ! Cela signifie que la colonne existe déjà. Le problème vient probablement d'autre chose.

Vérifiez alors :
1. Que vous avez bien rafraîchi la page de l'application
2. Que le code de `src/services/supabase.ts` a été mis à jour
3. Consultez la console du navigateur pour voir les erreurs détaillées

## 🔗 Fichiers Concernés

Cette migration affecte :
- **Base de données** : `practitioners.profile_visible` (nouveau champ)
- **Backend** : `src/services/supabase.ts` (fonction `updateMyPractitionerProfile`)
- **Frontend** : `src/components/practitioner/PractitionerProfileForm.tsx` (formulaire)

---

**Une fois la migration appliquée, tout devrait fonctionner correctement !** ✨
