# Guide de Publication sur Google Play Store - FL²M

## ✅ ÉTAPES DÉJÀ COMPLÉTÉES

### 1. Configuration Technique
- ✅ Keystore de release généré (`android/app/fl2m-release-key.keystore`)
- ✅ Configuration de signature dans `build.gradle`
- ✅ Script de build AAB créé (`npm run build:aab`)
- ✅ AAB signé généré (`public/downloads/fl2m-app-v1.0.1.aab`)
- ✅ Icônes de l'application disponibles (toutes résolutions)

### 2. Informations de l'Application
- **App ID:** `com.FlmServices.app`
- **Nom:** FL²M
- **Version:** 1.0.1 (versionCode: 1)
- **SDK Min:** Android 6.0+ (API 23)
- **SDK Cible:** Android 15 (API 35)
- **Taille AAB:** ~13 MB

## 🔐 INFORMATIONS DE SÉCURITÉ (À SAUVEGARDER!)

**IMPORTANT:** Sauvegardez ces informations dans un endroit sûr (gestionnaire de mots de passe, coffre-fort numérique). Si vous perdez ces informations, vous ne pourrez JAMAIS mettre à jour votre application sur Play Store !

```
Fichier Keystore: android/app/fl2m-release-key.keystore
Store Password: FL2M2025SecurePass
Key Alias: fl2m-key-alias
Key Password: FL2M2025SecurePass

Organisation: CN=FL2M Services, OU=Mobile, O=FL2M, L=Paris, ST=Ile-de-France, C=FR
Validité: 10 000 jours (environ 27 ans)
```

**ACTIONS À FAIRE MAINTENANT:**
1. Copiez le fichier `android/app/fl2m-release-key.keystore` vers un cloud sécurisé (Google Drive, Dropbox chiffré, etc.)
2. Sauvegardez aussi le fichier `android/key.properties`
3. Stockez ces informations dans votre gestionnaire de mots de passe

---

## 📱 ÉTAPES DE SOUMISSION SUR PLAY STORE

### ÉTAPE 1: Créer un Compte Développeur Google Play

1. **Aller sur:** https://play.google.com/console
2. **Frais uniques:** 25$ (paiement unique à vie)
3. **Informations requises:**
   - Compte Google
   - Carte de crédit pour le paiement
   - Informations légales (nom, adresse, téléphone)
   - Informations fiscales (pour les revenus éventuels)

**Temps estimé:** 30 minutes (validation du compte peut prendre 48h)

---

### ÉTAPE 2: Créer une Nouvelle Application

1. **Dans Play Console**, cliquer sur "Créer une application"
2. **Remplir:**
   - Nom de l'app: `FL²M`
   - Langue par défaut: `Français (France)`
   - Type: `Application`
   - Gratuite ou payante: `Gratuite`
3. **Accepter** les conditions de Google Play

---

### ÉTAPE 3: Configurer la Fiche Store

#### A. Description de l'Application

**Titre court (30 caractères max):**
```
FL²M - Numérologie & Coaching
```

**Description complète (4000 caractères max):**
```
Découvrez FL²M, votre application de numérologie et de coaching personnel.

🔮 FONCTIONNALITÉS PRINCIPALES

• Message du Jour Personnalisé
  Recevez chaque jour un message numérologique unique basé sur votre profil

• Profil Numérologique Complet
  Créez et gérez vos profils numériques et ceux de vos bénéficiaires

• Prise de Rendez-vous
  Réservez facilement des consultations avec nos praticiens certifiés

• Espace Personnel Sécurisé
  Accédez à votre historique, documents et suivi personnalisé

🎯 POUR QUI ?

• Particuliers : Découverte personnelle, couple, enfants, suivi annuel
• Professionnels : Équipe, recrutement, stratégies d'entreprise
• Sportifs : Performance individuelle et collective

👥 ACCOMPAGNEMENT PROFESSIONNEL

Connectez-vous avec des praticiens expérimentés pour des consultations
personnalisées en présentiel ou à distance.

📱 SIMPLE ET INTUITIF

Interface moderne et facile à utiliser pour accéder à tous vos services
de numérologie et coaching en quelques clics.

🔒 SÉCURISÉ ET CONFIDENTIEL

Vos données sont protégées et restent strictement confidentielles.
```

**Description courte (80 caractères max):**
```
Numérologie, coaching et messages personnalisés quotidiens
```

#### B. Assets Graphiques Requis

**ICÔNE DE L'APPLICATION (Déjà disponible ✅)**
- Format: PNG 32 bits
- Taille: 512x512 pixels
- Emplacement: `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`

**IMAGE FEATURE GRAPHIC (À CRÉER)**
- Format: PNG ou JPEG
- Taille: 1024x500 pixels
- Contenu suggéré: Logo FL²M + slogan + visuels de l'app

**CAPTURES D'ÉCRAN (À CRÉER - MINIMUM 2, MAXIMUM 8)**

Recommandations:
- Taille: 1080x1920 pixels (portrait) ou 1920x1080 (paysage)
- Format: PNG ou JPEG
- Montrer les principales fonctionnalités:
  1. Page d'accueil avec navigation
  2. Message du jour (visiteur)
  3. Message du jour (bénéficiaire)
  4. Liste des praticiens/consultants
  5. Profil utilisateur
  6. Prise de rendez-vous

