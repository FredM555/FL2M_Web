// src/pages/ConsultantDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Avatar,
  Button,
  Card,
  CardContent,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Breadcrumbs,
  Link
} from '@mui/material';
import { supabase } from '../services/supabase';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
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

const ConsultantDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [consultant, setConsultant] = useState<Consultant | null>(null);
  const [allConsultants, setAllConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Charger tous les intervenants
  useEffect(() => {
    fetchAllConsultants();
  }, []);

  // Charger l'intervenant courant
  useEffect(() => {
    if (id) {
      fetchConsultant(id);
    } else {
      setError("Identifiant d'intervenant manquant");
      setLoading(false);
    }
  }, [id]);

  const fetchAllConsultants = async () => {
    try {
      const { data, error } = await supabase
        .from('practitioners')
        .select(`
          id,
          user_id,
          bio,
          priority,
          display_name,
          title,
          summary,
          is_active,
          profile_visible,
          expertise_domains,
          qualifications,
          profile:profiles!user_id(first_name, last_name, email, phone, avatar_url)
        `)
        .eq('is_active', true)
        .eq('profile_visible', true)
        .order('priority', { ascending: false });

      if (error) throw error;

      // Transform data to match Consultant type (profile is returned as array by Supabase)
      const transformedData = (data || []).map(item => ({
        ...item,
        profile: Array.isArray(item.profile) && item.profile.length > 0 ? item.profile[0] : item.profile
      })) as Consultant[];

      setAllConsultants(transformedData);
    } catch (err: any) {
      console.error('Erreur lors du chargement des intervenants:', err);
    }
  };

  const fetchConsultant = async (consultantId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('practitioners')
        .select(`
          *,
          profile:profiles(first_name, last_name, email, phone, avatar_url)
        `)
        .eq('id', consultantId)
        .eq('is_active', true)
        .eq('profile_visible', true)
        .single();

      if (error) throw error;

      if (!data) {
        throw new Error("Intervenant non trouvé ou profil masqué");
      }

      // Récupérer les données de numérologie du bénéficiaire "self" de l'intervenant via RPC publique
      if (data.user_id) {
        try {
          const { data: numerologyData, error: numerologyError } = await supabase.rpc('get_public_practitioner_numerology', {
            p_user_id: data.user_id
          });

          console.log('[ConsultantDetail] Données numérologie récupérées:', numerologyData);

          // Ajouter les données de numérologie au profil si disponibles
          if (!numerologyError && numerologyData && numerologyData.length > 0 && data.profile) {
            const numData = numerologyData[0];
            data.profile.tronc = numData.tronc;
            data.profile.racine1 = numData.racine_1;
            data.profile.racine2 = numData.racine_2;
            data.profile.dynamique_de_vie = numData.dynamique_de_vie;
            console.log('[ConsultantDetail] Données numérologie ajoutées au profil:', {
              tronc: data.profile.tronc,
              racine1: data.profile.racine1,
              racine2: data.profile.racine2,
              dynamique_de_vie: data.profile.dynamique_de_vie
            });
          } else if (numerologyError) {
            console.warn('[ConsultantDetail] Erreur récupération numérologie:', numerologyError);
          }
        } catch (err) {
          console.error('[ConsultantDetail] Exception lors de la récupération des données numérologie:', err);
        }
      }

      setConsultant(data);

      // Trouver l'index de l'intervenant courant
      const index = allConsultants.findIndex(c => c.id === consultantId);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement de l\'intervenant:', err);
      setError('Intervenant non trouvé ou non disponible.');
    } finally {
      setLoading(false);
    }
  };

  // Navigation vers l'intervenant précédent
  const handlePrevious = () => {
    if (allConsultants.length === 0) return;
    const prevIndex = currentIndex === 0 ? allConsultants.length - 1 : currentIndex - 1;
    navigate(`/consultants/${allConsultants[prevIndex].id}`);
  };

  // Navigation vers l'intervenant suivant
  const handleNext = () => {
    if (allConsultants.length === 0) return;
    const nextIndex = currentIndex === allConsultants.length - 1 ? 0 : currentIndex + 1;
    navigate(`/consultants/${allConsultants[nextIndex].id}`);
  };

  // Obtenir le nom complet de l'intervenant
  const getConsultantName = () => {
    if (!consultant) return '';

    if (consultant.display_name) {
      return consultant.display_name;
    } else if (consultant.profile) {
      return `${consultant.profile.first_name} ${consultant.profile.last_name}`;
    }
    return 'Intervenant';
  };

  // Générer les initiales pour l'avatar
  const getInitials = () => {
    if (!consultant) return 'I';

    if (consultant.display_name) {
      return consultant.display_name.charAt(0);
    } else if (consultant.profile) {
      return consultant.profile.first_name.charAt(0);
    }
    return 'I';
  };

  // Obtenir la photo de profil si elle existe
  const getProfilePhoto = () => {
    if (!consultant) return null;
    // Utiliser avatar_url du profil s'il existe
    if (consultant.profile?.avatar_url) {
      return consultant.profile.avatar_url;
    }
    // Fallback pour Frédéric (ancien système)
    const name = getConsultantName().toLowerCase();
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

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3, mt: { xs: '23px', md: '40px' } }}>
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
            Chargement du profil...
          </Typography>
        </Paper>
      </Container>
    );
  }

  if (error || !consultant) {
    return (
      <Box
        sx={{
          width: '100%',
          background: 'linear-gradient(to bottom, rgba(255, 215, 0, 0.03) 0%, rgba(255, 165, 0, 0.02) 100%)',
          minHeight: '100vh',
          py: 6,
          mt: { xs: '23px', md: '10px' },
        }}
      >
        <Container maxWidth="lg">
          <Button
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            component={RouterLink}
            to="/consultants"
            sx={{
              mb: 3,
              borderColor: 'rgba(255, 215, 0, 0.5)',
              color: '#FFA500',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#FFA500',
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
              },
            }}
          >
            Retour aux intervenants
          </Button>

          <Alert severity="error" sx={{ mb: 4 }}>
            {error || "Cet intervenant n'existe pas ou n'est pas disponible."}
          </Alert>

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
            <Typography variant="h6" sx={{ color: '#1a1a2e', mb: 3 }}>
              Consultez nos autres intervenants disponibles.
            </Typography>
            <Button
              variant="contained"
              component={RouterLink}
              to="/consultants"
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
              Voir tous les intervenants
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', position: 'relative', minHeight: '100vh' }}>
      {/* Image de fond - détail intervenant */}
      <Box
        sx={{
          position: 'fixed',
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
          width: '100%',
          background: 'rgba(245, 247, 250, 0.6)',
          backdropFilter: 'blur(2px)',
          minHeight: '100vh',
          py: 4,
          mt: { xs: '23px', md: '40px' },
          position: 'relative',
          zIndex: 1,
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
                <UserAvatar
                  avatarUrl={consultant.profile?.avatar_url}
                  firstName={consultant.profile?.first_name || consultant.display_name}
                  lastName={consultant.profile?.last_name}
                  racine1={consultant.profile?.racine1}
                  racine2={consultant.profile?.racine2}
                  tronc={consultant.profile?.tronc}
                  dynamique_de_vie={consultant.profile?.dynamique_de_vie}
                  size={150}
                  sx={{
                    mb: 2,
                    border: '4px solid white',
                    boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)',
                  }}
                />
                <Typography variant="h4" align="center" sx={{ color: '#1a1a2e', fontWeight: 600 }}>
                  {getConsultantName()}
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
              <CardContent sx={{ p: 3 }}>
                {consultant.profile?.email && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <EmailIcon sx={{ mr: 2, color: '#FFA500' }} />
                    <Typography variant="body2">
                      {consultant.profile.email}
                    </Typography>
                  </Box>
                )}

                {consultant.profile?.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PhoneIcon sx={{ mr: 2, color: '#FFA500' }} />
                    <Typography variant="body2">
                      {consultant.profile.phone}
                    </Typography>
                  </Box>
                )}

                <Button
                  variant="contained"
                  fullWidth
                  component={RouterLink}
                  to={`/prendre-rendez-vous?consultant=${consultant.id}`}
                  startIcon={<CalendarMonthIcon />}
                  size="large"
                  sx={{
                    mt: 2,
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
                {consultant?.expertise_domains && consultant.expertise_domains.length > 0 ? (
                  <List dense disablePadding>
                    {consultant.expertise_domains.map((domain, index) => (
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
                {consultant?.qualifications && consultant.qualifications.length > 0 && (
                  <>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1a1a2e', mt: 3 }}>
                      Formations / Diplômes
                    </Typography>
                    <Divider sx={{ mb: 2, borderColor: 'rgba(255, 215, 0, 0.2)' }} />
                    <List dense disablePadding>
                      {consultant.qualifications.map((qualification, index) => (
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
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    mb: 2,
                    gap: { xs: 1, sm: 0 }
                  }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a1a2e' }}>
                    À propos
                  </Typography>

                  {/* Flèches de navigation */}
                  {allConsultants.length > 1 && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        onClick={handlePrevious}
                        size="small"
                        sx={{
                          border: '2px solid rgba(255, 215, 0, 0.3)',
                          color: '#FFA500',
                          '&:hover': {
                            borderColor: '#FFA500',
                            backgroundColor: 'rgba(255, 215, 0, 0.1)',
                          },
                        }}
                      >
                        <ArrowBackIosIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        onClick={handleNext}
                        size="small"
                        sx={{
                          border: '2px solid rgba(255, 215, 0, 0.3)',
                          color: '#FFA500',
                          '&:hover': {
                            borderColor: '#FFA500',
                            backgroundColor: 'rgba(255, 215, 0, 0.1)',
                          },
                        }}
                      >
                        <ArrowForwardIosIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Box>
                <Divider sx={{ mb: 3, borderColor: 'rgba(255, 215, 0, 0.2)' }} />

                {consultant.summary && (
                  <Typography variant="subtitle1" paragraph sx={{ fontWeight: 500, lineHeight: 1.7 }}>
                    {consultant.summary}
                  </Typography>
                )}

                {formatBio(consultant.bio)}

                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1a1a2e' }}>
                    Accompagnement proposé
                  </Typography>
                  <Divider sx={{ mb: 2, borderColor: 'rgba(255, 215, 0, 0.2)' }} />
                  <Typography variant="body1" paragraph sx={{ lineHeight: 1.7, color: 'text.secondary' }}>
                    Notre intervenant vous accompagne de manière personnalisée pour répondre à vos besoins spécifiques.
                    Chaque parcours est adapté à votre situation et vos objectifs.
                  </Typography>

                  <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid item xs={12} sm={6}>
                      <Card
                        variant="outlined"
                        sx={{
                          border: '2px solid rgba(255, 215, 0, 0.3)',
                          borderRadius: 2,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            borderColor: '#FFA500',
                            boxShadow: '0 4px 15px rgba(255, 215, 0, 0.2)',
                          },
                        }}
                      >
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: '#1a1a2e' }}>
                            Séance individuelle
                          </Typography>
                          <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.secondary' }}>
                            Consultation personnalisée adaptée à vos besoins spécifiques.
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Card
                        variant="outlined"
                        sx={{
                          border: '2px solid rgba(255, 215, 0, 0.3)',
                          borderRadius: 2,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            borderColor: '#FFA500',
                            boxShadow: '0 4px 15px rgba(255, 215, 0, 0.2)',
                          },
                        }}
                      >
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: '#1a1a2e' }}>
                            Suivi régulier
                          </Typography>
                          <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.secondary' }}>
                            Programme d'accompagnement avec séance de suivi annuelle pour des résultats plus durables.
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  <Button
                    variant="contained"
                    size="large"
                    component={RouterLink}
                    to={`/prendre-rendez-vous?consultant=${consultant.id}`}
                    sx={{
                      mt: 4,
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
                    Prendre rendez-vous maintenant
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
      </Box>
    </Box>
  );
};

export default ConsultantDetailPage;
