# Ajouts à la Politique de Confidentialité pour l'Application Mobile

## 📋 Instructions
Copiez-collez ces sections dans votre fichier `PolitiqueConfidentialitePage.tsx` aux emplacements indiqués.

---

## ✏️ MODIFICATION 1 : Introduction (ligne ~88-90)

**REMPLACER:**
```
FL²M s'engage à protéger la vie privée de ses utilisateurs. Cette politique de confidentialité décrit comment nous collectons, utilisons, stockons et protégons vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD).
```

**PAR:**
```
FL²M s'engage à protéger la vie privée de ses utilisateurs. Cette politique de confidentialité s'applique à notre site web (https://www.fl2m.fr) ainsi qu'à notre application mobile FL²M disponible sur Google Play Store pour Android.

Cette politique décrit comment nous collectons, utilisons, stockons et protégons vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD).
```

---

## ✏️ AJOUT 2 : Nouvelle sous-section dans Section 2 (après 2.6, avant Section 3)

**AJOUTER APRÈS la section "2.6. Données relatives aux bénéficiaires" (ligne ~195):**

```tsx
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              2.7. Données techniques de l'appareil mobile
            </Typography>
            <Typography variant="body1" paragraph>
              Lorsque vous utilisez notre application mobile Android, les données suivantes peuvent être collectées automatiquement :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>Modèle et fabricant de l'appareil</li>
              <li>Version du système d'exploitation Android</li>
              <li>Identifiant unique anonyme de l'appareil (Android Advertising ID)</li>
              <li>Préférences de langue et région</li>
              <li>Informations de connexion réseau (type de connexion, opérateur)</li>
              <li>Logs techniques et rapports d'erreurs (pour améliorer l'application)</li>
              <li>Données d'utilisation de l'application (pages visitées, fonctionnalités utilisées)</li>
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              2.8. Données publicitaires (Google AdMob)
            </Typography>
            <Typography variant="body1" paragraph>
              Notre application mobile utilise Google AdMob pour afficher des publicités qui permettent de proposer l'accès gratuit au message du jour. Les données suivantes peuvent être collectées par AdMob :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li><strong>Identifiant publicitaire Android (Advertising ID) :</strong> Identifiant unique anonyme réinitialisable depuis les paramètres de votre appareil</li>
              <li><strong>Données de localisation approximative :</strong> Basée sur l'adresse IP (ville, région, pays) pour afficher des publicités géolocalisées</li>
              <li><strong>Interactions avec les publicités :</strong> Clics, impressions, durée de visualisation</li>
              <li><strong>Informations sur l'appareil :</strong> Modèle, système d'exploitation, résolution d'écran</li>
              <li><strong>Données de navigation :</strong> Pages consultées avant et après la publicité</li>
            </Typography>
            <Typography variant="body1" paragraph sx={{ mt: 2 }}>
              <strong>Finalité :</strong> Ces données permettent à Google et ses partenaires publicitaires d'afficher des publicités personnalisées et de mesurer leur efficacité. En contrepartie, vous bénéficiez d'un accès gratuit au message du jour.
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Gestion de vos préférences publicitaires :</strong>
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li><strong>Désactiver la personnalisation des annonces :</strong> Paramètres Android → Google → Annonces → Désactiver la personnalisation des annonces</li>
              <li><strong>Réinitialiser votre Advertising ID :</strong> Paramètres Android → Google → Annonces → Réinitialiser l'ID publicitaire</li>
              <li><strong>Plus d'informations :</strong>{' '}
                <a
                  href="https://support.google.com/admob/answer/9012903"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#FFD700', textDecoration: 'none', fontWeight: 600 }}
                >
                  Politique de confidentialité Google AdMob
                </a>
              </li>
            </Typography>
```

---

## ✏️ AJOUT 3 : Modifier la Section 3 - Finalités (ligne ~210-223)

**AJOUTER ces deux lignes dans la liste des finalités (ligne ~213-223):**

```tsx
              <li>Affichage de publicités pour financer l'accès gratuit au message du jour</li>
              <li>Personnalisation des publicités affichées (via Google AdMob)</li>
```

