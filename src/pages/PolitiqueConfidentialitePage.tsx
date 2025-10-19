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
          backgroundImage: 'url(/images/Politique.jpg)',
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
          {/* En-tête */}
          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              color: '#1D3461',
              mb: 2,
              fontSize: { xs: '2rem', md: '2.5rem' },
            }}
          >
            Politique de Confidentialité
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              mb: 4,
            }}
          >
            Dernière mise à jour : [DATE À COMPLÉTER]
          </Typography>

          <Divider sx={{ mb: 4 }} />

          {/* Introduction */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="body1" paragraph>
              FL²M s'engage à protéger la vie privée de ses utilisateurs. Cette politique de confidentialité décrit comment nous collectons, utilisons, stockons et protégeons vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD).
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
              <strong>Raison sociale :</strong> [NOM DE LA SOCIÉTÉ]<br />
              <strong>Siège social :</strong> [ADRESSE COMPLÈTE]<br />
              <strong>Email :</strong> [ADRESSE EMAIL]<br />
              <strong>Téléphone :</strong> [NUMÉRO DE TÉLÉPHONE]
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
              <li>Nom et prénom</li>
              <li>Adresse email</li>
              <li>Numéro de téléphone</li>
              <li>Date de naissance (si nécessaire pour les services de numérologie)</li>
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
              <li>Informations sur les rendez-vous pris</li>
              <li>Notes et préférences concernant les consultations</li>
              <li>Type de service demandé (particuliers, professionnels, sportifs)</li>
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
              <li><strong>Consultants et intervenants :</strong> pour la réalisation de vos consultations</li>
              <li><strong>Prestataires techniques :</strong>
                <ul>
                  <li>Hébergeur du site : [NOM DE L'HÉBERGEUR]</li>
                  <li>Plateforme de paiement : Stripe</li>
                  <li>Outils d'analyse : [ex: Google Analytics, si applicable]</li>
                </ul>
              </li>
              <li><strong>Autorités compétentes :</strong> sur réquisition judiciaire ou dans le cadre d'obligations légales</li>
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
              Certains de nos prestataires peuvent être situés en dehors de l'Union Européenne. Dans ce cas, nous nous assurons que des garanties appropriées sont mises en place (clauses contractuelles types, Privacy Shield, etc.) pour assurer la protection de vos données.
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
              <strong>Droit à l'effacement :</strong> Vous pouvez demander la suppression de vos données dans certains cas<br /><br />
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
              <strong>Par email :</strong> [ADRESSE EMAIL DPO ou CONTACT]<br />
              <strong>Par courrier :</strong> [ADRESSE POSTALE]
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
              Notre site utilise des cookies pour :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li><strong>Cookies essentiels :</strong> Nécessaires au fonctionnement du site (authentification, panier, etc.)</li>
              <li><strong>Cookies de performance :</strong> Pour analyser l'utilisation du site et améliorer nos services</li>
              <li><strong>Cookies de personnalisation :</strong> Pour mémoriser vos préférences</li>
            </Typography>
            <Typography variant="body1" paragraph sx={{ mt: 2 }}>
              Vous pouvez gérer vos préférences de cookies via les paramètres de votre navigateur. Le refus de certains cookies peut limiter certaines fonctionnalités du site.
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
              <strong>Email :</strong> [ADRESSE EMAIL]<br />
              <strong>Téléphone :</strong> [NUMÉRO DE TÉLÉPHONE]<br />
              <strong>Courrier :</strong> [ADRESSE POSTALE]
            </Typography>
          </Box>
        </Paper>
      </Container>
      </Box>
    </Box>
  );
};

export default PolitiqueConfidentialitePage;
