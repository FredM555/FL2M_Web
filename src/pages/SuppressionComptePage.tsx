// src/pages/SuppressionComptePage.tsx
import React from 'react';
import { Box, Container, Typography, Divider, Paper, Button } from '@mui/material';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EmailIcon from '@mui/icons-material/Email';

const SuppressionComptePage: React.FC = () => {
  const handleEmailClick = () => {
    window.location.href = 'mailto:contact@fl2m.fr?subject=Demande de suppression de compte FL²M&body=Bonjour,%0D%0A%0D%0AJe souhaite supprimer mon compte FL²M ainsi que toutes les données associées.%0D%0A%0D%0AEmail du compte : %0D%0ANom : %0D%0APrénom : %0D%0A%0D%0ACordialement';
  };

  return (
    <Box sx={{ width: '100%', position: 'relative', minHeight: '100vh' }}>
      {/* Image de fond */}
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
      {/* Overlay */}
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
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <DeleteForeverIcon sx={{ fontSize: 60, color: '#1D3461', mb: 2 }} />
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
                Suppression de Compte
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  mb: 2,
                }}
              >
                Demande de suppression de votre compte FL²M et des données associées
              </Typography>
            </Box>

            <Divider sx={{ mb: 4 }} />

            {/* Introduction */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="body1" paragraph>
                Conformément au Règlement Général sur la Protection des Données (RGPD), vous avez le droit de demander la suppression de votre compte FL²M et de toutes vos données personnelles.
              </Typography>
              <Typography variant="body1" paragraph>
                Cette page vous explique comment procéder et ce qui sera effectivement supprimé.
              </Typography>
            </Box>

            {/* Section 1 : Comment faire la demande */}
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
                1. Comment demander la suppression de mon compte ?
              </Typography>

              <Typography variant="body1" paragraph>
                Pour demander la suppression de votre compte, vous pouvez :
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                  Option 1 : Par email (Recommandé)
                </Typography>
                <Typography variant="body1" paragraph>
                  Envoyez un email à <strong>contact@fl2m.fr</strong> avec les informations suivantes :
                </Typography>
                <Typography variant="body1" component="ul" sx={{ pl: 4, mb: 2 }}>
                  <li>Objet : "Demande de suppression de compte FL²M"</li>
                  <li>Votre adresse email de connexion</li>
                  <li>Votre nom et prénom</li>
                  <li>Confirmation de votre demande de suppression</li>
                </Typography>

                <Button
                  variant="contained"
                  startIcon={<EmailIcon />}
                  onClick={handleEmailClick}
                  sx={{
                    backgroundColor: '#1D3461',
                    '&:hover': {
                      backgroundColor: '#152847',
                    },
                  }}
                >
                  Envoyer un email de suppression
                </Button>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                  Option 2 : Via le formulaire de contact
                </Typography>
                <Typography variant="body1" paragraph>
                  Utilisez notre{' '}
                  <a href="/contact" style={{ color: '#FFD700', textDecoration: 'none', fontWeight: 600 }}>
                    formulaire de contact
                  </a>{' '}
                  en précisant dans l'objet : "Suppression de compte"
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                  Option 3 : Par courrier
                </Typography>
                <Typography variant="body1" paragraph>
                  Envoyez votre demande par courrier postal à :
                </Typography>
                <Typography variant="body1" sx={{ pl: 2 }}>
                  <strong>FL2M IPS</strong><br />
                  Service Suppression de Compte<br />
                  6 rue Albert Nicolas<br />
                  26600 Tain-l'Hermitage<br />
                  France
                </Typography>
              </Box>
            </Box>

            {/* Section 2 : Délai de traitement */}
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
                2. Délai de traitement
              </Typography>
              <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
                <li><strong>Accusé de réception :</strong> Sous 48 heures ouvrées</li>
                <li><strong>Suppression effective :</strong> Maximum 30 jours à compter de votre demande</li>
                <li><strong>Confirmation :</strong> Vous recevrez un email confirmant la suppression de votre compte</li>
              </Typography>
            </Box>

            {/* Section 3 : Données supprimées */}
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
                3. Quelles données seront supprimées ?
              </Typography>
              <Typography variant="body1" paragraph>
                Les données suivantes seront <strong>définitivement supprimées</strong> :
              </Typography>
              <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
                <li><strong>Informations de compte :</strong> Email, nom, prénom, mot de passe, photo de profil</li>
                <li><strong>Profils numériques :</strong> Vos profils numérologique et ceux de vos bénéficiaires</li>
                <li><strong>Historique des rendez-vous :</strong> Liste de vos consultations passées et futures</li>
                <li><strong>Documents personnels :</strong> PDF générés, analyses, notes de consultations</li>
                <li><strong>Messages du jour :</strong> Historique de vos tirages quotidiens</li>
                <li><strong>Préférences :</strong> Paramètres de notification et préférences d'affichage</li>
              </Typography>
            </Box>

            {/* Section 4 : Données conservées */}
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
                4. Données conservées (obligations légales)
              </Typography>
              <Typography variant="body1" paragraph>
                Conformément à la législation française, certaines données doivent être <strong>conservées temporairement</strong> pour des raisons légales et comptables :
              </Typography>
              <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
                <li><strong>Données de facturation :</strong> Conservées 10 ans (obligation légale comptable)</li>
                <li><strong>Données de transaction Stripe :</strong> Conservées selon les obligations légales de paiement</li>
                <li><strong>Logs de connexion :</strong> Conservés 1 an maximum (sécurité et prévention de la fraude)</li>
              </Typography>
              <Typography variant="body1" paragraph sx={{ mt: 2 }}>
                Ces données sont conservées de manière sécurisée et ne sont <strong>jamais réutilisées</strong> à des fins commerciales. Elles sont automatiquement supprimées à l'issue des délais légaux.
              </Typography>
            </Box>

            {/* Section 5 : Conséquences */}
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
                5. Conséquences de la suppression
              </Typography>
              <Typography variant="body1" paragraph>
                ⚠️ <strong>Important :</strong> La suppression de votre compte est <strong>irréversible</strong>.
              </Typography>
              <Typography variant="body1" paragraph>
                Après la suppression :
              </Typography>
              <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
                <li>Vous ne pourrez plus vous connecter à votre compte</li>
                <li>Toutes vos données seront définitivement perdues</li>
                <li>Vos rendez-vous futurs seront annulés</li>
                <li>Vous ne pourrez plus accéder à vos documents et analyses</li>
                <li>Les intervenants avec lesquels vous aviez des rendez-vous seront notifiés de l'annulation</li>
              </Typography>
            </Box>

            {/* Section 6 : Alternative */}
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
                6. Vous hésitez ? Alternatives à la suppression
              </Typography>
              <Typography variant="body1" paragraph>
                Si vous souhaitez faire une pause sans perdre vos données, vous pouvez :
              </Typography>
              <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
                <li><strong>Désactiver les notifications :</strong> Dans les paramètres de votre compte</li>
                <li><strong>Ne plus utiliser l'application :</strong> Sans supprimer votre compte</li>
                <li><strong>Modifier vos données :</strong> Exercer votre droit de rectification</li>
                <li><strong>Exporter vos données :</strong> Demander une copie de vos informations (droit à la portabilité)</li>
              </Typography>
              <Typography variant="body1" paragraph sx={{ mt: 2 }}>
                Pour exercer ces droits, contactez-nous à{' '}
                <a href="mailto:contact@fl2m.fr" style={{ color: '#FFD700', textDecoration: 'none', fontWeight: 600 }}>
                  contact@fl2m.fr
                </a>
              </Typography>
            </Box>

            {/* Section 7 : Contact */}
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
                7. Questions ou problèmes ?
              </Typography>
              <Typography variant="body1" paragraph>
                Si vous avez des questions concernant la suppression de votre compte ou vos données personnelles, contactez-nous :
              </Typography>
              <Typography variant="body1" sx={{ pl: 2 }}>
                <strong>Email :</strong> contact@fl2m.fr<br />
                <strong>Objet :</strong> "Suppression de compte - Question"<br />
                <strong>Courrier :</strong> FL2M IPS, 6 rue Albert Nicolas, 26600 Tain-l'Hermitage, France
              </Typography>
            </Box>

            {/* Section 8 : Réclamation CNIL */}
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
                8. Droit de réclamation
              </Typography>
              <Typography variant="body1" paragraph>
                Si vous estimez que vos droits concernant la protection de vos données personnelles ne sont pas respectés, vous pouvez introduire une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés) :
              </Typography>
              <Typography variant="body1" sx={{ pl: 2 }}>
                <strong>CNIL</strong><br />
                3 Place de Fontenoy<br />
                TSA 80715<br />
                75334 Paris Cedex 07<br />
                Téléphone : 01 53 73 22 22<br />
                Site web :{' '}
                <a
                  href="https://www.cnil.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#FFD700', textDecoration: 'none', fontWeight: 600 }}
                >
                  www.cnil.fr
                </a>
              </Typography>
            </Box>

            {/* CTA final */}
            <Box sx={{ textAlign: 'center', mt: 6, pt: 4, borderTop: '1px solid #e0e0e0' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1D3461' }}>
                Prêt à supprimer votre compte ?
              </Typography>
              <Typography variant="body1" paragraph sx={{ mb: 3 }}>
                Cliquez sur le bouton ci-dessous pour nous envoyer votre demande par email
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<EmailIcon />}
                onClick={handleEmailClick}
                sx={{
                  backgroundColor: '#1D3461',
                  px: 4,
                  py: 1.5,
                  '&:hover': {
                    backgroundColor: '#152847',
                  },
                }}
              >
                Demander la suppression de mon compte
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default SuppressionComptePage;
