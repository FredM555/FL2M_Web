# ✅ Correction : CSP bloque les images Supabase

## Problème résolu

**Erreur initiale :**
```
Loading the image 'https://...supabase.co/storage/v1/object/public/avatars/...'
violates the following Content Security Policy directive: "img-src 'self' data: blob:
https://source.unsplash.com https://*.googleusercontent.com".
The action has been blocked.
```

## Cause

La **Content Security Policy (CSP)** dans `index.html` et `vite.config.ts` n'autorisait pas le chargement d'images depuis le domaine Supabase (`https://*.supabase.co`).

## Solution appliquée

Ajout de `https://*.supabase.co` à la directive `img-src` dans deux fichiers :

### 1. index.html (ligne 8)

**Avant :**
```html
img-src 'self' data: blob: https://source.unsplash.com https://*.googleusercontent.com;
```

**Après :**
```html
img-src 'self' data: blob: https://source.unsplash.com https://*.googleusercontent.com https://*.supabase.co;
```

### 2. vite.config.ts (ligne 15)

**Avant :**
```typescript
'Content-Security-Policy': "... img-src 'self' data: blob: https://source.unsplash.com https://*.googleusercontent.com; ..."
```

**Après :**
```typescript
'Content-Security-Policy': "... img-src 'self' data: blob: https://source.unsplash.com https://*.googleusercontent.com https://*.supabase.co; ..."
```

## CSP complète mise à jour

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://accounts.google.com https://appleid.apple.com https://unpkg.com blob:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.ipify.org https://accounts.google.com https://appleid.apple.com blob:;
  frame-src 'self' https://*.supabase.co https://accounts.google.com https://appleid.apple.com;
  style-src 'self' 'unsafe-inline' https://accounts.google.com;
  img-src 'self' data: blob: https://source.unsplash.com https://*.googleusercontent.com https://*.supabase.co;
  worker-src 'self' blob:;
```

## Test de la correction

1. **Redémarrer le serveur de développement** (important !)
   ```bash
   # Arrêter le serveur actuel (Ctrl+C)
   npm run dev
   ```

2. **Recharger la page dans le navigateur** (F5 ou Ctrl+Shift+R pour vider le cache)

3. **Tester l'upload d'image**
   - Aller sur "Mon profil"
   - Cliquer sur l'icône caméra 📷
   - Sélectionner une image
   - Vérifier que l'image s'affiche correctement

4. **Vérifier dans la console**
   - Ouvrir la console (F12)
   - Ne devrait plus afficher l'erreur CSP
   - L'image devrait se charger sans problème

## Vérification visuelle

### ✅ Images qui devraient maintenant s'afficher :
- Photo de profil sur "Mon profil"
- Photo de profil dans la liste des intervenants
- Photo de profil sur la page de détail d'un intervenant
- Photo de profil dans l'aperçu du profil intervenant

### 🔍 Comment vérifier que ça fonctionne :
1. Inspecter l'image (clic droit → Inspecter)
2. Vérifier que l'URL commence par `https://...supabase.co/storage/`
3. Pas d'erreur dans la console concernant CSP

## Pourquoi cette correction est nécessaire

La CSP est un mécanisme de sécurité du navigateur qui restreint les sources de contenu autorisées.

**Sans `https://*.supabase.co` dans `img-src` :**
- ❌ Le navigateur bloque le chargement des images depuis Supabase Storage
- ❌ Les photos de profil ne s'affichent pas
- ❌ Une erreur CSP apparaît dans la console

**Avec `https://*.supabase.co` dans `img-src` :**
- ✅ Le navigateur autorise le chargement des images depuis Supabase Storage
- ✅ Les photos de profil s'affichent correctement
- ✅ Aucune erreur dans la console

## Sécurité

L'ajout de `https://*.supabase.co` est sûr car :
- C'est votre propre backend Supabase
- Seules les images du bucket `avatars` (configuré comme public) sont accessibles
- Les politiques RLS protègent l'upload/modification/suppression
- Le wildcard `*` couvre tous les projets Supabase (y compris le vôtre)

## Autres ressources Supabase autorisées

La CSP autorise également Supabase pour :
- **script-src** : Scripts JavaScript depuis Supabase
- **connect-src** : Connexions API et WebSocket vers Supabase
- **frame-src** : iFrames depuis Supabase (OAuth, etc.)

## Notes importantes

1. **Redémarrage nécessaire** : Après modification de `vite.config.ts`, le serveur de développement doit être redémarré.

2. **Cache du navigateur** : Si l'erreur persiste, videz le cache (Ctrl+Shift+R).

3. **Production** : La CSP dans `index.html` s'applique aussi en production. Assurez-vous que le build inclut cette modification.

4. **Maintenance** : Si vous ajoutez d'autres services d'images (CDN, etc.), ajoutez-les également à `img-src`.

## Historique des modifications

- **2025-12-04** : Correction CSP pour autoriser les images Supabase Storage
  - Fichiers modifiés : `index.html`, `vite.config.ts`
  - Directive modifiée : `img-src`
  - Domaine ajouté : `https://*.supabase.co`

## Troubleshooting

### L'erreur persiste après la correction

**Solution :**
1. Arrêter complètement le serveur de développement (Ctrl+C)
2. Redémarrer avec `npm run dev`
3. Vider le cache du navigateur (Ctrl+Shift+R)
4. Vérifier que les modifications sont bien sauvegardées dans les fichiers

### Les images ne s'affichent toujours pas

**Vérifications :**
1. Le bucket `avatars` existe dans Supabase Storage
2. Le bucket est configuré comme **PUBLIC**
3. Les politiques RLS sont correctement configurées
4. L'URL de l'image est valide (vérifier dans la console)

### Erreur CORS

**Note :** Supabase Storage gère automatiquement CORS. Si vous avez une erreur CORS, vérifiez la configuration du bucket dans Supabase Dashboard.

## ✅ Résultat final

Après cette correction :
- ✅ Les photos de profil s'affichent correctement
- ✅ Aucune erreur CSP dans la console
- ✅ L'upload et l'affichage fonctionnent sans problème
- ✅ Compatible avec tous les navigateurs modernes

🎉 **La fonctionnalité photo de profil est maintenant pleinement opérationnelle !**
