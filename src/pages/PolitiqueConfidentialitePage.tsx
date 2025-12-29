// src/pages/PolitiqueConfidentialitePage.tsx
import React from 'react';
import { Box, Container, Typography, Divider, Paper } from '@mui/material';

const PolitiqueConfidentialitePage: React.FC = () => {
  return (
    <Box sx={{ width: '100%', position: 'relative', minHeight: '100vh' }}>
      {/* Image de fond - politique */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          backgroundImage: {
            xs: 'none',
            md: 'url(/images/Politique.jpg)'
          },
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.7,
          pointerEvents: 'none',
        }}
      />
      {/* Overlay pour adoucir l'image */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          background: 'linear-gradient(180deg, rgba(248, 249, 250, 0.3) 0%, rgba(233, 236, 239, 0.35) 50%, rgba(222, 226, 230, 0.4) 100%)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          minHeight: 'calc(100vh - 136px)',
          background: 'rgba(245, 247, 250, 0.6)',
          backdropFilter: 'blur(2px)',
          py: { xs: 4, md: 6 },
          position: 'relative',
          zIndex: 1,
        }}
      >
      <Container maxWidth="lg">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 6 },
            borderRadius: 2,
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          }}
        >
          {/* En-tête avec Logo */}
          <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
            <Box
              component="img"
              src="/logo-flm2.png"
              alt="FL²M Logo"
              sx={{
                height: { xs: '60px', md: '75px' },
                width: 'auto',
                objectFit: 'contain',
              }}
            />
            <Box>
              <Typography
                variant="h3"
                component="h1"
                sx={{
                  fontWeight: 700,
                  color: '#1D3461',
                  fontSize: { xs: '2rem', md: '2.5rem' },
                  mb: 1,
                }}
              >
                Politique de Confidentialité
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                }}
              >
                Dernière mise à jour : 29 décembre 2025
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* Introduction */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="body1" paragraph>
              FL²M s'engage à protéger la vie privée de ses utilisateurs. Cette politique de confidentialité s'applique à notre site web (https://www.fl2m.fr) ainsi qu'à notre application mobile FL²M disponible sur Google Play Store pour Android.
            </Typography>
            <Typography variant="body1" paragraph>
              Cette politique décrit comment nous collectons, utilisons, stockons et protégeons vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD).
            </Typography>
          </Box>

          {/* Section 1 : Responsable du traitement */}
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
              1. Responsable du traitement des données
            </Typography>
            <Typography variant="body1" sx={{ pl: 2 }}>
              <strong>Raison sociale :</strong> FL2M IPS<br />
              <strong>Siège social :</strong> 6 rue Albert Nicolas, 26600 Tain-l'Hermitage, France<br />
              <strong>Représentant légal :</strong> Frédéric Ménard<br />
              <strong>Email :</strong> contact@fl2m.fr<br />
              <strong>SIREN :</strong> 982131260
            </Typography>
          </Box>

          {/* Section 2 : Données collectées */}
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
              2. Données personnelles collectées
            </Typography>
            <Typography variant="body1" paragraph>
              Nous collectons les données suivantes :
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              2.1. Données d'identification
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>Nom et prénom (y compris second prénom et nom de jeune fille)</li>
              <li>Adresse email</li>
              <li>Numéro de téléphone</li>
              <li>Date de naissance complète (nécessaire pour les calculs numérologiques)</li>
              <li>Département de résidence</li>
              <li>Photo de profil / Avatar (optionnel)</li>
              <li>Pseudonyme (optionnel)</li>
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              2.2. Données de connexion
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>Adresse IP</li>
              <li>Identifiants de connexion</li>
              <li>Historique de navigation sur le site</li>
              <li>Cookies et traceurs</li>
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              2.3. Données de paiement
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>Informations de facturation</li>
              <li>Historique des transactions (via Stripe)</li>
              <li>Note : Les données bancaires sont traitées directement par notre prestataire de paiement sécurisé Stripe et ne sont jamais stockées sur nos serveurs</li>
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              2.4. Données relatives aux rendez-vous
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>Informations sur les rendez-vous pris (date, heure, intervenant)</li>
              <li>Statut des rendez-vous (confirmé, annulé, complété)</li>
              <li>Notes et préférences concernant les consultations</li>
              <li>Type de service demandé (particuliers, professionnels, sportifs)</li>
              <li>Liens de visioconférence pour consultations à distance</li>
              <li>Évaluations et avis (après consultation)</li>
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              2.5. Données numérologiques
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>Calculs numérologiques (Racine 1, Racine 2, Tronc, Dynamique de vie, etc.)</li>
              <li>Documents PDF générés (arbres numérologiques, plans de vie, analyses)</li>
              <li>Notes personnelles des consultations</li>
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              2.6. Données relatives aux bénéficiaires
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>Informations des personnes pour lesquelles vous prenez rendez-vous (enfants, conjoints, parents, etc.)</li>
              <li>Lien de parenté avec le bénéficiaire</li>
              <li>Données numérologiques des bénéficiaires</li>
              <li>Documents associés aux bénéficiaires</li>
              <li>Autorisations de partage d'accès entre utilisateurs</li>
            </Typography>

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
          </Box>

          {/* Section 3 : Finalités du traitement */}
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
              3. Finalités du traitement des données
            </Typography>
            <Typography variant="body1" paragraph>
              Vos données personnelles sont collectées pour les finalités suivantes :
            </Typography>
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
          </Box>

          {/* Section 4 : Base légale */}
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
              4. Base légale du traitement
            </Typography>
            <Typography variant="body1" paragraph>
              Le traitement de vos données repose sur :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li><strong>L'exécution d'un contrat :</strong> pour la fourniture de nos services</li>
              <li><strong>Votre consentement :</strong> pour l'envoi de communications marketing</li>
              <li><strong>Votre consentement :</strong> pour l'affichage de publicités personnalisées via Google AdMob</li>
              <li><strong>Nos intérêts légitimes :</strong> pour l'amélioration de nos services et la sécurité de la plateforme</li>
              <li><strong>Le respect d'obligations légales :</strong> notamment en matière comptable et fiscale</li>
            </Typography>
          </Box>

          {/* Section 5 : Durée de conservation */}
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
              5. Durée de conservation des données
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li><strong>Données de compte :</strong> Jusqu'à la suppression de votre compte + 1 an</li>
              <li><strong>Données de paiement :</strong> 10 ans (obligation légale comptable)</li>
              <li><strong>Données de navigation :</strong> 13 mois maximum</li>
              <li><strong>Historique des rendez-vous :</strong> 3 ans après la dernière consultation</li>
              <li><strong>Données marketing :</strong> 3 ans à compter du dernier contact</li>
            </Typography>
          </Box>

          {/* Section 6 : Destinataires */}
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
              6. Destinataires des données
            </Typography>
            <Typography variant="body1" paragraph>
              Vos données personnelles peuvent être partagées avec :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li><strong>Personnel autorisé de FL²M :</strong> ayant besoin d'accéder aux données pour l'exécution de leurs missions</li>
              <li><strong>Consultants et intervenants :</strong> pour la réalisation de vos consultations (uniquement les données nécessaires à la prestation)</li>
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
              <li><strong>Utilisateurs autorisés :</strong> dans le cas de partage d'accès aux bénéficiaires (selon vos paramètres)</li>
              <li><strong>Autorités compétentes :</strong> sur réquisition judiciaire ou dans le cadre d'obligations légales</li>
            </Typography>
            <Typography variant="body1" paragraph sx={{ mt: 2 }}>
              Tous nos sous-traitants sont liés par des accords de confidentialité et sont tenus de traiter vos données conformément au RGPD.
            </Typography>
          </Box>

          {/* Section 7 : Transfert international */}
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
              7. Transfert de données hors UE
            </Typography>
            <Typography variant="body1" paragraph>
              Certains de nos prestataires sont situés hors de l'Union Européenne. Vos données peuvent être transférées dans les cas suivants :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li><strong>Vercel Inc. (États-Unis) :</strong> Hébergement du site web (interface), applique des clauses contractuelles types de l'UE et est conforme au EU-US Data Privacy Framework</li>
              <li><strong>Stripe Inc. (États-Unis) :</strong> Traitement des paiements, certifié PCI-DSS niveau 1 et appliquant des clauses contractuelles types de l'UE</li>
              <li><strong>Google LLC / Apple Inc. (États-Unis) :</strong> Uniquement si vous utilisez leur service d'authentification (optionnel)</li>
              <li><strong>Google LLC (AdMob, États-Unis) :</strong> Plateforme publicitaire utilisée dans l'application mobile, applique des clauses contractuelles types de l'UE et est conforme au EU-US Data Privacy Framework</li>
            </Typography>
            <Typography variant="body1" paragraph sx={{ mt: 2 }}>
              Dans tous les cas, nous nous assurons que des garanties appropriées sont en place conformément au RGPD :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>Clauses contractuelles types approuvées par la Commission Européenne</li>
              <li>Certification EU-US Data Privacy Framework (lorsque applicable)</li>
              <li>Mesures techniques et organisationnelles de sécurité renforcées</li>
            </Typography>
            <Typography variant="body1" paragraph sx={{ mt: 2 }}>
              <strong>Note importante :</strong> Vos données sensibles (profils, rendez-vous, documents personnels, données numérologiques) sont hébergées par Supabase dans des centres de données situés exclusivement dans l'Union Européenne.
            </Typography>
          </Box>

          {/* Section 8 : Sécurité */}
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
              8. Sécurité des données
            </Typography>
            <Typography variant="body1" paragraph>
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données personnelles contre :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>L'accès non autorisé</li>
              <li>La modification, la divulgation ou la destruction non autorisée</li>
              <li>La perte accidentelle</li>
            </Typography>
            <Typography variant="body1" paragraph sx={{ mt: 2 }}>
              Ces mesures incluent notamment :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>Chiffrement des données sensibles (HTTPS)</li>
              <li>Authentification sécurisée</li>
              <li>Sauvegardes régulières</li>
              <li>Accès limité aux données par le personnel autorisé</li>
              <li>Surveillance et audits réguliers</li>
            </Typography>
          </Box>

          {/* Section 9 : Vos droits */}
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
              9. Vos droits
            </Typography>
            <Typography variant="body1" paragraph>
              Conformément au RGPD, vous disposez des droits suivants :
            </Typography>

            <Typography variant="body1" component="div" sx={{ pl: 2 }}>
              <strong>Droit d'accès :</strong> Vous pouvez demander l'accès à vos données personnelles<br /><br />
              <strong>Droit de rectification :</strong> Vous pouvez demander la correction de données inexactes ou incomplètes<br /><br />
              <strong>Droit à l'effacement :</strong> Vous pouvez demander la suppression de vos données dans certains cas (
              <a href="/suppression-compte" style={{ color: 'inherit', textDecoration: 'underline', textDecorationColor: 'rgba(0,0,0,0.3)' }}>
                voir la procédure
              </a>
              )<br /><br />
              <strong>Droit à la limitation du traitement :</strong> Vous pouvez demander la limitation du traitement de vos données<br /><br />
              <strong>Droit à la portabilité :</strong> Vous pouvez recevoir vos données dans un format structuré et lisible<br /><br />
              <strong>Droit d'opposition :</strong> Vous pouvez vous opposer au traitement de vos données pour des motifs légitimes<br /><br />
              <strong>Droit de retirer votre consentement :</strong> Pour les traitements basés sur votre consentement<br /><br />
              <strong>Droit de définir des directives post-mortem :</strong> Vous pouvez définir des directives sur le sort de vos données après votre décès
            </Typography>

            <Typography variant="body1" paragraph sx={{ mt: 3 }}>
              Pour exercer vos droits, contactez-nous :
            </Typography>
            <Typography variant="body1" sx={{ pl: 2 }}>
              <strong>Par email :</strong> contact@fl2m.fr (objet : "Exercice de mes droits RGPD")<br />
              <strong>Par courrier :</strong> FL2M IPS - RGPD, 6 rue Albert Nicolas, 26600 Tain-l'Hermitage, France<br />
              <strong>Via le formulaire de contact :</strong>{' '}
              <a href="/contact" style={{ color: '#FFD700', textDecoration: 'none', fontWeight: 600 }}>
                Page Contact
              </a>
            </Typography>

            <Typography variant="body1" paragraph sx={{ mt: 2 }}>
              Vous disposez également du droit d'introduire une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés) si vous estimez que vos droits ne sont pas respectés.
            </Typography>
          </Box>

          {/* Section 10 : Cookies */}
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
              10. Cookies
            </Typography>
            <Typography variant="body1" paragraph>
              Notre site utilise les technologies de cookies et de stockage local suivantes :
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              10.1. Cookies strictement nécessaires
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li><strong>Cookies d'authentification Supabase (sb-*) :</strong> Durée : Session ou 7 jours<br/>
                Permettent de maintenir votre connexion active et sécurisée</li>
              <li><strong>Stockage local (localStorage) :</strong> Conserve les tokens de session de manière sécurisée</li>
              <li><strong>Stockage de session (sessionStorage) :</strong> Gestion temporaire des flux d'authentification OAuth</li>
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              10.2. Technologies de stockage
            </Typography>
            <Typography variant="body1" paragraph>
              Les informations stockées localement incluent :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>Tokens de session (chiffrés)</li>
              <li>Préférences utilisateur (langue, thème)</li>
              <li>État de navigation OAuth (temporaire)</li>
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              10.3. Gestion des cookies
            </Typography>
            <Typography variant="body1" paragraph>
              Les cookies que nous utilisons sont strictement nécessaires au fonctionnement du site (authentification, sécurité). Leur refus empêchera l'utilisation des fonctionnalités nécessitant une connexion.
            </Typography>
            <Typography variant="body1" paragraph>
              Vous pouvez gérer les cookies via les paramètres de votre navigateur :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li><strong>Chrome :</strong> Paramètres &gt; Confidentialité et sécurité &gt; Cookies</li>
              <li><strong>Firefox :</strong> Options &gt; Vie privée et sécurité &gt; Cookies</li>
              <li><strong>Safari :</strong> Préférences &gt; Confidentialité &gt; Cookies</li>
              <li><strong>Edge :</strong> Paramètres &gt; Confidentialité &gt; Cookies</li>
            </Typography>

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
              <li>Accéder aux paramètres de confidentialité Google :{' '}
                <a
                  href="https://adssettings.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#FFD700', textDecoration: 'none', fontWeight: 600 }}
                >
                  https://adssettings.google.com
                </a>
              </li>
            </Typography>
            <Typography variant="body1" paragraph sx={{ mt: 2 }}>
              <strong>Important :</strong> La désactivation des publicités personnalisées ne supprimera pas les publicités, mais elles seront moins pertinentes pour vous.
            </Typography>
          </Box>

          {/* Section 11 : Paiement Stripe */}
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
              11. Paiements et sécurité (Stripe)
            </Typography>
            <Typography variant="body1" paragraph>
              Nous utilisons Stripe comme prestataire de paiement sécurisé. Vos informations bancaires sont directement traitées par Stripe et ne transitent jamais par nos serveurs.
            </Typography>
            <Typography variant="body1" paragraph>
              Stripe est certifié PCI-DSS niveau 1, le plus haut niveau de certification dans l'industrie des paiements.
            </Typography>
            <Typography variant="body1" paragraph>
              Pour plus d'informations sur la politique de confidentialité de Stripe, consultez :{' '}
              <a
                href="https://stripe.com/fr/privacy"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#FFD700', textDecoration: 'none', fontWeight: 600 }}
              >
                https://stripe.com/fr/privacy
              </a>
            </Typography>
          </Box>

          {/* Section 12 : Modifications */}
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
              12. Modifications de la politique de confidentialité
            </Typography>
            <Typography variant="body1" paragraph>
              Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. Toute modification sera publiée sur cette page avec une nouvelle date de mise à jour.
            </Typography>
            <Typography variant="body1" paragraph>
              Nous vous encourageons à consulter régulièrement cette page pour rester informé de nos pratiques en matière de protection des données.
            </Typography>
          </Box>

          {/* Section 13 : Contact */}
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
              13. Contact
            </Typography>
            <Typography variant="body1" paragraph>
              Pour toute question concernant cette politique de confidentialité ou le traitement de vos données personnelles :
            </Typography>
            <Typography variant="body1" sx={{ pl: 2 }}>
              <strong>Email :</strong> contact@fl2m.fr<br />
              <strong>Courrier :</strong> FL2M IPS, 6 rue Albert Nicolas, 26600 Tain-l'Hermitage, France<br />
              <strong>Formulaire de contact :</strong>{' '}
              <a href="/contact" style={{ color: '#FFD700', textDecoration: 'none', fontWeight: 600 }}>
                https://fl2m.fr/contact
              </a>
            </Typography>
          </Box>

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
        </Paper>
      </Container>
      </Box>
    </Box>
  );
};

export default PolitiqueConfidentialitePage;
