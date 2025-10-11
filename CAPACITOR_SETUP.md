# Guide de Préparation Capacitor pour Application Mobile

Ce guide vous prépare à transformer votre application web FLM Services en application mobile native (iOS et Android) avec Capacitor.

---

## Qu'est-ce que Capacitor ?

Capacitor est un runtime natif qui permet de transformer une application web (React, Vue, Angular, etc.) en application mobile native pour iOS et Android, tout en conservant votre code JavaScript/TypeScript.

**Avantages** :
- ✅ Un seul codebase pour web + iOS + Android
- ✅ Accès aux APIs natives (caméra, GPS, notifications push, etc.)
- ✅ Performance proche du natif
- ✅ Compatible avec tous les plugins Cordova
- ✅ Développé et maintenu par l'équipe Ionic

---

## Prérequis

### Pour le développement général

- ✅ Node.js 16+ installé
- ✅ Votre projet React/Vite fonctionnel
- ✅ Compte développeur Apple (pour iOS) - 99$/an
- ✅ Compte développeur Google Play (pour Android) - 25$ une fois

### Pour le développement iOS

- ✅ **macOS** (obligatoire pour compiler iOS)
- ✅ **Xcode** 14+ (gratuit sur Mac App Store)
- ✅ **CocoaPods** (installé via `sudo gem install cocoapods`)
- ✅ Simulateur iOS (inclus avec Xcode)
- ✅ iPhone/iPad physique pour les tests (optionnel mais recommandé)

### Pour le développement Android

- ✅ **Android Studio** (macOS, Windows, ou Linux)
- ✅ **Java JDK** 11 ou 17
- ✅ **Android SDK** (installé via Android Studio)
- ✅ Émulateur Android (via Android Studio)
- ✅ Téléphone Android physique pour les tests (optionnel)

---

## Partie 1 : Installation et Configuration Capacitor

### Étape 1 : Installer Capacitor

```bash
# Dans le dossier de votre projet
cd flm-services-new

# Installer Capacitor CLI et Core
npm install @capacitor/core @capacitor/cli

# Installer les plateformes iOS et Android
npm install @capacitor/ios @capacitor/android
```

### Étape 2 : Initialiser Capacitor

```bash
# Initialiser Capacitor dans le projet
npx cap init
```