**La liste complète devient donc:**
```tsx
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>Gestion de votre compte utilisateur</li>
              <li>Traitement de vos demandes de rendez-vous</li>
              <li>Fourniture de nos services de numérologie stratégique</li>
              <li>Gestion des paiements et de la facturation</li>
              <li>Communication avec vous concernant nos services</li>
              <li>Envoi de newsletters et d'informations (avec votre consentement)</li>
              <li>Amélioration de nos services et de votre expérience utilisateur</li>
              <li>Respect de nos obligations légales et réglementaires</li>
              <li>Prévention de la fraude et sécurisation de la plateforme</li>
              <li>Affichage de publicités pour financer l'accès gratuit au message du jour</li>
              <li>Personnalisation des publicités affichées (via Google AdMob)</li>
            </Typography>
```

---

## ✏️ AJOUT 4 : Modifier la Section 4 - Base légale (ligne ~242-247)

**AJOUTER cette ligne dans la liste:**

```tsx
              <li><strong>Votre consentement :</strong> pour l'affichage de publicités personnalisées via Google AdMob</li>
```

**La liste complète devient:**
```tsx
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li><strong>L'exécution d'un contrat :</strong> pour la fourniture de nos services</li>
              <li><strong>Votre consentement :</strong> pour l'envoi de communications marketing</li>
              <li><strong>Votre consentement :</strong> pour l'affichage de publicités personnalisées via Google AdMob</li>
              <li><strong>Nos intérêts légitimes :</strong> pour l'amélioration de nos services et la sécurité de la plateforme</li>
              <li><strong>Le respect d'obligations légales :</strong> notamment en matière comptable et fiscale</li>
            </Typography>
```

---

## ✏️ AJOUT 5 : Modifier la Section 6 - Destinataires (ligne ~291-299)

**AJOUTER dans la sous-liste des prestataires techniques (après Apple Inc.):**

```tsx
                  <li><strong>Google LLC (AdMob)</strong> - Plateforme publicitaire pour l'application mobile (États-Unis avec clauses contractuelles types UE)</li>
                  <li><strong>Partenaires publicitaires AdMob</strong> - Annonceurs tiers via le réseau Google AdMob (soumis aux politiques Google)</li>
```

**La liste des prestataires devient:**
```tsx
              <li><strong>Prestataires techniques :</strong>
                <ul>
                  <li><strong>Vercel Inc.</strong> - Hébergement du site web (frontend, États-Unis avec garanties RGPD)</li>
                  <li><strong>Supabase Inc.</strong> - Hébergement de la base de données et des fichiers (données hébergées dans l'UE)</li>
                  <li><strong>Stripe Inc.</strong> - Plateforme de paiement sécurisé (certifiée PCI-DSS niveau 1, États-Unis avec clauses contractuelles types)</li>
                  <li><strong>Resend</strong> - Service d'envoi d'emails transactionnels</li>
                  <li><strong>Google LLC</strong> - Authentification via Google OAuth (optionnel, États-Unis)</li>
                  <li><strong>Apple Inc.</strong> - Authentification via Apple Sign-In (optionnel, États-Unis)</li>
                  <li><strong>Google LLC (AdMob)</strong> - Plateforme publicitaire pour l'application mobile (États-Unis avec clauses contractuelles types UE)</li>
                  <li><strong>Partenaires publicitaires AdMob</strong> - Annonceurs tiers via le réseau Google AdMob (soumis aux politiques Google)</li>
                </ul>
              </li>
```

---

## ✏️ AJOUT 6 : Modifier la Section 7 - Transfert international (ligne ~328)

**AJOUTER après la ligne Google LLC / Apple Inc.:**

```tsx
              <li><strong>Google LLC (AdMob, États-Unis) :</strong> Plateforme publicitaire utilisée dans l'application mobile, applique des clauses contractuelles types de l'UE et est conforme au EU-US Data Privacy Framework</li>
```

**La liste devient:**
```tsx
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li><strong>Vercel Inc. (États-Unis) :</strong> Hébergement du site web (interface), applique des clauses contractuelles types de l'UE et est conforme au EU-US Data Privacy Framework</li>
              <li><strong>Stripe Inc. (États-Unis) :</strong> Traitement des paiements, certifié PCI-DSS niveau 1 et appliquant des clauses contractuelles types de l'UE</li>
              <li><strong>Google LLC / Apple Inc. (États-Unis) :</strong> Uniquement si vous utilisez leur service d'authentification (optionnel)</li>
              <li><strong>Google LLC (AdMob, États-Unis) :</strong> Plateforme publicitaire utilisée dans l'application mobile, applique des clauses contractuelles types de l'UE et est conforme au EU-US Data Privacy Framework</li>
            </Typography>
```

