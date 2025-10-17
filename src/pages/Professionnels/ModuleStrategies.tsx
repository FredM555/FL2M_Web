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
  Tooltip
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

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

const ModuleStrategies: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const moduleCode = 'PRST';

  const caracteristiques = [
    {
      titre: 'Vision Stratégique',
      description: 'Clarifiez votre cap et vos objectifs à long terme.',
      icone: VisibilityIcon
    },
    {
      titre: 'Performance Globale',
      description: 'Optimisez vos leviers de croissance et de performance.',
      icone: BarChartIcon
    },
    {
      titre: 'Innovation Stratégique',
      description: 'Développez des approches innovantes et différenciantes.',
      icone: EmojiObjectsIcon
    }
  ];

  useEffect(() => {
    const fetchServiceData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('code', moduleCode)
          .single();

        if (error) throw error;
        if (data) setService(data as Service);
      } catch (err) {
        console.error('Erreur lors du chargement du service:', err);
        setError('Impossible de charger les informations du service.');
      } finally {
        setLoading(false);
      }
    };

    fetchServiceData();
  }, []);

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

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          py: 4,
          mt: { xs: '23px', md: '40px' },
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
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '400px',
                  height: '400px',
                  background: 'radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, transparent 70%)',
                  transform: 'translate(30%, -30%)',
                },
              }}
            >
          <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 1 }}>
            <Tooltip title="Module Associés" placement="right">
              <IconButton
                onClick={() => navigate('/professionnels/module-associes')}
                sx={{
                  color: 'rgba(100, 149, 237, 0.8)',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    color: '#6495ED',
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
                  background: 'linear-gradient(45deg, #4169E1, #6495ED)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 2px 8px rgba(100, 149, 237, 0.3))',
                }}
              >
                Module Stratégie : Session Kairos
              </Typography>

              <Tooltip title="Retour à la liste des modules" placement="left">
                <IconButton
                  onClick={() => navigate('/professionnels')}
                  sx={{
                    color: 'rgba(100, 149, 237, 0.8)',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      color: '#6495ED',
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                      transform: 'scale(1.1)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <HomeIcon />
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
              Une session immersive de réflexion stratégique pour
              transformer vos défis en opportunités et définir une feuille de route ambitieuse.
            </Typography>
          </Container>
        </Box>
        </Box>

        <Box
          sx={{
            py: 0
          }}
        >
          <Grid container spacing={4} sx={{ mb: 2 }}>
            {caracteristiques.map((caract, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    background: 'white',
                    border: '2px solid rgba(100, 149, 237, 0.3)',
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
                      background: 'linear-gradient(90deg, #4169E1, #6495ED)',
                    },
                    '&:hover': {
                      borderColor: '#6495ED',
                      boxShadow: '0 12px 40px rgba(100, 149, 237, 0.25)',
                      transform: 'translateY(-8px)',
                    }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <caract.icone sx={{ fontSize: 60, color: '#4169E1', mb: 2 }} />
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

          <Grid container spacing={4} sx={{ mb: 1 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#1a1a2e', mb: 2 }}>
                Objectifs du Module
              </Typography>
              <Typography variant="body1" paragraph sx={{ lineHeight: 1.7, color: 'text.secondary' }}>
                - Définir une vision stratégique claire<br />
                - Identifier les axes de développement<br />
                - Anticiper les opportunités et défis<br />
                - Construire un plan d'action concret<br />
                - Stimuler l'innovation et la différenciation
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#1a1a2e', mb: 2 }}>
                Méthodes d'Accompagnement
              </Typography>
              <Typography variant="body1" paragraph sx={{ lineHeight: 1.7, color: 'text.secondary' }}>
                - Atelier de prospective stratégique<br />
                - Diagnostic approfondi<br />
                - Techniques de créativité stratégique<br />
                - Analyse comparative<br />
                - Simulation de scénarios futurs
              </Typography>
            </Grid>
          </Grid>

          {service && (
            <Typography variant="h6" align="center" sx={{ mb: 2, fontWeight: 600, color: '#1a1a2e' }}>
              Durée: {service.duration} minutes | Prix: {service.price} €
            </Typography>
          )}

          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleReservationClick}
              sx={{
                px: 6,
                py: 2,
                fontSize: '1.1rem',
                background: 'linear-gradient(45deg, #4169E1, #6495ED)',
                color: 'white',
                fontWeight: 600,
                borderRadius: 50,
                boxShadow: '0 8px 25px rgba(65, 105, 225, 0.3)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: 'linear-gradient(45deg, #6495ED, #4169E1)',
                  transform: 'translateY(-3px)',
                  boxShadow: '0 12px 35px rgba(65, 105, 225, 0.4)',
                },
              }}
              disabled={!service}
            >
              Réserver une Session
            </Button>
          </Box>
        </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default ModuleStrategies;
