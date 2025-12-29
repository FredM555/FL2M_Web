# Guide de Gestion des Versions - FL²M

## 📍 OÙ MODIFIER LA VERSION ?

### ⚠️ UN SEUL FICHIER À MODIFIER

**Fichier :** `android/app/build.gradle`

```gradle
defaultConfig {
    applicationId "com.FlmServices.app"
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 1        ← À INCRÉMENTER (+1 à chaque mise à jour)
    versionName "1.0.1"  ← Version affichée aux utilisateurs
    ...
}
```

---

## 🔢 COMPRENDRE LES DEUX NUMÉROS DE VERSION

### 1️⃣ versionCode (Obligatoire pour Play Store)

**C'est quoi ?** Un nombre entier qui identifie la version de manière unique.

**Règles STRICTES :**
- ✅ **TOUJOURS croissant** : chaque nouvelle version DOIT avoir un versionCode supérieur à la précédente
- ✅ **Jamais de retour en arrière** : vous ne pouvez PAS réutiliser un versionCode déjà utilisé
- ✅ **Obligatoire pour Play Store** : Google refuse si le versionCode n'est pas supérieur

**Exemples :**
```
Version initiale → versionCode 1
Première mise à jour → versionCode 2
Deuxième mise à jour → versionCode 3
...
```

**Incrémenter de combien ?**
- Petite correction de bug : +1
- Nouvelle fonctionnalité : +1
- Grosse mise à jour : +1 (ou +10 si vous voulez organiser vos versions)

**❌ ERREUR FRÉQUENTE :**
```
Vous uploadez versionCode 2
Puis vous essayez versionCode 1 ou 2 → REJETÉ par Google Play
```

### 2️⃣ versionName (Affiché aux utilisateurs)

**C'est quoi ?** Une chaîne de texte lisible par les humains (ex: "1.0.1", "2.5.0")

**Format recommandé :** [MAJEURE].[MINEURE].[PATCH]
- **MAJEURE** : Changements importants, incompatibilités
- **MINEURE** : Nouvelles fonctionnalités, ajouts
- **PATCH** : Corrections de bugs

**Exemples :**
```
"1.0.0" → Version initiale
"1.0.1" → Correction d'un bug
"1.1.0" → Ajout de nouvelles fonctionnalités
"2.0.0" → Refonte majeure de l'application
```

**Note :** Ce numéro est UNIQUEMENT pour l'affichage. Google Play ne le valide pas.

---

## 📝 EXEMPLE PRATIQUE : PUBLIER UNE NOUVELLE VERSION

### Scénario : Vous voulez publier la version avec publicités AdMob

**Version actuelle sur Play Store :** 1.0.1 (versionCode: 1)
**Nouvelle version à publier :** 1.1.0 avec publicités (versionCode: 2)

### ÉTAPE 1 : Modifier `android/app/build.gradle`

**AVANT :**
```gradle
defaultConfig {
    versionCode 1
    versionName "1.0.1"
}
```

**APRÈS :**
```gradle
defaultConfig {
    versionCode 2         ← Incrémenté de 1
    versionName "1.1.0"   ← Nouvelle version mineure (publicités)
}
```

### ÉTAPE 2 : Générer le nouvel AAB

```bash
npm run build:aab
```

Le script va automatiquement :
1. Lire la version depuis `build.gradle`
2. Générer `fl2m-app-v1.1.0.aab`
3. Afficher la version dans la console

**Output attendu :**
```
📱 Building version: 1.1.0 (code: 2)
...
🎉 SUCCESS!
📦 File: public/downloads/fl2m-app-v1.1.0.aab
📱 Version: 1.1.0 (versionCode: 2)
```

### ÉTAPE 3 : Upload sur Play Console

1. Aller sur https://play.google.com/console
2. Production → Créer une version
3. Upload `fl2m-app-v1.1.0.aab`
4. Google valide que versionCode 2 > versionCode 1 ✅
5. Remplir les notes de version

---

## 🗓️ TABLEAU DE SUIVI DES VERSIONS

Créez ce tableau pour suivre vos versions :