---

## ✏️ AJOUT 7 : Modifier la Section 10 - Cookies (après 10.4, ligne ~481)

**REMPLACER la section 10.4 "Pas de cookies publicitaires" PAR:**

```tsx
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              10.4. Cookies et traceurs publicitaires (Application mobile uniquement)
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Sur le site web :</strong> Nous n'utilisons aucun cookie publicitaire, de tracking ou d'analyse (Google Analytics, Facebook Pixel, etc.). Les seuls cookies utilisés sont strictement nécessaires au fonctionnement du service.
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Sur l'application mobile Android :</strong> L'application utilise Google AdMob pour afficher des publicités qui financent l'accès gratuit au message du jour. AdMob et ses partenaires utilisent des technologies de suivi incluant :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li><strong>Identifiant publicitaire Android (Advertising ID) :</strong> Identifiant unique réinitialisable pour personnaliser les publicités</li>
              <li><strong>Cookies et stockage local :</strong> Pour mémoriser vos préférences publicitaires et limiter la fréquence d'affichage</li>
              <li><strong>SDK Google Mobile Ads :</strong> Pour gérer l'affichage et le suivi des publicités</li>
            </Typography>
            <Typography variant="body1" paragraph sx={{ mt: 2 }}>
              <strong>Vous pouvez contrôler ces traceurs :</strong>
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>Désactiver la personnalisation des annonces : Paramètres Android → Google → Annonces</li>
              <li>Réinitialiser votre Advertising ID pour effacer l'historique de suivi</li>
              <li>Accéder aux paramètres de confidentialité Google : <a
                href="https://adssettings.google.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#FFD700', textDecoration: 'none', fontWeight: 600 }}
              >
                https://adssettings.google.com
              </a></li>
            </Typography>
            <Typography variant="body1" paragraph sx={{ mt: 2 }}>
              <strong>Important :</strong> La désactivation des publicités personnalisées ne supprimera pas les publicités, mais elles seront moins pertinentes pour vous.
            </Typography>
```

---

## ✏️ AJOUT 8 : NOUVELLE SECTION après Section 13 (avant la fermeture du Paper, ligne ~561)

**AJOUTER cette nouvelle section complète:**

