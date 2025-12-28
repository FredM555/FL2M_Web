# 📱 Script de Compilation APK Android

Ce script automatise la compilation d'une APK Android optimisée pour votre application.

## 🚀 Utilisation

Pour compiler une nouvelle APK, lancez simplement :

```bash
npm run build:apk
```

## 📋 Ce que fait le script

Le script `build-apk.cjs` effectue automatiquement les étapes suivantes :

1. **📖 Lecture de la version** depuis `.env.local` (variable `VITE_APP_VERSION`)

2. **🧹 Nettoyage du dossier public :**
   - Supprime `public/images-backup/` (si présent)
   - Supprime les anciens APK dans `public/downloads/`
   - Crée le dossier `public/downloads/` si nécessaire

3. **🗑️ Nettoyage des builds précédents :**
   - Supprime le dossier `dist/`
   - Supprime les APK Android précédentes

4. **⚙️ Compilation Vite** en mode production avec optimisations

5. **🔄 Synchronisation Capacitor** avec le projet Android

6. **📦 Compilation APK Release** avec Gradle (version optimisée)

7. **📋 Copie de l'APK** vers `public/downloads/fl2m-app-v{VERSION}.apk`

8. **📊 Affichage du résumé** avec le nom et la taille de l'APK

## 🎯 Résultat

Après exécution réussie, vous trouverez votre APK dans :
```
public/downloads/fl2m-app-v{VERSION}.apk
```

Par exemple avec `VITE_APP_VERSION=1.0.1` :
```
public/downloads/fl2m-app-v1.0.1.apk
```

## 📝 Modifier la version

Pour changer la version de l'APK, modifiez la variable dans `.env.local` :

```env
VITE_APP_VERSION=1.0.2
```

Puis relancez `npm run build:apk`

## ✅ Optimisations incluses

L'APK générée inclut automatiquement toutes les optimisations :

- ✅ **Minification du code** (ProGuard)
- ✅ **Suppression des ressources inutilisées** (shrinkResources)
- ✅ **Splits APK par architecture** (APK universelle générée)
- ✅ **Code splitting intelligent** (Vite)
- ✅ **Images optimisées** (si compressées avec `compress-images.cjs`)
- ✅ **Version Android** synchronisée (1.0.1 dans `build.gradle`)

## 🛠️ Prérequis

- Node.js installé
- Android SDK et Gradle configurés
- Dépendances npm installées (`npm install`)

## ⚠️ En cas d'erreur

Si le script échoue, il s'arrêtera et affichera un message d'erreur en rouge.

Les causes communes :
- `.env.local` manquant ou sans `VITE_APP_VERSION`
- Gradle non configuré
- Erreurs de compilation TypeScript

## 📦 Taille attendue

Avec toutes les optimisations, l'APK devrait faire environ **35 MB** (ou moins si images WebP).
