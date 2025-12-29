// src/pages/MentionsLegalesPage.tsx
import React from 'react';
import { Box, Container, Typography, Divider, Paper } from '@mui/material';

const MentionsLegalesPage: React.FC = () => {
  return (
    <Box sx={{ width: '100%', position: 'relative', minHeight: '100vh' }}>
      {/* Image de fond - mentions légales */}
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
            md: 'url(/images/MentionLegale.jpg)'
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
            Mentions Légales
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              mb: 4,
            }}
          >
            Dernière mise à jour : 29 décembre 2025
          </Typography>

          <Divider sx={{ mb: 4 }} />

          {/* Section 1 : Éditeur du site */}
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
              1. Éditeur du site
            </Typography>
            <Typography variant="body1" paragraph>
              Le site FL²M (https://fl2m.fr) est édité par :
            </Typography>
            <Typography variant="body1" component="div" sx={{ pl: 2 }}>
              <strong>Raison sociale :</strong> FL2M IPS<br />
              <strong>Siège social :</strong> 6 rue Albert Nicolas, 26600 Tain-l'Hermitage, France<br />
              <strong>SIREN :</strong> 982131260<br />
              <strong>SIRET :</strong> 98213126000019<br />
              <strong>TVA intracommunautaire :</strong> FR71982131260<br />
              <strong>Email :</strong> contact@fl2m.fr<br />
              <strong>Téléphone :</strong> [À compléter si souhaité]<br />
            </Typography>
          </Box>

          {/* Section 2 : Directeur de la publication */}
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
              2. Directeur de la publication
            </Typography>
            <Typography variant="body1" sx={{ pl: 2 }}>
              <strong>Nom :</strong> Frédéric Ménard<br />
              <strong>Qualité :</strong> Dirigeant
            </Typography>
          </Box>

          {/* Section 3 : Hébergeurs */}
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
              3. Hébergement
            </Typography>
            <Typography variant="body1" paragraph>
              Le site FL²M utilise plusieurs services d'hébergement :
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              3.1. Hébergement du site web (frontend)
            </Typography>
            <Typography variant="body1" sx={{ pl: 2 }}>
              <strong>Raison sociale :</strong> Vercel Inc.<br />
              <strong>Adresse :</strong> 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis<br />
              <strong>Site web :</strong> https://vercel.com<br />
              <strong>Note :</strong> Hébergement du site web (interface utilisateur)
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              3.2. Hébergement des données (backend)
            </Typography>
            <Typography variant="body1" sx={{ pl: 2 }}>
              <strong>Raison sociale :</strong> Supabase Inc.<br />
              <strong>Adresse :</strong> 970 Toa Payoh North, #07-04, Singapore 318992<br />
              <strong>Site web :</strong> https://supabase.com<br />
              <strong>Note :</strong> Les données personnelles, rendez-vous et documents sont hébergés dans des centres de données situés dans l'Union Européenne, conformément au RGPD.
            </Typography>
          </Box>

          {/* Section 4 : Propriété intellectuelle */}
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
              4. Propriété intellectuelle
            </Typography>
            <Typography variant="body1" paragraph>
              L'ensemble du contenu de ce site (textes, images, vidéos, logos, icônes, etc.) est la propriété exclusive de FL²M, sauf mention contraire.
            </Typography>
            <Typography variant="body1" paragraph>
              Toute reproduction, distribution, modification, adaptation, retransmission ou publication de ces différents éléments est strictement interdite sans l'accord écrit de FL²M.
            </Typography>
            <Typography variant="body1" paragraph>
              La marque FL²M et son logo sont des marques déposées. Toute utilisation non autorisée de ces marques constitue une contrefaçon.
            </Typography>
          </Box>

          {/* Section 5 : Données personnelles */}
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
              5. Données personnelles
            </Typography>
            <Typography variant="body1" paragraph>
              FL²M s'engage à protéger les données personnelles de ses utilisateurs conformément au Règlement Général sur la Protection des Données (RGPD).
            </Typography>
            <Typography variant="body1" paragraph>
              Pour plus d'informations sur la collecte et le traitement de vos données personnelles, consultez notre{' '}
              <a href="/politique-confidentialite" style={{ color: '#FFD700', textDecoration: 'none', fontWeight: 600 }}>
                Politique de Confidentialité
              </a>.
            </Typography>
          </Box>

          {/* Section 6 : Cookies */}
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
              6. Cookies et technologies similaires
            </Typography>
            <Typography variant="body1" paragraph>
              Le site FL²M utilise des cookies et des technologies de stockage local pour assurer son bon fonctionnement et améliorer votre expérience.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              6.1. Cookies strictement nécessaires
            </Typography>
            <Typography variant="body1" paragraph>
              Ces cookies sont indispensables au fonctionnement du site :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li><strong>Cookies d'authentification (Supabase) :</strong> Gèrent votre connexion et votre session utilisateur (clés commençant par "sb-")</li>
              <li><strong>Stockage local (localStorage) :</strong> Conserve votre session de manière sécurisée</li>
              <li><strong>Cookies de sécurité :</strong> Protègent contre les attaques CSRF et garantissent la sécurité de vos données</li>
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              6.2. Gestion des cookies
            </Typography>
            <Typography variant="body1" paragraph>
              Vous pouvez configurer votre navigateur pour refuser les cookies. Toutefois, cela empêchera l'utilisation de certaines fonctionnalités essentielles du site, notamment la connexion à votre compte.
            </Typography>
            <Typography variant="body1" paragraph>
              Pour plus d'informations sur la gestion des cookies, consultez la section dédiée dans notre{' '}
              <a href="/politique-confidentialite" style={{ color: '#FFD700', textDecoration: 'none', fontWeight: 600 }}>
                Politique de Confidentialité
              </a>.
            </Typography>
          </Box>

          {/* Section 7 : Responsabilité */}
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
              7. Limitation de responsabilité
            </Typography>
            <Typography variant="body1" paragraph>
              FL²M s'efforce de fournir des informations exactes et à jour sur ce site. Toutefois, FL²M ne peut garantir l'exactitude, la précision ou l'exhaustivité des informations mises à disposition.
            </Typography>
            <Typography variant="body1" paragraph>
              FL²M décline toute responsabilité en cas de dommages directs ou indirects résultant de l'utilisation de ce site ou de l'impossibilité de l'utiliser.
            </Typography>
          </Box>

          {/* Section 8 : Liens hypertextes */}
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
              8. Liens hypertextes
            </Typography>
            <Typography variant="body1" paragraph>
              Ce site peut contenir des liens vers des sites externes. FL²M n'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu.
            </Typography>
          </Box>

          {/* Section 9 : Droit applicable */}
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
              9. Droit applicable et juridiction
            </Typography>
            <Typography variant="body1" paragraph>
              Les présentes mentions légales sont régies par le droit français.
            </Typography>
            <Typography variant="body1" paragraph>
              En cas de litige, et à défaut d'accord amiable, les tribunaux français seront seuls compétents.
            </Typography>
          </Box>

          {/* Section 10 : Contact */}
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
              10. Contact
            </Typography>
            <Typography variant="body1" paragraph>
              Pour toute question concernant ces mentions légales, vous pouvez nous contacter :
            </Typography>
            <Typography variant="body1" sx={{ pl: 2 }}>
              <strong>Par email :</strong> contact@fl2m.fr<br />
              <strong>Par courrier :</strong> FL2M IPS, 6 rue Albert Nicolas, 26600 Tain-l'Hermitage, France<br />
              <strong>Via le formulaire de contact :</strong>{' '}
              <a href="/contact" style={{ color: '#FFD700', textDecoration: 'none', fontWeight: 600 }}>
                Page Contact
              </a>
            </Typography>
          </Box>
        </Paper>
      </Container>
      </Box>
    </Box>
  );
};

export default MentionsLegalesPage;