**Comment créer les captures:**
- Utilisez un émulateur Android (Android Studio)
- Ou installez l'APK sur un téléphone physique
- Prenez des screenshots des principales pages
- Optionnel: Ajoutez des cadres de téléphone avec des outils comme https://mockuphone.com

**ICÔNE HAUTE RÉSOLUTION**
- Format: PNG 32 bits
- Taille: 512x512 pixels
- Même icône que celle de l'app

---

### ÉTAPE 4: Configuration du Contenu

#### Catégorie de l'Application
- **Catégorie principale:** Style de vie
- **Catégorie secondaire (optionnel):** Santé et forme

#### Public Cible
- **Tranche d'âge:** 18 ans et plus

#### Classification du Contenu
1. Remplir le questionnaire de classification
2. Indiquer: Contenu adapté à tous
3. Aucune violence, langage inapproprié, etc.

#### Coordonnées
- Email de contact: [VOTRE EMAIL]
- Numéro de téléphone: [OPTIONNEL]
- Site web: https://www.fl2m.com (si disponible)

#### Politique de Confidentialité
- **URL requise:** Vous devez héberger votre politique de confidentialité
- **Déjà disponible dans l'app:** `src/pages/PolitiqueConfidentialitePage.tsx`
- **À faire:** Publier cette page sur votre site web et fournir l'URL

---

### ÉTAPE 5: Upload de l'AAB

1. **Aller dans:** Production > Créer une version
2. **Cliquer sur:** "Upload un nouveau fichier"
3. **Sélectionner:** `public/downloads/fl2m-app-v1.0.1.aab`
4. **Attendre** la validation (quelques minutes)

**Notes de version (à remplir):**
```
Version initiale de FL²M

✨ Fonctionnalités:
• Messages numériques quotidiens personnalisés
• Création et gestion de profils numériques
• Réservation de consultations
• Espace personnel sécurisé
• Modules pour particuliers, professionnels et sportifs
```

---

### ÉTAPE 6: Questionnaire de Distribution

**Pays de distribution:**
- Recommandation: Commencer par France, Belgique, Suisse, Canada
- Peut être étendu plus tard

**Distribution par appareil:**
- Téléphones: ✅
- Tablettes: ✅
- Wear OS: ❌
- Android TV: ❌

---

### ÉTAPE 7: Tarification et Distribution

1. **Gratuite ou payante:** Gratuite
2. **Achats intégrés:** OUI (si vous avez des paiements Stripe)
   - Déclarer: "L'application contient des achats intégrés"
   - Gamme de prix: selon vos tarifs

---

### ÉTAPE 8: Révision et Soumission

1. **Vérifier** tous les champs requis (icône verte)
2. **Cliquer sur** "Envoyer pour révision"
3. **Attendre** la validation de Google (généralement 1-7 jours)

**Vous recevrez:**
- Email de confirmation de soumission
- Email d'approbation ou de refus
- Si refusé: des explications et possibilité de corriger et resoumettre

---

## 🔄 MISES À JOUR FUTURES

Pour mettre à jour l'application:

1. **Modifier** `android/app/build.gradle`:
   ```gradle
   versionCode 2        // Incrémenter de 1
   versionName "1.0.2"  // Nouvelle version
   ```

2. **Générer le nouvel AAB:**
   ```bash
   npm run build:aab
   ```

3. **Upload dans Play Console:**
   - Production > Créer une version
   - Upload le nouveau AAB
   - Remplir les notes de version

---

## 📋 CHECKLIST AVANT SOUMISSION

- [ ] Compte développeur Google Play créé et payé (25$)
- [ ] Keystore sauvegardé dans 2+ endroits sécurisés
- [ ] AAB généré et testé en local
- [ ] Icône 512x512 prête
- [ ] Feature graphic 1024x500 créée
- [ ] Au moins 2 captures d'écran créées
- [ ] Description courte et longue rédigées
- [ ] Politique de confidentialité publiée en ligne (URL)
- [ ] Email de contact configuré
- [ ] Catégorie et public cible définis
- [ ] Questionnaire de classification rempli
- [ ] Pays de distribution sélectionnés

---

## 🆘 DÉPANNAGE

### Erreur "Application non signée"
- Vérifier que `key.properties` existe dans `android/`
- Vérifier que le keystore existe dans `android/app/`
- Relancer `npm run build:aab`

### Erreur "Version déjà existante"
- Incrémenter `versionCode` dans `build.gradle`

### Rejet "Politique de confidentialité manquante"
- Héberger la page de politique de confidentialité
- Ajouter l'URL dans Play Console

### AAB trop volumineux
- Actuel: 13 MB (bien en dessous de la limite de 150 MB)
- Pas de problème pour le moment

---

## 📞 SUPPORT

- **Documentation Play Console:** https://support.google.com/googleplay/android-developer
- **Forum développeurs:** https://groups.google.com/g/android-developers

---

## 🎯 APRÈS LA PUBLICATION

Une fois approuvé:
1. L'app sera visible sur Play Store sous 24h
2. Vous recevrez un lien direct vers votre fiche Play Store
3. Vous pourrez suivre les statistiques (téléchargements, notes, avis)
4. Vous pourrez gérer les mises à jour

**Prochaine étape (Option 1 complétée):**
→ Intégration des publicités AdMob (version 1.1.0)