```tsx
          {/* Section 14 : Application mobile */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h5"
              gutterBottom
              sx={{
                fontWeight: 600,
                color: '#1D3461',
                mb: 2,
              }}
            >
              14. Application mobile Android
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              14.1. Permissions demandées
            </Typography>
            <Typography variant="body1" paragraph>
              Notre application Android peut demander les permissions suivantes :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li><strong>INTERNET :</strong> Obligatoire - Pour accéder aux services en ligne et synchroniser vos données</li>
              <li><strong>ACCESS_NETWORK_STATE :</strong> Obligatoire - Pour vérifier la connexion Internet</li>
              <li><strong>POST_NOTIFICATIONS :</strong> Optionnel - Pour recevoir des notifications de rappel de rendez-vous</li>
              <li><strong>READ_EXTERNAL_STORAGE / WRITE_EXTERNAL_STORAGE :</strong> Optionnel - Pour sauvegarder vos documents PDF générés</li>
              <li><strong>CAMERA / READ_MEDIA_IMAGES :</strong> Optionnel - Pour télécharger votre photo de profil depuis l'appareil photo ou la galerie</li>
              <li><strong>ADVERTISING_ID :</strong> Pour afficher des publicités personnalisées via Google AdMob</li>
            </Typography>
            <Typography variant="body1" paragraph sx={{ mt: 2 }}>
              Vous pouvez gérer ces permissions à tout moment dans : <strong>Paramètres Android → Applications → FL²M → Autorisations</strong>
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              14.2. Services Google Play
            </Typography>
            <Typography variant="body1" paragraph>
              L'application utilise les services Google Play pour :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>L'authentification Google Sign-In (optionnel)</li>
              <li>Les notifications push (Firebase Cloud Messaging)</li>
              <li>L'affichage de publicités (Google AdMob)</li>
              <li>La distribution et les mises à jour automatiques (Google Play Store)</li>
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              14.3. Publicités et accès gratuit
            </Typography>
            <Typography variant="body1" paragraph>
              L'application mobile affiche des publicités via Google AdMob <strong>avant l'accès au message du jour</strong>. Ce modèle publicitaire permet de proposer cette fonctionnalité gratuitement à tous les utilisateurs.
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Fonctionnement :</strong>
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>Chaque fois que vous cliquez sur "Découvrir mon message" (visiteur) ou "Voir mon message" (bénéficiaire), une publicité s'affiche</li>
              <li>La publicité dure généralement 5 à 30 secondes et peut être fermée après quelques secondes</li>
              <li>Une fois la publicité visionnée, vous accédez à votre message du jour</li>
              <li>Les publicités sont sélectionnées par Google AdMob en fonction de vos centres d'intérêt (si vous avez activé la personnalisation)</li>
            </Typography>
            <Typography variant="body1" paragraph sx={{ mt: 2 }}>
              <strong>Données collectées par les publicités :</strong> Voir section 2.8 ci-dessus.
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Vos choix :</strong>
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>Vous pouvez désactiver les publicités personnalisées dans vos paramètres Android (vous verrez toujours des publicités, mais non ciblées)</li>
              <li>Les revenus publicitaires nous permettent de maintenir ce service gratuit pour tous</li>
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              14.4. Stockage des données
            </Typography>
            <Typography variant="body1" paragraph>
              Les données de l'application sont stockées :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li><strong>Localement sur votre appareil :</strong> Tokens de session, préférences, cache temporaire</li>
              <li><strong>Sur nos serveurs Supabase (UE) :</strong> Profil, rendez-vous, documents, données numérologique</li>
              <li><strong>Chez nos partenaires :</strong> Données de paiement (Stripe), données publicitaires (Google AdMob)</li>
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              14.5. Mises à jour de l'application
            </Typography>
            <Typography variant="body1" paragraph>
              L'application peut être mise à jour automatiquement via Google Play Store. Les mises à jour peuvent inclure :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>Nouvelles fonctionnalités</li>
              <li>Corrections de bugs et améliorations de sécurité</li>
              <li>Modifications de cette politique de confidentialité (vous serez notifié)</li>
            </Typography>
            <Typography variant="body1" paragraph sx={{ mt: 2 }}>
              Vous pouvez désactiver les mises à jour automatiques dans les paramètres de Google Play Store, mais cela peut affecter la sécurité et les fonctionnalités de l'application.
            </Typography>
          </Box>
```

---

## ✅ RÉSUMÉ DES MODIFICATIONS

**8 modifications à faire :**

1. ✏️ Introduction : Mention du site web ET de l'app mobile
2. ➕ Section 2.7 : Données de l'appareil mobile
3. ➕ Section 2.8 : Données publicitaires AdMob (avec mention accès gratuit)
4. ➕ Section 3 : Ajout de 2 finalités (publicités)
5. ➕ Section 4 : Ajout base légale consentement AdMob
6. ➕ Section 6 : Ajout Google AdMob dans destinataires
7. ➕ Section 7 : Ajout transfert AdMob vers USA
8. ✏️ Section 10.4 : Remplacement par nouvelle section sur publicités
9. ➕ NOUVELLE Section 14 : Spécificités application mobile (permissions, publicités, etc.)

---

## 🎯 POINTS CLÉS POUR GOOGLE PLAY STORE

✅ **Transparence sur les publicités** : Clairement expliqué que les publicités financent l'accès gratuit au message du jour

✅ **Fréquence des publicités** : Précisé "à chaque accès au message du jour"

✅ **Contrôle utilisateur** : Instructions pour désactiver la personnalisation

✅ **Données collectées** : Advertising ID, localisation approximative, interactions clairement listées

✅ **Permissions Android** : Toutes les permissions expliquées avec justifications

✅ **Services tiers** : Google Play Services, AdMob, Firebase bien documentés

---

## 📝 APRÈS AVOIR AJOUTÉ CES MODIFICATIONS

1. Vérifiez que tout compile sans erreur
2. Testez l'affichage sur https://www.fl2m.fr/politique-confidentialite
3. Dans Play Console, utilisez l'URL : `https://www.fl2m.fr/politique-confidentialite`
4. Cochez dans Play Console : "L'application contient des publicités" ✅

---

**Votre politique sera alors 100% conforme pour Play Store avec publicités AdMob ! 🎉**