| versionCode | versionName | Date | Description | Status |
|-------------|-------------|------|-------------|--------|
| 1 | 1.0.1 | 2025-12-29 | Version initiale | ✅ En production |
| 2 | 1.1.0 | À venir | Ajout publicités AdMob | 🔜 En préparation |
| 3 | 1.1.1 | - | - | - |

---

## 🔄 SCÉNARIOS COURANTS

### ✅ Scénario 1 : Correction d'un bug

**Changement :**
```gradle
versionCode 2    → 3    (+1)
versionName "1.1.0" → "1.1.1"  (PATCH)
```

**Commande :**
```bash
npm run build:aab
```

---

### ✅ Scénario 2 : Nouvelle fonctionnalité

**Changement :**
```gradle
versionCode 3    → 4    (+1)
versionName "1.1.1" → "1.2.0"  (MINEURE)
```

**Commande :**
```bash
npm run build:aab
```

---

### ✅ Scénario 3 : Refonte majeure

**Changement :**
```gradle
versionCode 4    → 5    (+1)
versionName "1.2.0" → "2.0.0"  (MAJEURE)
```

**Commande :**
```bash
npm run build:aab
```

---

## ❌ ERREURS À ÉVITER

### ❌ ERREUR 1 : Oublier d'incrémenter versionCode

```gradle
// Version actuelle sur Play Store
versionCode 2
versionName "1.1.0"

// Vous modifiez UNIQUEMENT versionName
versionCode 2         ← ❌ ERREUR : identique !
versionName "1.2.0"
```

**Résultat :** Google Play REJETTE l'upload
**Message :** "Version code 2 has already been used"

**✅ CORRECTION :**
```gradle
versionCode 3         ← Toujours incrémenter !
versionName "1.2.0"
```

---

### ❌ ERREUR 2 : Réutiliser un ancien versionCode

```
Version publiée : versionCode 5
Vous essayez : versionCode 3 → ❌ REJETÉ
```

**Solution :** Toujours avancer, jamais reculer. Utilisez versionCode 6.

---

### ❌ ERREUR 3 : Sauter des versionCode

**Est-ce grave ?** NON, c'est permis !

```
versionCode 1 → 5 → 10 → 100   ✅ AUTORISÉ
```

Tant que c'est croissant, Google accepte.

---

## 🛠️ COMMANDES UTILES

### Voir la version actuelle

```bash
# Lire directement dans build.gradle
cat android/app/build.gradle | grep "versionCode\|versionName"
```

**Output :**
```
versionCode 1
versionName "1.0.1"
```

### Tester le script AAB (sans build complet)

Le script `build-aab.cjs` affiche toujours la version au début :
```bash
npm run build:aab
```

**Output immédiat :**
```
📱 Building version: 1.0.1 (code: 1)
```

---

## 📌 CHECKLIST AVANT CHAQUE PUBLICATION

- [ ] Modifier `versionCode` dans `android/app/build.gradle` (+1 minimum)
- [ ] Modifier `versionName` dans `android/app/build.gradle`
- [ ] Lancer `npm run build:aab`
- [ ] Vérifier que le fichier AAB est généré avec le bon nom
- [ ] Vérifier que versionCode affiché > versionCode sur Play Store
- [ ] Préparer les notes de version pour Play Console
- [ ] Upload sur Play Console
- [ ] Noter la nouvelle version dans votre tableau de suivi

---

## 🎯 RÉSUMÉ EN 3 POINTS

1. **UN SEUL FICHIER à modifier :** `android/app/build.gradle`

2. **DEUX VALEURS à incrémenter :**
   - `versionCode` : +1 à chaque fois (obligatoire)
   - `versionName` : Version lisible (1.0.1 → 1.1.0)

3. **UNE SEULE COMMANDE :**
   ```bash
   npm run build:aab
   ```

   Le script lit automatiquement la version et génère le bon fichier.

---

## 🆘 EN CAS DE PROBLÈME

### "Version code X has already been used"
→ Incrémentez versionCode dans `build.gradle`

### "Upload failed"
→ Vérifiez que versionCode > version actuelle sur Play Store

### "Le fichier AAB a le mauvais nom"
→ Normal ! Le script le renomme automatiquement selon `versionName`

---

**Bon courage pour vos mises à jour ! 🚀**
