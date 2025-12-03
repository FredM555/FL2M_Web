import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  Divider,
  Alert,
  Container,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { Practitioner } from '../../services/supabase';

interface PractitionerProfilePreviewProps {
  practitioner: Practitioner;
}

const PractitionerProfilePreview: React.FC<PractitionerProfilePreviewProps> = ({ practitioner }) => {
  const displayName = practitioner.display_name || `${practitioner.profile?.first_name} ${practitioner.profile?.last_name}`;

  // Si le profil est inactif, afficher un message d'avertissement
  if (!practitioner.is_active) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Profil Inactif
          </Typography>
          <Typography variant="body2">
            Votre profil est actuellement <strong>inactif</strong> et ne peut pas être visible dans la liste publique des intervenants,
            même si vous activez la visibilité.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Veuillez contacter un administrateur pour réactiver votre profil.
          </Typography>
        </Alert>
      </Box>
    );
  }


  // Obtenir les initiales pour l'avatar
  const getInitials = () => {
    if (practitioner.display_name) {
      return practitioner.display_name.charAt(0);
    } else if (practitioner.profile) {
      return practitioner.profile.first_name.charAt(0);
    }
    return 'I';
  };

  // Obtenir la photo de profil si elle existe
  const getProfilePhoto = () => {
    const name = displayName.toLowerCase();
    // Vérifier si c'est Frédéric (ou Frederic)
    if (name.includes('frédéric') || name.includes('frederic')) {
      return '/images/Frederic.png';
    }
    return null;
  };

  // Formatage du texte avec des paragraphes
  const formatBio = (bio: string) => {
    if (!bio) return null;

    return bio.split('\n').map((paragraph, index) => (
      <Typography key={index} variant="body1" paragraph sx={{ lineHeight: 1.7, color: 'text.secondary' }}>
        {paragraph}
      </Typography>
    ));
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Voici comment les utilisateurs verront votre profil. Cette mise en page correspond à l'affichage public.
        </Typography>
      </Alert>

      <Box sx={{ width: '100%', position: 'relative', minHeight: '70vh' }}>
        {/* Image de fond - détail intervenant */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
            backgroundImage: 'url(/images/IntervenantDetail.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.7,
            pointerEvents: 'none',
            borderRadius: 3
          }}
        />
        {/* Overlay pour adoucir l'image */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
            background: 'linear-gradient(180deg, rgba(248, 249, 250, 0.3) 0%, rgba(233, 236, 239, 0.35) 50%, rgba(222, 226, 230, 0.4) 100%)',
            pointerEvents: 'none',
            borderRadius: 3
          }}
        />
        <Box
          sx={{
            width: '100%',
            background: 'rgba(245, 247, 250, 0.6)',
            backdropFilter: 'blur(2px)',
            py: 4,
            position: 'relative',
            zIndex: 1,
            borderRadius: 3
          }}
        >
          <Container maxWidth="lg">
            <Grid container spacing={4}>
              {/* Profil et informations de contact */}
              <Grid item xs={12} md={4}>
                <Card
                  elevation={0}
                  sx={{
                    mb: 3,
                    background: 'white',
                    border: '2px solid rgba(255, 215, 0, 0.3)',
                    borderRadius: 3,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: 'linear-gradient(90deg, #FFD700, #FFA500)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 165, 0, 0.05) 100%)',
                      pt: 4,
                      pb: 3,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      borderBottom: '1px solid rgba(255, 215, 0, 0.2)',
                    }}
                  >
                    <Avatar
                      src={getProfilePhoto() || undefined}
                      sx={{
                        width: 150,
                        height: 150,
                        fontSize: '3.5rem',
                        background: getProfilePhoto() ? 'transparent' : 'linear-gradient(135deg, #FFD700, #FFA500)',
                        mb: 2,
                        border: '4px solid white',
                        boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)',
                      }}
                    >
                      {!getProfilePhoto() && getInitials()}
                    </Avatar>
                    <Typography variant="h4" align="center" sx={{ color: '#1a1a2e', fontWeight: 600 }}>
                      {displayName}
                    </Typography>
                    {practitioner.title && (
                      <Chip
                        label={practitioner.title}
                        sx={{
                          mt: 1,
                          background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                          color: '#1a1a2e',
                          fontWeight: 600,
                          border: '1px solid rgba(255, 165, 0, 0.3)',
                        }}
                      />
                    )}
                  </Box>
                  <CardContent sx={{ p: 3 }}>
                    {practitioner.profile?.email && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <EmailIcon sx={{ mr: 2, color: '#FFA500' }} />
                        <Typography variant="body2">
                          {practitioner.profile.email}
                        </Typography>
                      </Box>
                    )}

                    {practitioner.profile?.phone && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <PhoneIcon sx={{ mr: 2, color: '#FFA500' }} />
                        <Typography variant="body2">
                          {practitioner.profile.phone}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>

                {/* Domaines d'expertise */}
                <Card
                  elevation={0}
                  sx={{
                    background: 'white',
                    border: '2px solid rgba(255, 215, 0, 0.3)',
                    borderRadius: 3,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: 'linear-gradient(90deg, #FFD700, #FFA500)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1a1a2e' }}>
                      Domaines d'expertise
                    </Typography>
                    <Divider sx={{ mb: 2, borderColor: 'rgba(255, 215, 0, 0.2)' }} />
                    {practitioner?.expertise_domains && practitioner.expertise_domains.length > 0 ? (
                      <List dense disablePadding>
                        {practitioner.expertise_domains.map((domain, index) => (
                          <ListItem key={index} disableGutters sx={{ pb: 1 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <CheckCircleIcon fontSize="small" sx={{ color: '#FFA500' }} />
                            </ListItemIcon>
                            <ListItemText primary={domain} />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Aucun domaine d'expertise renseigné
                      </Typography>
                    )}

                    {/* Formations et diplômes */}
                    {practitioner?.qualifications && practitioner.qualifications.length > 0 && (
                      <>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1a1a2e', mt: 3 }}>
                          Formations / Diplômes
                        </Typography>
                        <Divider sx={{ mb: 2, borderColor: 'rgba(255, 215, 0, 0.2)' }} />
                        <List dense disablePadding>
                          {practitioner.qualifications.map((qualification, index) => (
                            <ListItem key={index} disableGutters sx={{ pb: 1 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <CheckCircleIcon fontSize="small" sx={{ color: '#FFA500' }} />
                              </ListItemIcon>
                              <ListItemText primary={qualification} />
                            </ListItem>
                          ))}
                        </List>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Biographie et informations principales */}
              <Grid item xs={12} md={8}>
                <Card
                  elevation={0}
                  sx={{
                    background: 'white',
                    border: '2px solid rgba(255, 215, 0, 0.3)',
                    borderRadius: 3,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: 'linear-gradient(90deg, #FFD700, #FFA500)',
                    },
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a1a2e', mb: 2 }}>
                      À propos
                    </Typography>
                    <Divider sx={{ mb: 3, borderColor: 'rgba(255, 215, 0, 0.2)' }} />

                    {practitioner.summary && (
                      <Typography variant="subtitle1" paragraph sx={{ fontWeight: 500, lineHeight: 1.7 }}>
                        {practitioner.summary}
                      </Typography>
                    )}

                    {practitioner.bio ? (
                      formatBio(practitioner.bio)
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Aucune biographie renseignée
                      </Typography>
                    )}

                    {/* Message si profil incomplet */}
                    {(!practitioner.summary && !practitioner.bio &&
                      (!practitioner.expertise_domains || practitioner.expertise_domains.length === 0) &&
                      (!practitioner.qualifications || practitioner.qualifications.length === 0)) && (
                      <Alert severity="warning" sx={{ mt: 3, borderRadius: 2 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                          Profil incomplet
                        </Typography>
                        <Typography variant="body2">
                          Votre profil est actuellement vide. Ajoutez des informations dans l'onglet "Mon Profil"
                          pour le rendre plus attractif et professionnel pour vos clients potentiels.
                        </Typography>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Container>
        </Box>
      </Box>
    </Box>
  );
};

export default PractitionerProfilePreview;
