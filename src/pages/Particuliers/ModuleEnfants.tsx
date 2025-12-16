import React, { useState, useEffect } from 'react';
import {
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Box,
  IconButton,
  Tooltip,
  Link
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SportsIcon from '@mui/icons-material/SportsScore';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import SacredGeometryBackground from '../../components/SacredGeometryBackground';

// Interface du Service récupéré depuis Supabase
interface Service {
  id: string;
  code: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  duration: number;
  description: string;
}

const ModuleEnfants: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // États pour gérer les données et le chargement
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Code du service Module Enfant
  const moduleCode = 'PAEN';

  // Caractéristiques spécifiques au module Enfant
  const caracteristiques = [
    {
      titre: 'Développement Cognitif',
      description: 'Stimulez les capacités d\'apprentissage et la curiosité.',
      icone: SchoolIcon
    },
    {
      titre: 'Intelligence Émotionnelle',
      description: 'Développez la conscience et la gestion des émotions.',
      icone: PsychologyIcon
    },
    {
      titre: 'Confiance en Soi',
      description: 'Construisez l\'estime et la confiance de votre enfant.',
      icone: SportsIcon
    }
  ];

  // Charger les données du service
  useEffect(() => {
    const fetchServiceData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('code', moduleCode)
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setService(data as Service);
        }
      } catch (err) {
        console.error('Erreur lors du chargement du service:', err);
        setError('Impossible de charger les informations du service.');
      } finally {
        setLoading(false);
      }
    };

    fetchServiceData();
  }, []);

  // Gestionnaire de clic pour le bouton de réservation
  const handleReservationClick = () => {
    if (service) {
      if (!user) {
        navigate('/login', {
          state: {
            from: '/prendre-rendez-vous',
            preSelectedServiceId: service.id,
            preSelectedCategory: service.category
          }
        });
      } else {
        navigate('/prendre-rendez-vous', {
          state: {
            preSelectedServiceId: service.id,
            preSelectedCategory: service.category
          }
        });
      }
    } else {
      navigate('/prendre-rendez-vous');
    }
  };

  // Afficher un indicateur de chargement
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Chargement des informations du module...
        </Typography>
      </Container>
    );
  }

  // Afficher un message d'erreur
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ width: '100%', position: 'relative', minHeight: '100vh' }}>
      {/* Image de fond - enfant */}
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
            md: 'url(/images/ModuleEnfant.jpg)'
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
          background: 'rgba(245, 247, 250, 0.6)',
          backdropFilter: 'blur(2px)',
          py: { xs: 2, md: 4 },
          mt: { xs: '80px', md: '40px' },
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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 1 }}>
              <Tooltip title="Module Couples" placement="right">
                <IconButton
                  onClick={() => navigate('/particuliers/module-couples')}
                  sx={{
                    color: 'rgba(255, 215, 0, 0.8)',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      color: '#FFD700',
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                      transform: 'scale(1.1)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <ArrowBackIcon />
                </IconButton>
              </Tooltip>

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
                }}
              >
                Module Enfant : Activer son Potentiel
              </Typography>

              <Tooltip title="Module Suivi Annuel" placement="left">
                <IconButton
                  onClick={() => navigate('/particuliers/module-suivi-annuel')}
                  sx={{
                    color: 'rgba(255, 215, 0, 0.8)',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      color: '#FFD700',
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                      transform: 'scale(1.1)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <ArrowForwardIcon />
                </IconButton>
              </Tooltip>
            </Box>
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
              Un accompagnement personnalisé pour aider votre enfant
              à développer ses talents, sa confiance et son potentiel unique.
            </Typography>
          </Container>
        </Box>
        </Box>

        <Box
          sx={{
            py: 3
            
          }}
        >
          {/* Caractéristiques du Module */}
          <Grid container spacing={4} sx={{ mb: 2 }}>
          {caracteristiques.map((caract, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
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
                    borderColor: '#FFD700',
                    boxShadow: '0 12px 40px rgba(255, 215, 0, 0.25)',
                    transform: 'translateY(-8px)',
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <caract.icone
                    sx={{
                      fontSize: 60,
                      color: '#FFD700',
                      mb: 2
                    }}
                  />
                  <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, color: '#1a1a2e' }}>
                    {caract.titre}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {caract.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Section Détails */}
        <Grid container spacing={4} sx={{ mb: 1 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#1a1a2e', mb: 2 }}>
              Objectifs du Module
            </Typography>
            <Typography variant="body1" paragraph sx={{ lineHeight: 1.7, color: 'text.secondary' }}>
              - Stimuler le développement cognitif
              - Renforcer l'intelligence émotionnelle
              - Développer la confiance en soi
              - Encourager la curiosité et l'apprentissage
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#1a1a2e', mb: 2 }}>
              Approches et outils
            </Typography>
            <Typography variant="body1" paragraph sx={{ lineHeight: 1.7, color: 'text.secondary' }}>
              - Séances ludiques d'apprentissage
              - Coaching de développement personnel
              - Techniques de gestion émotionnelle
              - Activités de stimulation cognitive
            </Typography>
          </Grid>
        </Grid>

        {/* Informations prix et durée */}
        {service && (
          <Typography
            variant="h6"
            align="center"
            sx={{ mb: 2, fontWeight: 600, color: '#1a1a2e' }}
          >
            Durée: {service.duration} minutes
            {service.price !== 9999 && ` | Prix:à partir de  ${service.price} €`}
          </Typography>
        )}

        {/* Bouton de Réservation ou Nous Consulter */}
        <Box sx={{ textAlign: 'center' }}>
          {service && service.price === 9999 ? (
            <Button
              variant="contained"
              size="large"
              component={RouterLink}
              to="/contact?subject=Informations sur une prestation&module=Module Enfants"
              sx={{
                px: 6,
                py: 2,
                fontSize: '1.1rem',
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
              Nous Consulter
            </Button>
          ) : (
            <Button
              variant="contained"
              size="large"
              onClick={handleReservationClick}
              sx={{
                px: 6,
                py: 2,
                fontSize: '1.1rem',
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
              disabled={!service}
            >
              Réserver une Session
            </Button>
          )}
        </Box>
        </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default ModuleEnfants;