Répondez aux questions :
- **App name** : `FLM Services` (nom affiché sous l'icône)
- **App ID** : `com.flmservices.app` (identifiant unique, format reverse domain)
- **Web asset directory** : `dist` (dossier de build Vite)

Cela crée un fichier `capacitor.config.ts` :

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flmservices.app',
  appName: 'FLM Services',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
```

### Étape 3 : Build de l'application web

Avant d'ajouter les plateformes, vous devez compiler votre application web :

```bash
npm run build
```

Cela crée le dossier `dist/` avec les fichiers optimisés.

### Étape 4 : Ajouter les plateformes

```bash
# Ajouter iOS (macOS uniquement)
npx cap add ios

# Ajouter Android (tous les OS)
npx cap add android
```

Cela crée deux nouveaux dossiers :
- `ios/` - Projet Xcode
- `android/` - Projet Android Studio

---

## Partie 2 : Adaptations du Code pour Mobile

### 1. Installer les plugins Capacitor essentiels

```bash
# Plugin pour obtenir des informations sur l'appareil
npm install @capacitor/device

# Plugin pour les notifications push
npm install @capacitor/push-notifications

# Plugin pour le stockage sécurisé
npm install @capacitor/preferences

# Plugin pour la caméra (si besoin)
npm install @capacitor/camera

# Plugin pour la géolocalisation (si besoin)
npm install @capacitor/geolocation

# Plugin pour le partage
npm install @capacitor/share

# Plugin pour ouvrir des URLs
npm install @capacitor/browser

# Plugin pour le status bar et splash screen
npm install @capacitor/status-bar @capacitor/splash-screen
```

### 2. Adapter le fichier `capacitor.config.ts`

Ajoutez des configurations avancées :

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flmservices.app',
  appName: 'FLM Services',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Pour le développement : pointer vers votre serveur local
    // url: 'http://192.168.1.100:5173', // IP locale de votre machine
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
```

### 3. Créer un hook pour détecter si on est sur mobile

Créez `src/hooks/usePlatform.ts` :

```typescript
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export const usePlatform = () => {
  const [platform, setPlatform] = useState({
    isNative: Capacitor.isNativePlatform(),
    isIOS: Capacitor.getPlatform() === 'ios',
    isAndroid: Capacitor.getPlatform() === 'android',
    isWeb: Capacitor.getPlatform() === 'web',
    platform: Capacitor.getPlatform(),
  });

  return platform;
};
```

Utilisez-le dans vos composants :

```typescript
import { usePlatform } from '../hooks/usePlatform';

function MyComponent() {
  const { isNative, isIOS, isAndroid } = usePlatform();

  if (isNative) {
    // Code spécifique mobile
  }

  if (isIOS) {
    // Code spécifique iOS
  }

  if (isAndroid) {
    // Code spécifique Android
  }
}
```

### 4. Adapter OAuth pour le mobile

Pour Google OAuth sur mobile, vous devrez utiliser un plugin spécifique :

```bash
npm install @codetrix-studio/capacitor-google-auth
```

Mettez à jour `capacitor.config.ts` :

```typescript
plugins: {
  GoogleAuth: {
    scopes: ['profile', 'email'],
    serverClientId: 'VOTRE_CLIENT_ID_WEB.apps.googleusercontent.com',
    forceCodeForRefreshToken: true,
  },
}
```

Adaptez `AuthContext.tsx` pour détecter si on est sur mobile :

```typescript
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

const signInWithGoogle = async () => {
  if (Capacitor.isNativePlatform()) {
    // Connexion Google native
    try {
      const googleUser = await GoogleAuth.signIn();
      // Utiliser googleUser.authentication.idToken pour se connecter à Supabase
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: googleUser.authentication.idToken,
      });

      if (error) throw error;
    } catch (err) {
      console.error('Erreur Google Sign In:', err);
    }
  } else {
    // Connexion Google OAuth web (code existant)
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }
};
```

### 5. Gérer le Safe Area (encoche iPhone)

Installez le plugin Safe Area :

```bash
npm install capacitor-plugin-safe-area
```

Ajoutez des styles pour gérer la safe area dans votre CSS global :

```css
/* src/index.css */

/* Variables CSS pour la safe area */
:root {
  --safe-area-inset-top: env(safe-area-inset-top);
  --safe-area-inset-right: env(safe-area-inset-right);
  --safe-area-inset-bottom: env(safe-area-inset-bottom);
  --safe-area-inset-left: env(safe-area-inset-left);
}

/* Appliquer le padding pour éviter l'encoche */
.safe-area-top {
  padding-top: var(--safe-area-inset-top);
}

.safe-area-bottom {
  padding-bottom: var(--safe-area-inset-bottom);
}
```

---

## Partie 3 : Configuration iOS

### Prérequis

1. Installer Xcode depuis le Mac App Store
2. Installer CocoaPods :
   ```bash
   sudo gem install cocoapods
   ```

### Étapes de configuration

1. **Ouvrir le projet dans Xcode** :
   ```bash
   npx cap open ios
   ```

2. **Configurer l'identifiant et le profil de provisioning** :
   - Dans Xcode, sélectionnez le projet `App` dans le navigateur
   - Onglet "Signing & Capabilities"
   - Cochez "Automatically manage signing"
   - Sélectionnez votre équipe (compte développeur Apple)
   - Changez le Bundle Identifier si nécessaire : `com.flmservices.app`

3. **Ajouter les permissions dans Info.plist** :
   - Ouvrez `ios/App/App/Info.plist`
   - Ajoutez les permissions nécessaires :

   ```xml
   <key>NSCameraUsageDescription</key>
   <string>L'application a besoin d'accéder à votre caméra pour prendre des photos.</string>

   <key>NSPhotoLibraryUsageDescription</key>
   <string>L'application a besoin d'accéder à vos photos.</string>

   <key>NSLocationWhenInUseUsageDescription</key>
   <string>L'application a besoin d'accéder à votre localisation.</string>
   ```

4. **Lancer sur simulateur** :
   - Dans Xcode, sélectionnez un simulateur (iPhone 14 Pro, etc.)
   - Cliquez sur le bouton Play ▶️

5. **Lancer sur appareil physique** :
   - Connectez votre iPhone via USB
   - Sélectionnez votre iPhone dans Xcode
   - Cliquez sur Play ▶️
   - Sur l'iPhone, allez dans Réglages > Général > Gestion de l'appareil > Faites confiance à l'app

### Mettre à jour l'app après modifications

```bash
# Rebuild web
npm run build

# Sync avec iOS
npx cap sync ios

# Ouvrir Xcode
npx cap open ios
```

---

## Partie 4 : Configuration Android

### Prérequis

1. Installer Android Studio
2. Installer Java JDK 11 ou 17
3. Configurer les variables d'environnement :
   ```bash
   # Dans ~/.bashrc ou ~/.zshrc
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

### Étapes de configuration

1. **Ouvrir le projet dans Android Studio** :
   ```bash
   npx cap open android
   ```

2. **Configurer le package** :
   - Dans Android Studio, ouvrez `android/app/src/main/AndroidManifest.xml`
   - Vérifiez le package : `com.flmservices.app`

3. **Ajouter les permissions dans AndroidManifest.xml** :
   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   <uses-permission android:name="android.permission.CAMERA" />
   <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
   <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
   <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
   ```

4. **Lancer sur émulateur** :
   - Dans Android Studio, cliquez sur Device Manager
   - Créez un nouvel émulateur (Pixel 6, etc.)
   - Cliquez sur Play ▶️

5. **Lancer sur appareil physique** :
   - Sur le téléphone Android :
     - Allez dans Paramètres > À propos du téléphone
     - Appuyez 7 fois sur "Numéro de build" pour activer le mode développeur
     - Retournez dans Paramètres > Options développeur
     - Activez "Débogage USB"
   - Connectez le téléphone via USB
   - Dans Android Studio, sélectionnez votre appareil
   - Cliquez sur Run ▶️

### Mettre à jour l'app après modifications

```bash
# Rebuild web
npm run build

# Sync avec Android
npx cap sync android

# Ouvrir Android Studio
npx cap open android
```

---

## Partie 5 : Build de Production

### iOS (Distribution App Store)

1. **Créer un certificat de distribution** :
   - Allez sur [Apple Developer](https://developer.apple.com/)
   - Créez un certificat de distribution
   - Créez un profil de provisioning de distribution

2. **Archiver l'app** :
   - Dans Xcode, sélectionnez "Any iOS Device (arm64)"
   - Menu : Product > Archive
   - Une fois archivé, cliquez sur "Distribute App"
   - Choisissez "App Store Connect"
   - Suivez les étapes

3. **Soumettre à l'App Store** :
   - Allez sur [App Store Connect](https://appstoreconnect.apple.com/)
   - Créez une nouvelle app
   - Remplissez les informations (screenshots, description, etc.)
   - Soumettez pour review

### Android (Distribution Play Store)

1. **Créer une clé de signature** :
   ```bash
   cd android/app
   keytool -genkey -v -keystore flm-services-release.keystore -alias flm-services -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configurer Gradle pour signer l'APK** :
   - Éditez `android/app/build.gradle`
   - Ajoutez la configuration de signature

3. **Générer l'APK de release** :
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

4. **Soumettre au Play Store** :
   - Allez sur [Google Play Console](https://play.google.com/console/)
   - Créez une nouvelle application
   - Téléchargez l'APK
   - Remplissez les informations
   - Soumettez pour review

---

## Partie 6 : Tests et Débogage

### Déboguer sur iOS

```bash
# Voir les logs en temps réel
npx cap run ios
```

Dans Xcode, ouvrez la console (View > Debug Area > Activate Console)

### Déboguer sur Android

```bash
# Voir les logs en temps réel
npx cap run android
```

Dans Android Studio, ouvrez Logcat (View > Tool Windows > Logcat)

### Remote Debugging (Chrome DevTools)

Pour Android :
1. Ouvrez Chrome sur votre ordinateur
2. Allez sur `chrome://inspect`
3. Votre app apparaîtra dans la liste
4. Cliquez sur "Inspect" pour ouvrir DevTools

Pour iOS (Safari) :
1. Sur iPhone : Réglages > Safari > Avancé > Inspecteur Web (activé)
2. Sur Mac : Safari > Préférences > Avancées > Afficher le menu Développement
3. Safari > Développement > [Votre iPhone] > [Votre App]

---

## Checklist de Migration vers Capacitor

- [ ] Capacitor CLI installé
- [ ] Capacitor initialisé avec `npx cap init`
- [ ] Plateformes iOS et Android ajoutées
- [ ] Plugins essentiels installés
- [ ] Code adapté pour détecter la plateforme
- [ ] OAuth adapté pour le mobile
- [ ] Safe area gérée pour iOS
- [ ] Permissions configurées (iOS et Android)
- [ ] Tests sur simulateur iOS réussis
- [ ] Tests sur émulateur Android réussis
- [ ] Tests sur appareil physique iOS réussis
- [ ] Tests sur appareil physique Android réussis
- [ ] Build de production iOS testé
- [ ] Build de production Android testé
- [ ] Soumission App Store préparée
- [ ] Soumission Play Store préparée

---

**Dernière mise à jour** : 11 octobre 2025
**Version** : 1.0.0
**Contact** : support@flmservices.com
