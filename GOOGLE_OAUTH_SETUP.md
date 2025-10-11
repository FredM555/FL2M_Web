# Guide de Configuration OAuth Google pour FLM Services

Ce guide vous accompagne étape par étape pour configurer l'authentification Google OAuth dans votre application FLM Services.

## Prérequis

- Un compte Google (Gmail)
- Accès à votre projet Supabase (https://phokxjbocljahmbdkrbs.supabase.co)
- URL de production de votre application (une fois déployée)

---

## Partie 1 : Configuration Google Cloud Console

### Étape 1 : Créer un projet Google Cloud

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Cliquez sur le sélecteur de projet en haut (à côté de "Google Cloud")
3. Cliquez sur **"Nouveau projet"**
4. Remplissez les informations :
   - **Nom du projet** : `FLM Services` (ou le nom de votre choix)
   - **Organisation** : Laissez vide si vous n'en avez pas
5. Cliquez sur **"Créer"**
6. Attendez quelques secondes que le projet soit créé
7. Sélectionnez le projet nouvellement créé dans le sélecteur

### Étape 2 : Configurer l'écran de consentement OAuth

1. Dans le menu de navigation (☰), allez dans **"API et services" > "Écran de consentement OAuth"**
2. Sélectionnez le type d'utilisateur :
   - **Externe** : Si votre application sera accessible au public
   - **Interne** : Si vous utilisez Google Workspace et voulez restreindre aux utilisateurs de votre organisation

   ➡️ Pour FLM Services, choisissez **"Externe"**, puis cliquez sur **"Créer"**

3. **Page 1 : Informations sur l'application**
   - **Nom de l'application** : `FLM Services`
   - **E-mail d'assistance utilisateur** : Votre email professionnel
   - **Logo de l'application** : (Optionnel) Téléchargez votre logo (120x120 px minimum)
   - **Domaine de l'application** :
     - Page d'accueil : `https://votre-domaine.com` (ou laissez vide pour le moment)
   - **Domaines autorisés** :
     - Ajoutez : `supabase.co`
   - **Coordonnées du développeur** : Votre email
   - Cliquez sur **"Enregistrer et continuer"**

4. **Page 2 : Champs d'application (Scopes)**
   - Cliquez sur **"Ajouter ou supprimer des champs d'application"**
   - Cochez les scopes suivants :
     - ✅ `.../auth/userinfo.email` - Voir votre adresse e-mail
     - ✅ `.../auth/userinfo.profile` - Consulter vos informations personnelles
     - ✅ `openid` - Authentifier en utilisant OpenID Connect
   - Cliquez sur **"Mettre à jour"**
   - Cliquez sur **"Enregistrer et continuer"**

5. **Page 3 : Utilisateurs de test** (seulement si mode "Externe" non publié)
   - Ajoutez quelques adresses email de test pour tester l'OAuth avant la publication
   - Exemple : `votre.email@gmail.com`
   - Cliquez sur **"Enregistrer et continuer"**

6. **Page 4 : Résumé**
   - Vérifiez les informations
   - Cliquez sur **"Retour au tableau de bord"**

### Étape 3 : Créer les identifiants OAuth 2.0

1. Dans le menu, allez dans **"API et services" > "Identifiants"**
2. Cliquez sur **"+ Créer des identifiants"** en haut
3. Sélectionnez **"ID client OAuth"**
4. Configurez l'ID client :
   - **Type d'application** : `Application Web`
   - **Nom** : `FLM Services Web Client`

5. **Origines JavaScript autorisées** :
   Cliquez sur **"+ Ajouter un URI"** et ajoutez :
   ```
   https://phokxjbocljahmbdkrbs.supabase.co
   ```

   Si vous testez en local, ajoutez aussi :
   ```
   http://localhost:5173
   ```

6. **URI de redirection autorisés** :
   Cliquez sur **"+ Ajouter un URI"** et ajoutez :
   ```
   https://phokxjbocljahmbdkrbs.supabase.co/auth/v1/callback
   ```

7. Cliquez sur **"Créer"**

8. ⚠️ **IMPORTANT** : Une fenêtre s'ouvre avec vos identifiants :
   - **ID client** : Quelque chose comme `123456789-abc...xyz.apps.googleusercontent.com`
   - **Code secret du client** : Quelque chose comme `GOCSPX-...`

   📋 **COPIEZ CES DEUX VALEURS** - Vous en aurez besoin pour Supabase

---

## Partie 2 : Configuration Supabase

### Étape 1 : Activer le provider Google dans Supabase

1. Allez sur [Supabase Dashboard](https://app.supabase.com/)
2. Sélectionnez votre projet : `phokxjbocljahmbdkrbs`
3. Dans le menu de gauche, cliquez sur **"Authentication"**
4. Cliquez sur **"Providers"**
5. Trouvez **"Google"** dans la liste et cliquez dessus pour l'ouvrir

### Étape 2 : Configurer les paramètres Google

1. **Activer Google Provider** :
   - Basculez le switch **"Enable Sign in with Google"** sur ON

2. **Remplir les identifiants** :
   - **Client ID (for OAuth)** : Collez l'ID client copié depuis Google Cloud Console
   - **Client Secret (for OAuth)** : Collez le code secret copié depuis Google Cloud Console

3. **Configuration supplémentaire** (optionnelle mais recommandée) :
   - **Skip nonce check** : Laissez décoché (recommandé pour la sécurité)

4. Cliquez sur **"Save"** en bas de la page

### Étape 3 : Vérifier l'URL de callback Supabase

1. Toujours dans l'onglet **"Providers"**, en haut de la page, vous verrez :
   ```
   Callback URL (for OAuth)
   https://phokxjbocljahmbdkrbs.supabase.co/auth/v1/callback
   ```

2. ✅ Vérifiez que cette URL correspond exactement à celle configurée dans Google Cloud Console

---

## Partie 3 : Configuration de la base de données

### Créer un trigger pour auto-créer le profil lors de l'inscription OAuth

Lorsqu'un utilisateur se connecte via Google OAuth, Supabase crée automatiquement un compte dans `auth.users`, mais **PAS** dans votre table `profiles`. Vous devez créer un trigger pour ça.

1. Dans Supabase Dashboard, allez dans **"SQL Editor"**
2. Cliquez sur **"New query"**
3. Collez ce code :

```sql
-- Fonction pour créer automatiquement un profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, user_type, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    'client', -- Par défaut, les nouveaux utilisateurs sont des clients
    now(),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger qui s'exécute lors de la création d'un nouvel utilisateur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

4. Cliquez sur **"Run"** (ou Ctrl+Enter)
5. Vous devriez voir : ✅ **"Success. No rows returned"**

---

## Partie 4 : Test de l'intégration

### Test en local (développement)

1. Démarrez votre serveur de développement :
   ```bash
   npm run dev
   ```

2. Ouvrez votre navigateur sur `http://localhost:5173`

3. Allez sur la page de connexion : `http://localhost:5173/login`

4. Cliquez sur le bouton **"Continuer avec Google"**

5. **Que devrait-il se passer** :
   - Une fenêtre popup Google s'ouvre
   - Vous choisissez votre compte Google
   - Vous acceptez les permissions demandées
   - Vous êtes redirigé vers `/auth/callback`
   - Puis vers `/complete-profile` (si c'est votre première connexion)
   - Après avoir complété votre profil, vous êtes redirigé vers la page d'accueil

### Vérifier dans Supabase

1. Dans Supabase Dashboard, allez dans **"Authentication" > "Users"**
2. Vous devriez voir votre nouvel utilisateur avec :
   - Provider : `google`
   - Email : Votre email Google
   - Created at : Date de création

3. Allez dans **"Table Editor" > "profiles"**
4. Vous devriez voir un profil avec le même `id` que l'utilisateur

### Déboguer en cas de problème

#### Problème 1 : "Error 400: redirect_uri_mismatch"

❌ **Cause** : L'URI de redirection dans Google Cloud Console ne correspond pas

✅ **Solution** :
1. Retournez dans Google Cloud Console > Identifiants
2. Cliquez sur votre ID client OAuth
3. Vérifiez que les **URI de redirection autorisés** contiennent exactement :
   ```
   https://phokxjbocljahmbdkrbs.supabase.co/auth/v1/callback
   ```
4. Sauvegardez et réessayez

#### Problème 2 : L'utilisateur ne voit pas la page de complétion de profil

❌ **Cause** : Le trigger n'a pas créé le profil ou le profil a déjà un pseudo

✅ **Solution** :
1. Vérifiez que le trigger est bien créé (voir Partie 3)
2. Dans Supabase, allez dans Table Editor > profiles
3. Supprimez le profil de test et réessayez

#### Problème 3 : Erreur "Invalid login credentials"

❌ **Cause** : Client ID ou Client Secret incorrect dans Supabase

✅ **Solution** :
1. Vérifiez les identifiants dans Supabase Dashboard > Authentication > Providers > Google
2. Vérifiez qu'ils correspondent exactement à ceux de Google Cloud Console
3. Sauvegardez et réessayez

---

## Partie 5 : Déploiement en production

### Avant de déployer

1. **Mettez à jour l'URL de redirection dans Google Cloud Console** :
   - Ajoutez l'URL de production : `https://votre-domaine-prod.com`
   - Ajoutez l'URI de callback : `https://phokxjbocljahmbdkrbs.supabase.co/auth/v1/callback`

2. **Publiez votre écran de consentement** (si vous voulez que n'importe qui puisse se connecter) :
   - Dans Google Cloud Console > API et services > Écran de consentement OAuth
   - Cliquez sur **"Publier l'application"**
   - Suivez les instructions (Google peut demander une vérification pour certaines scopes)

3. **Mettez à jour vos variables d'environnement de production** :
   - Assurez-vous que `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont correctement configurés

---

## Partie 6 : Préparer pour Capacitor (Mobile)

Pour utiliser Google OAuth dans une application mobile avec Capacitor, quelques étapes supplémentaires sont nécessaires.

### Android

1. Dans Google Cloud Console, créez un **deuxième ID client OAuth** :
   - Type : **Android**
   - Nom : `FLM Services Android`
   - Package name : `com.flmservices.app` (à adapter selon votre package)
   - SHA-1 : Générez-le avec :
     ```bash
     keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```

2. Installez le plugin Capacitor pour Google Auth :
   ```bash
   npm install @codetrix-studio/capacitor-google-auth
   ```

3. Configurez le plugin dans `capacitor.config.ts` :
   ```typescript
   {
     plugins: {
       GoogleAuth: {
         scopes: ['profile', 'email'],
         serverClientId: 'VOTRE_CLIENT_ID_WEB.apps.googleusercontent.com',
         forceCodeForRefreshToken: true,
       }
     }
   }
   ```

### iOS (Apple)

1. Dans Google Cloud Console, créez un **ID client OAuth iOS** :
   - Type : **iOS**
   - Nom : `FLM Services iOS`
   - Bundle ID : `com.flmservices.app` (à adapter)

2. Installez les dépendances iOS :
   ```bash
   npx cap sync ios
   cd ios/App
   pod install
   ```

3. Configurez l'URL Scheme dans Xcode :
   - Ouvrez `ios/App/App.xcworkspace`
   - Dans Info.plist, ajoutez un URL Scheme avec votre CLIENT_ID inversé

---

## Récapitulatif des URLs importantes

| Environnement | URL de l'app | Callback URL Supabase |
|---------------|--------------|----------------------|
| **Développement** | http://localhost:5173 | https://phokxjbocljahmbdkrbs.supabase.co/auth/v1/callback |
| **Production** | https://votre-domaine.com | https://phokxjbocljahmbdkrbs.supabase.co/auth/v1/callback |
| **Android** | N/A (app native) | Custom URL Scheme |
| **iOS** | N/A (app native) | Custom URL Scheme |

---

## Checklist finale

Avant de considérer l'intégration Google OAuth comme terminée, vérifiez :

- [ ] Projet Google Cloud créé
- [ ] Écran de consentement OAuth configuré
- [ ] ID client OAuth créé avec les bonnes URIs
- [ ] Provider Google activé dans Supabase
- [ ] Client ID et Client Secret configurés dans Supabase
- [ ] Trigger de création de profil créé dans la base de données
- [ ] Test de connexion réussi en local
- [ ] Profil créé automatiquement dans la table `profiles`
- [ ] Page de complétion de profil fonctionnelle
- [ ] Redirection après OAuth fonctionnelle
- [ ] (Production) URLs de production ajoutées dans Google Cloud Console
- [ ] (Mobile) Configuration Capacitor effectuée si nécessaire

---

## Support

En cas de problème, vérifiez :

1. **Console navigateur (F12)** : Regardez les erreurs dans la console
2. **Network tab** : Vérifiez les requêtes HTTP et leurs réponses
3. **Supabase Logs** : Dashboard > Logs pour voir les erreurs serveur
4. **Google Cloud Console Logs** : APIs & Services > Credentials pour voir les tentatives de connexion

---

**Dernière mise à jour** : 11 octobre 2025
**Version de l'application** : 0.0.0
**Contact** : support@flmservices.com
