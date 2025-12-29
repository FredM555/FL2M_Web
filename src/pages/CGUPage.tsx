// src/pages/CGUPage.tsx
import React from 'react';
import { Box, Container, Typography, Divider, Paper } from '@mui/material';

const CGUPage: React.FC = () => {
  return (
    <Box sx={{ width: '100%', position: 'relative', minHeight: '100vh' }}>
      {/* Image de fond - CGU */}
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
            md: 'url(/images/CGU.jpg)'
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
                Conditions Générales d'Utilisation (CGU)
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
              Les présentes Conditions Générales d'Utilisation (ci-après "CGU") régissent l'utilisation du site internet FL²M accessible à l'adresse https://fl2m.fr (ci-après "le Site").
            </Typography>
            <Typography variant="body1" paragraph>
              L'utilisation du Site implique l'acceptation pleine et entière des présentes CGU. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser le Site.
            </Typography>
          </Box>

          {/* Section 1 : Objet */}
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
              1. Objet
            </Typography>
            <Typography variant="body1" paragraph>
              Les présentes CGU ont pour objet de définir les modalités et conditions d'utilisation des services proposés sur le Site, ainsi que les droits et obligations des parties dans ce cadre.
            </Typography>
            <Typography variant="body1" paragraph>
              FL²M propose des services de numérologie stratégique destinés aux particuliers, professionnels et sportifs, incluant notamment :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>Des consultations personnalisées en numérologie</li>
              <li>Des analyses numérologique pour le développement personnel et professionnel</li>
              <li>La prise de rendez-vous en ligne avec des intervenants</li>
              <li>Des modules et programmes dédiés</li>
            </Typography>
          </Box>

          {/* Section 2 : Mentions légales */}
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
              2. Mentions légales
            </Typography>
            <Typography variant="body1" sx={{ pl: 2 }}>
              <strong>Éditeur du site :</strong> FL2M IPS<br />
              <strong>Siège social :</strong> 6 rue Albert Nicolas, 26600 Tain-l'Hermitage, France<br />
              <strong>SIREN :</strong> 982131260<br />
              <strong>SIRET :</strong> 98213126000019<br />
              <strong>TVA intracommunautaire :</strong> FR71982131260<br />
              <strong>Représentant légal :</strong> Frédéric Ménard<br />
              <strong>Email :</strong> contact@fl2m.fr
            </Typography>
          </Box>

          {/* Section 3 : Accès au site */}
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
              3. Accès au Site
            </Typography>
            <Typography variant="body1" paragraph>
              Le Site est accessible gratuitement à tout utilisateur disposant d'un accès à internet. Tous les frais liés à l'accès au Site, que ce soit les frais matériels, logiciels ou d'accès à internet, sont exclusivement à la charge de l'utilisateur.
            </Typography>
            <Typography variant="body1" paragraph>
              FL²M met en œuvre tous les moyens raisonnables à sa disposition pour assurer un accès de qualité au Site. Toutefois, FL²M ne peut garantir une disponibilité du Site à 100% et se réserve le droit d'interrompre, de suspendre momentanément ou de modifier sans préavis l'accès à tout ou partie du Site.
            </Typography>
            <Typography variant="body1" paragraph>
              L'utilisateur reconnaît que FL²M ne saurait être tenue responsable en cas d'impossibilité d'accès au Site, quelle qu'en soit la cause.
            </Typography>
          </Box>

          {/* Section 4 : Création de compte */}
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
              4. Création de compte utilisateur
            </Typography>
            <Typography variant="body1" paragraph>
              L'utilisation de certaines fonctionnalités du Site (prise de rendez-vous, accès aux consultations, etc.) nécessite la création d'un compte utilisateur.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              4.1. Inscription
            </Typography>
            <Typography variant="body1" paragraph>
              Pour créer un compte, l'utilisateur doit :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>Être majeur ou avoir l'autorisation de ses représentants légaux</li>
              <li>Fournir des informations exactes, à jour et complètes</li>
              <li>Créer un mot de passe sécurisé</li>
              <li>Accepter les présentes CGU et la Politique de Confidentialité</li>
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              4.2. Sécurité du compte
            </Typography>
            <Typography variant="body1" paragraph>
              L'utilisateur est responsable du maintien de la confidentialité de ses identifiants de connexion et de toutes les activités effectuées sous son compte.
            </Typography>
            <Typography variant="body1" paragraph>
              L'utilisateur s'engage à informer immédiatement FL²M de toute utilisation non autorisée de son compte.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              4.3. Suspension et suppression de compte
            </Typography>
            <Typography variant="body1" paragraph>
              FL²M se réserve le droit de suspendre ou de supprimer un compte en cas de :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>Violation des présentes CGU</li>
              <li>Fourniture d'informations fausses ou trompeuses</li>
              <li>Comportement frauduleux ou abusif</li>
              <li>Inactivité prolongée du compte</li>
            </Typography>
          </Box>

          {/* Section 5 : Services proposés */}
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
              5. Services proposés
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              5.1. Prise de rendez-vous
            </Typography>
            <Typography variant="body1" paragraph>
              Les utilisateurs peuvent réserver des rendez-vous avec des intervenants en numérologie via la plateforme. La disponibilité des intervenants est mise à jour régulièrement.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              5.2. Consultations
            </Typography>
            <Typography variant="body1" paragraph>
              Les consultations peuvent être effectuées :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>En visioconférence</li>
              <li>Par téléphone</li>
              <li>En présentiel (selon disponibilité)</li>
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              5.3. Nature des prestations
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Important :</strong> Les services de numérologie proposés par FL²M sont destinés à des fins de développement personnel et professionnel. Ils ne constituent en aucun cas :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>Un avis médical, psychologique ou psychiatrique</li>
              <li>Un conseil juridique ou financier</li>
              <li>Une garantie de résultats spécifiques</li>
            </Typography>
            <Typography variant="body1" paragraph sx={{ mt: 2 }}>
              Les utilisateurs sont encouragés à consulter des professionnels qualifiés pour toute question médicale, psychologique, juridique ou financière.
            </Typography>
          </Box>

          {/* Section 6 : Tarifs et paiement */}
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
              6. Tarifs et paiement
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              6.1. Tarifs
            </Typography>
            <Typography variant="body1" paragraph>
              Les tarifs des services sont indiqués en euros TTC (toutes taxes comprises) sur le Site. FL²M se réserve le droit de modifier ses tarifs à tout moment, étant entendu que le prix applicable sera celui en vigueur au moment de la réservation.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              6.2. Modalités de paiement
            </Typography>
            <Typography variant="body1" paragraph>
              Les paiements sont effectués de manière sécurisée via Stripe. Les moyens de paiement acceptés sont :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>Carte bancaire (Visa, Mastercard, American Express)</li>
              <li>Autres moyens proposés par Stripe</li>
            </Typography>
            <Typography variant="body1" paragraph sx={{ mt: 2 }}>
              Le paiement est généralement exigé au moment de la réservation, sauf indication contraire.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              6.3. Facturation
            </Typography>
            <Typography variant="body1" paragraph>
              Une facture est automatiquement générée et envoyée par email après chaque paiement.
            </Typography>
          </Box>

          {/* Section 7 : Annulation et remboursement */}
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
              7. Annulation et remboursement
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              7.1. Annulation par l'utilisateur
            </Typography>
            <Typography variant="body1" paragraph>
              Les rendez-vous peuvent être annulés ou reportés directement depuis votre espace personnel selon les conditions suivantes :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li><strong>Plus de 48 heures avant le rendez-vous :</strong> Remboursement intégral ou report gratuit</li>
              <li><strong>Entre 24 et 48 heures avant :</strong> Remboursement à 50% ou crédit pour une consultation ultérieure</li>
              <li><strong>Moins de 24 heures avant :</strong> Aucun remboursement, possibilité de report selon disponibilité de l'intervenant (des frais peuvent s'appliquer)</li>
              <li><strong>Non-présentation sans annulation :</strong> Aucun remboursement ni crédit</li>
            </Typography>
            <Typography variant="body1" paragraph sx={{ mt: 2 }}>
              Pour annuler ou reporter un rendez-vous, rendez-vous dans votre espace "Mes rendez-vous" ou contactez-nous à contact@fl2m.fr.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              7.2. Annulation par le consultant
            </Typography>
            <Typography variant="body1" paragraph>
              En cas d'annulation par le consultant, l'utilisateur sera informé dans les plus brefs délais et pourra choisir entre :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>Un remboursement intégral</li>
              <li>La reprogrammation du rendez-vous</li>
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              7.3. Procédure de remboursement
            </Typography>
            <Typography variant="body1" paragraph>
              Les remboursements sont effectués dans un délai maximum de 14 jours ouvrés sur le même moyen de paiement que celui utilisé pour la transaction initiale (carte bancaire via Stripe).
            </Typography>
            <Typography variant="body1" paragraph>
              Vous recevrez une confirmation par email une fois le remboursement traité. Le délai d'apparition sur votre relevé bancaire dépend de votre établissement financier (généralement 2 à 5 jours ouvrés supplémentaires).
            </Typography>
          </Box>

          {/* Section 8 : Droit de rétractation */}
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
              8. Droit de rétractation
            </Typography>
            <Typography variant="body1" paragraph>
              Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation ne peut être exercé pour les contrats de prestation de services pleinement exécutés avant la fin du délai de rétractation et dont l'exécution a commencé après accord préalable exprès du consommateur et renoncement exprès à son droit de rétractation.
            </Typography>
            <Typography variant="body1" paragraph>
              En réservant une consultation, l'utilisateur accepte expressément que la prestation commence avant l'expiration du délai de rétractation de 14 jours et renonce à son droit de rétractation une fois la consultation effectuée.
            </Typography>
          </Box>

          {/* Section 9 : Obligations de l'utilisateur */}
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
              9. Obligations de l'utilisateur
            </Typography>
            <Typography variant="body1" paragraph>
              L'utilisateur s'engage à :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>Utiliser le Site conformément à sa destination et aux présentes CGU</li>
              <li>Ne pas perturber ou tenter de perturber le fonctionnement du Site</li>
              <li>Ne pas utiliser le Site à des fins illégales ou frauduleuses</li>
              <li>Ne pas diffuser de contenu illicite, offensant, diffamatoire ou portant atteinte aux droits de tiers</li>
              <li>Respecter les droits de propriété intellectuelle de FL²M et des tiers</li>
              <li>Fournir des informations exactes et les maintenir à jour</li>
              <li>Se présenter à l'heure aux rendez-vous réservés</li>
              <li>Respecter les consultants et les autres utilisateurs</li>
            </Typography>
          </Box>

          {/* Section 10 : Propriété intellectuelle */}
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
              10. Propriété intellectuelle
            </Typography>
            <Typography variant="body1" paragraph>
              L'ensemble du contenu du Site (structure, textes, images, graphismes, logos, icônes, sons, logiciels, etc.) est la propriété exclusive de FL²M ou de ses partenaires.
            </Typography>
            <Typography variant="body1" paragraph>
              Toute reproduction, représentation, modification, publication, transmission, dénaturation, totale ou partielle du Site ou de son contenu, par quelque procédé que ce soit, et sur quelque support que ce soit est interdite sans l'autorisation écrite préalable de FL²M.
            </Typography>
            <Typography variant="body1" paragraph>
              Tout utilisateur qui contreviendrait à ces dispositions s'exposerait à des poursuites judiciaires.
            </Typography>
          </Box>

          {/* Section 11 : Données personnelles */}
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
              11. Protection des données personnelles
            </Typography>
            <Typography variant="body1" paragraph>
              Le traitement des données personnelles des utilisateurs est effectué conformément à notre{' '}
              <a href="/politique-confidentialite" style={{ color: '#FFD700', textDecoration: 'none', fontWeight: 600 }}>
                Politique de Confidentialité
              </a>, qui fait partie intégrante des présentes CGU.
            </Typography>
          </Box>

          {/* Section 12 : Responsabilité */}
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
              12. Limitation de responsabilité
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              12.1. Contenu du Site
            </Typography>
            <Typography variant="body1" paragraph>
              FL²M s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur le Site. Toutefois, FL²M ne peut garantir l'exactitude, la précision ou l'exhaustivité des informations mises à disposition.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              12.2. Disponibilité du Site
            </Typography>
            <Typography variant="body1" paragraph>
              FL²M ne saurait être tenue responsable :
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
              <li>Des interruptions ou dysfonctionnements du Site</li>
              <li>Des dommages résultant de l'intrusion frauduleuse d'un tiers</li>
              <li>De la perte de données ou d'informations</li>
              <li>Des virus informatiques</li>
              <li>De l'utilisation du Site ou de l'impossibilité de l'utiliser</li>
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
              12.3. Prestations
            </Typography>
            <Typography variant="body1" paragraph>
              Les consultations de numérologie sont fournies à titre informatif et de développement personnel. FL²M ne peut être tenue responsable des décisions prises par l'utilisateur sur la base des informations reçues lors des consultations.
            </Typography>
          </Box>

          {/* Section 13 : Force majeure */}
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
              13. Force majeure
            </Typography>
            <Typography variant="body1" paragraph>
              FL²M ne pourra être tenue responsable de tout retard ou inexécution de ses obligations résultant d'un cas de force majeure, notamment en cas de perturbations ou grèves totales ou partielles, d'inondation, d'incendie, de guerre, d'embargo, de réquisition, ou de toute autre circonstance indépendante de sa volonté.
            </Typography>
          </Box>

          {/* Section 14 : Liens hypertextes */}
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
              14. Liens hypertextes
            </Typography>
            <Typography variant="body1" paragraph>
              Le Site peut contenir des liens vers des sites tiers. FL²M n'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu, leur disponibilité et leur politique de confidentialité.
            </Typography>
            <Typography variant="body1" paragraph>
              La création de liens vers le Site est soumise à l'accord préalable écrit de FL²M.
            </Typography>
          </Box>

          {/* Section 15 : Modifications des CGU */}
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
              15. Modification des CGU
            </Typography>
            <Typography variant="body1" paragraph>
              FL²M se réserve le droit de modifier les présentes CGU à tout moment. Les nouvelles CGU seront portées à la connaissance des utilisateurs via le Site.
            </Typography>
            <Typography variant="body1" paragraph>
              Les CGU applicables sont celles en vigueur au jour de l'utilisation du Site. La poursuite de l'utilisation du Site après modification des CGU vaut acceptation des nouvelles CGU.
            </Typography>
          </Box>

          {/* Section 16 : Résiliation */}
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
              16. Résiliation
            </Typography>
            <Typography variant="body1" paragraph>
              L'utilisateur peut supprimer son compte à tout moment depuis les paramètres de son compte ou en contactant le service client.
            </Typography>
            <Typography variant="body1" paragraph>
              FL²M se réserve le droit de suspendre ou de résilier l'accès au Site d'un utilisateur en cas de violation des présentes CGU, sans préavis ni indemnité.
            </Typography>
          </Box>

          {/* Section 17 : Droit applicable */}
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
              17. Droit applicable et juridiction compétente
            </Typography>
            <Typography variant="body1" paragraph>
              Les présentes CGU sont régies par le droit français.
            </Typography>
            <Typography variant="body1" paragraph>
              En cas de litige, les parties s'efforceront de trouver une solution amiable. À défaut d'accord amiable dans un délai de 30 jours, le litige sera porté devant les tribunaux compétents selon les règles de droit commun.
            </Typography>
            <Typography variant="body1" paragraph>
              Conformément à l'article L.612-1 du Code de la consommation, l'utilisateur consommateur peut recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable du litige.
            </Typography>
          </Box>

          {/* Section 18 : Contact */}
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
              18. Contact
            </Typography>
            <Typography variant="body1" paragraph>
              Pour toute question concernant les présentes CGU, vous pouvez nous contacter :
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

          {/* Acceptation */}
          <Box sx={{ mb: 4, mt: 6, p: 3, bgcolor: '#f9f9f9', borderRadius: 2, border: '1px solid #e0e0e0' }}>
            <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
              Acceptation des CGU
            </Typography>
            <Typography variant="body1">
              En utilisant le Site FL²M, vous reconnaissez avoir lu, compris et accepté les présentes Conditions Générales d'Utilisation dans leur intégralité.
            </Typography>
          </Box>
        </Paper>
      </Container>
      </Box>
    </Box>
  );
};

export default CGUPage;
