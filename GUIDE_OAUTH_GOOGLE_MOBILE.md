# Guide de Configuration OAuth Google pour l'Application Mobile

## Problème résolu
Après la connexion Google, l'application ouvrait le site web au lieu de rester dans l'app mobile.

## Comment ça fonctionne (Android App Links)

**Flux de connexion Google sur mobile** :

1. 👤 Utilisateur clique sur "Se connecter avec Google" dans l'app
2. 🌐 Google OAuth redirige vers `https://www.fl2m.fr/auth/callback?token=...`
3. 📱 Android vérifie si une app peut gérer cette URL (via `assetlinks.json`)
4. ✅ Android trouve l'app FL2M et l'ouvre directement (pas de navigateur !)
5. 🔐 L'app reçoit le callback et finalise la connexion

**Fichiers clés** :
- `public/.well-known/assetlinks.json` → Prouve que FL2M.fr autorise l'app à gérer ses URLs
- `AndroidManifest.xml` → Déclare que l'app peut gérer `https://www.fl2m.fr/auth/callback`
- Custom scheme `fl2mapp://` → Fallback uniquement, **non utilisé par Google OAuth**

## Solution mise en place

### 1. Configuration Android App Links

✅ **Fichier `public/.well-known/assetlinks.json` créé**
- Ce fichier permet à Android de vérifier que l'application mobile peut gérer les URLs `https://www.fl2m.fr/auth/callback`
- SHA-256 Fingerprint du keystore : `1C:C3:94:DA:85:31:54:7D:6A:14:C3:A1:D8:4A:0C:8C:AE:FE:4A:9C:8C:B5:A9:53:DB:4C:10:BC:33:55:92:F7:12`

✅ **AndroidManifest.xml** (déjà configuré)
- Deep Links configurés pour capturer `https://www.fl2m.fr/auth/callback`
- Custom URL Scheme de fallback : `fl2mapp://auth/callback`

### 2. Correction de la barre système Android

✅ **Styles Android mis à jour**
- Fichier `android/app/src/main/res/values/styles.xml` : Ajout de propriétés pour permettre au contenu de dessiner sous la barre système
- Nouveau fichier `android/app/src/main/res/values-v29/styles.xml` : Configuration moderne pour Android 10+

## Étapes à suivre pour finaliser la configuration

### Étape 1 : Déployer le fichier assetlinks.json

1. Poussez les modifications vers GitHub :
   ```bash
   git add public/.well-known/assetlinks.json
   git commit -m "Add Android App Links configuration"
   git push
   ```

2. Attendez que Vercel déploie les changements

3. Vérifiez que le fichier est accessible :
   ```
   https://www.fl2m.fr/.well-known/assetlinks.json
   ```

### Étape 2 : Configurer Google OAuth Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

2. Sélectionnez votre projet FL2M

3. Cliquez sur le "Client ID OAuth 2.0" utilisé pour l'application

4. **Ajoutez les Origines JavaScript autorisées** :
   - ✅ `https://www.fl2m.fr` (déjà présent)
   - ✅ `http://localhost:5173` (déjà présent)
   - ✅ `https://phokxjbocljahmbdkrbs.supabase.co` (déjà présent)

5. **Vérifiez les URI de redirection autorisés** (déjà configurés, rien à ajouter) :
   - ✅ `http://localhost:5173/auth/callback`
   - ✅ `https://phokxjbocljahmbdkrbs.supabase.co/auth/v1/callback`
   - ✅ `https://www.fl2m.fr/auth/callback`

   **⚠️ IMPORTANT** : NE PAS ajouter `fl2mapp://auth/callback`
   - Google OAuth refuse les custom URL schemes
   - Le custom scheme est uniquement un fallback dans AndroidManifest
   - Android interceptera automatiquement `https://www.fl2m.fr/auth/callback` grâce à assetlinks.json

6. Aucune modification nécessaire si ces 3 URIs sont déjà configurés

⏱️ **Attention** : Les modifications peuvent prendre de 5 minutes à quelques heures pour être appliquées par Google

### Étape 3 : Rebuilder l'APK

1. Assurez-vous que tous les fichiers sont à jour :
   ```bash
   git pull
   ```

2. Buildez un nouveau APK :
   ```bash
   npm run build:apk
   ```

3. L'APK sera généré dans `android/app/build/outputs/apk/release/`

4. Copiez l'APK vers `public/downloads/` :
   ```bash
   cp android/app/build/outputs/apk/release/app-universal-release.apk public/downloads/fl2m-app-v1.0.2.apk
   ```

### Étape 4 : Tester la configuration

1. Installez le nouvel APK sur votre téléphone Android

2. Testez la connexion Google :
   - La barre système ne devrait plus se superposer avec le menu
   - Après la connexion Google, l'app devrait rester ouverte (pas de redirection vers le navigateur)

3. Vérifiez dans les logs Android (si nécessaire) :
   ```bash
   adb logcat | grep -i "fl2m\|oauth\|deeplink"
   ```

## Vérification de la configuration Android App Links

Google propose un outil de test :
```
https://search.google.com/test/app-indexing/check-url-support
```

Testez l'URL : `https://www.fl2m.fr/auth/callback`

## Troubleshooting

### Si la redirection vers le navigateur persiste :

1. **Vérifiez le fichier assetlinks.json** :
   - Accessible publiquement sur `https://www.fl2m.fr/.well-known/assetlinks.json`
   - Le SHA-256 fingerprint correspond au keystore utilisé pour signer l'APK

2. **Réinstallez l'application** :
   - Désinstallez complètement l'ancienne version
   - Réinstallez le nouvel APK

3. **Attendez la propagation Google OAuth** :
   - Les modifications dans Google Cloud Console peuvent prendre du temps

4. **Vérifiez les logs Android** :
   ```bash
   adb logcat | grep "AppLinkVerification"
   ```

### Si la barre système se superpose toujours :

1. Vérifiez que vous avez bien rebuilder l'APK après les modifications des styles
2. Assurez-vous que l'APK est signé avec le bon keystore
3. Testez sur un appareil avec Android 10+ pour bénéficier des nouvelles API

## Fichiers modifiés

- ✅ `android/app/src/main/res/values/styles.xml` - Styles pour Android < 10
- ✅ `android/app/src/main/res/values-v29/styles.xml` - Styles pour Android 10+
- ✅ `public/.well-known/assetlinks.json` - Configuration Android App Links

## Notes importantes

- Le fichier `assetlinks.json` DOIT être accessible publiquement via HTTPS
- Le SHA-256 fingerprint DOIT correspondre au keystore utilisé pour signer l'APK de production
- Les modifications Google OAuth peuvent prendre jusqu'à quelques heures pour être effectives
- Testez toujours sur un APK release signé, pas en mode debug
