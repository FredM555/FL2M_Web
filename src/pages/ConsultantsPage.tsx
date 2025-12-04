// src/pages/ConsultantsPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Avatar,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  IconButton
} from '@mui/material';
import { supabase } from '../services/supabase';
import { Link as RouterLink } from 'react-router-dom';
import SacredGeometryBackground from '../components/SacredGeometryBackground';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { UserAvatar } from '../components/profile/UserAvatar';

// Interface pour les intervenants
interface Consultant {
  id: string;
  user_id: string;
  bio: string;
  priority: number;
  display_name?: string;
  title?: string;
  summary?: string;
  is_active: boolean;
  profile_visible: boolean;
  expertise_domains?: string[];
  qualifications?: string[];
  profile?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
    racine1?: number;
    racine2?: number;
    tronc?: number;
    dynamique_de_vie?: number;
  }
}

const ConsultantsPage: React.FC = () => {
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConsultants();
  }, []);

  const fetchConsultants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('practitioners')
        .select(`
          *,
          profile:profiles(first_name, last_name, email, phone, avatar_url)
        `)
        .eq('is_active', true)
        .eq('profile_visible', true)
        .order('priority', { ascending: false });

      if (error) throw error;

      // Récupérer les données de numérologie pour chaque intervenant
      const consultantsWithNumerology = await Promise.all(
        (data || []).map(async (consultant) => {
          try {
            const { data: numerologyData } = await supabase.rpc('get_public_practitioner_numerology', {
              p_user_id: consultant.user_id
            });

            // Ajouter les données de numérologie au profil si disponibles
            if (numerologyData && numerologyData.length > 0 && consultant.profile) {
              const numData = numerologyData[0];
              consultant.profile.tronc = numData.tronc;
              consultant.profile.racine1 = numData.racine_1;
              consultant.profile.racine2 = numData.racine_2;
              consultant.profile.dynamique_de_vie = numData.dynamique_de_vie;
            }
          } catch (err) {
            console.warn('Erreur lors de la récupération de la numérologie pour', consultant.user_id, err);
          }
          return consultant;
        })
      );

      setConsultants(consultantsWithNumerology);
    } catch (err: any) {
      console.error('Erreur lors du chargement des intervenants:', err);
      setError('Impossible de charger la liste des intervenants. Veuillez réessayer plus tard.');
    } finally {
      setLoading(false);
    }
  };

  // Obtenir le nom complet de l'intervenant
  const getConsultantName = (consultant: Consultant) => {
    if (consultant.display_name) {
      return consultant.display_name;
    } else if (consultant.profile) {
      return `${consultant.profile.first_name} ${consultant.profile.last_name}`;
    }
    return 'Intervenant';
  };

  // Générer les initiales pour l'avatar
  const getInitials = (consultant: Consultant) => {
    if (consultant.display_name) {
      return consultant.display_name.charAt(0);
    } else if (consultant.profile) {
      return consultant.profile.first_name.charAt(0);
    }
    return 'I';
  };

  // Obtenir la photo de profil si elle existe
  const getProfilePhoto = (consultant: Consultant) => {
    // Utiliser avatar_url du profil s'il existe
    if (consultant.profile?.avatar_url) {
      return consultant.profile.avatar_url;
    }
    // Fallback pour Frédéric (ancien système)
    const name = getConsultantName(consultant).toLowerCase();
    if (name.includes('frédéric') || name.includes('frederic')) {
      return '/images/Frederic.png';
    }
    return null;
  };

  // Fonction pour tronquer le texte
  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
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
          <CircularProgress sx={{ color: '#FFA500' }} />
          <Typography variant="h6" sx={{ mt: 2, color: '#1a1a2e' }}>
            Chargement des intervenants...
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Box sx={{ width: '100%', position: 'relative', minHeight: '100vh' }}>
      {/* Image de fond - nos intervenants */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          backgroundImage: 'url(/images/NosIntervenants.jpg)',
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
          background: 'rgba(245, 247, 250, 0.6)',
          backdropFilter: 'blur(2px)',
          py: 4,
          mt: { xs: '23px', md: '10px' },
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              mb: 1,
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
            }}
          >
            <Box
              sx={{
                background: 'linear-gradient(135deg, #345995 0%, #1D3461 100%)',
                color: 'white',
                p: 3,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <SacredGeometryBackground theme="particuliers" />
              <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
                <Typography
                  variant="h2"
                  component="h1"
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '1.5rem', md: '2.5rem' },
                    textAlign: 'center',
                    background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 2px 8px rgba(255, 215, 0, 0.3))',
                    mb: 1,
                  }}
                >
                  Nos Intervenants
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 400,
                    color: 'rgba(255, 255, 255, 0.9)',
                    lineHeight: 1.7,
                    textAlign: 'center',
                    maxWidth: '800px',
                    mx: 'auto',
                  }}
                >
                  Découvrez notre équipe de professionnels qualifiés prêts à vous accompagner dans votre parcours
                </Typography>
              </Container>
            </Box>
          </Box>

        <Box
          sx={{
            py: 3
          }}
        >
          <Container maxWidth="lg">
          {error ? (
            <Alert severity="error" sx={{ mb: 4 }}>
              {error}
            </Alert>
          ) : consultants.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: 'center',
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
              <Typography variant="h6" sx={{ color: '#1a1a2e' }}>
                Aucun intervenant disponible pour le moment.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                Veuillez revenir ultérieurement ou nous contacter directement.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={4} justifyContent="center">
              {consultants.map((consultant) => (
                <Grid item xs={12} sm={consultants.length === 1 ? 12 : 6} md={consultants.length === 1 ? 8 : 4} key={consultant.id}>
                  <Card
                    elevation={0}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      background: 'white',
                      border: '2px solid rgba(255, 215, 0, 0.3)',
                      borderRadius: 3,
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: 'linear-gradient(90deg, #FFD700, #FFA500)',
                      },
                      '&:hover': {
                        borderColor: '#FFA500',
                        boxShadow: '0 12px 40px rgba(255, 215, 0, 0.25)',
                        transform: 'translateY(-8px)',
                      }
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
                      <IconButton
                        component={RouterLink}
                        to={`/consultants/${consultant.id}`}
                        sx={{
                          mb: 2,
                          p: 0,
                          '&:hover': {
                            transform: 'scale(1.05)',
                          },
                          transition: 'transform 0.3s ease',
                        }}
                      >
                        <UserAvatar
                          avatarUrl={consultant.profile?.avatar_url}
                          firstName={consultant.profile?.first_name || consultant.display_name}
                          lastName={consultant.profile?.last_name}
                          racine1={consultant.profile?.racine1}
                          racine2={consultant.profile?.racine2}
                          tronc={consultant.profile?.tronc}
                          dynamique_de_vie={consultant.profile?.dynamique_de_vie}
                          size={100}
                          sx={{
                            border: '4px solid white',
                            boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)',
                          }}
                        />
                      </IconButton>
                      <Typography variant="h5" component="h2" align="center" sx={{ color: '#1a1a2e', fontWeight: 600 }}>
                        {getConsultantName(consultant)}
                      </Typography>
                      {consultant.title && (
                        <Chip
                          label={consultant.title}
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

                    <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
                      <Typography variant="body2" color="text.secondary" paragraph sx={{ lineHeight: 1.7 }}>
                        {truncateText(consultant.summary || consultant.bio || '', 550)}
                      </Typography>

                      <Box sx={{ mt: 'auto' }}>
                        <Button
                          variant="contained"
                          fullWidth
                          component={RouterLink}
                          to={`/prendre-rendez-vous?consultant=${consultant.id}`}
                          startIcon={<CalendarMonthIcon />}
                          sx={{
                            mb: 1.5,
                            background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                            color: '#1a1a2e',
                            fontWeight: 600,
                            boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              background: 'linear-gradient(45deg, #FFA500, #FFD700)',
                              transform: 'translateY(-2px)',
                              boxShadow: '0 6px 20px rgba(255, 215, 0, 0.4)',
                            },
                          }}
                        >
                          Prendre rendez-vous
                        </Button>

                        <Button
                          variant="outlined"
                          fullWidth
                          component={RouterLink}
                          to={`/consultants/${consultant.id}`}
                          startIcon={<PersonIcon />}
                          sx={{
                            borderColor: 'rgba(255, 215, 0, 0.5)',
                            color: '#FFA500',
                            fontWeight: 600,
                            '&:hover': {
                              borderColor: '#FFA500',
                              backgroundColor: 'rgba(255, 215, 0, 0.1)',
                            },
                          }}
                        >
                          Voir le profil
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          <Box
            sx={{
              mt: 8,
              textAlign: 'center',
              p: 4,
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
            <Typography
              variant="h5"
              gutterBottom
              sx={{
                fontWeight: 600,
                color: '#1a1a2e',
                mb: 2,
              }}
            >
              Besoin d'assistance pour choisir votre intervenant?
            </Typography>
            <Typography variant="body1" paragraph sx={{ color: 'text.secondary', lineHeight: 1.7, mb: 3 }}>
              Notre équipe se tient à votre disposition pour vous aider à trouver l'intervenant qui correspond le mieux à vos besoins.
            </Typography>
            <Button
              variant="contained"
              size="large"
              component={RouterLink}
              to="/contact"
              startIcon={<EmailIcon />}
              sx={{
                px: 4,
                py: 1.5,
                background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                color: '#1a1a2e',
                fontWeight: 600,
                borderRadius: 50,
                boxShadow: '0 8px 25px rgba(255, 215, 0, 0.3)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: 'linear-gradient(45deg, #FFA500, #FFD700)',
                  transform: 'translateY(-3px)',
                  boxShadow: '0 12px 35px rgba(255, 215, 0, 0.4)',
                },
              }}
            >
              Contactez-nous
            </Button>
          </Box>
          </Container>
        </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default ConsultantsPage;
