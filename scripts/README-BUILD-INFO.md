# Build Info System

## Vue d'ensemble

Le système de build info génère automatiquement un fichier `build-info.json` contenant les informations de version à chaque build. Ces informations sont affichées de manière discrète dans le footer du site.

## Informations affichées

Le footer affiche :
- **Version** : Numéro de version du package (depuis `package.json`)
- **Commit** : Hash court du dernier commit Git
- **Date/Heure** : Date et heure du build au format français

**Exemple d'affichage** : `v1.0.2 • 45cf399 • 07/01/2026 21:13`

## Comment ça fonctionne

### 1. Génération automatique

Le script `generate-build-info.cjs` est automatiquement exécuté avant chaque build grâce au hook npm `prebuild` :

```bash
npm run build  # Exécute automatiquement prebuild puis build
```

### 2. Script generate-build-info.cjs

Ce script :
- Récupère le hash du commit courant (`git rev-parse --short HEAD`)
- Récupère la branche courante (`git rev-parse --abbrev-ref HEAD`)
- Récupère la date du dernier commit
- Génère la date/heure actuelle du build
- Lit la version depuis `package.json`
- Écrit tout dans `public/build-info.json`

### 3. Affichage dans le footer

Le composant `MainLayout` :
- Charge le fichier `/build-info.json` au montage
- Affiche les informations en bas du footer
- Style discret : police monospace, opacité 30%

## Commandes

```bash
# Génération manuelle
npm run generate-build-info

# Build complet (avec génération automatique)
npm run build
```

## Fichiers

- **Script** : `scripts/generate-build-info.cjs`
- **Sortie** : `public/build-info.json` (généré, ignoré par git)
- **Type** : `src/types/build-info.ts`
- **Affichage** : `src/components/layout/MainLayout.tsx`

## Structure du build-info.json

```json
{
  "commitHash": "45cf399",
  "branch": "master",
  "commitDate": "2026-01-07 20:45:51 +0100",
  "buildDate": "2026-01-07T20:13:03.226Z",
  "version": "1.0.2"
}
```

## Avantages

✅ Permet d'identifier rapidement quelle version est déployée en production
✅ Utile pour le debugging (savoir exactement quel commit est en prod)
✅ Discret et non intrusif
✅ Automatique, aucune intervention manuelle nécessaire
✅ Fonctionne en local et en production (Vercel)

## Notes

- Le fichier `build-info.json` n'est pas versionné (dans `.gitignore`)
- En cas d'erreur Git (ex: pas de repo), un fichier par défaut est créé
- La version provient du champ `version` dans `package.json`
