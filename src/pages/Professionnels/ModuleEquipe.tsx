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
import PeopleIcon from '@mui/icons-material/People';
import WorkTogetherIcon from '@mui/icons-material/Groups';
import LeadershipIcon from '@mui/icons-material/EmojiPeople';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

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

const ModuleEquipe: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const moduleCode = 'PREQ';

  const caracteristiques = [
    {
      titre: 'Intelligence Collective',
      description: 'Stimulez la synergie et la créativité collective.',
      icone: PeopleIcon
    },
    {
      titre: 'Collaboration Efficace',
      description: 'Optimisez les interactions et la communication d\'équipe.',
      icone: WorkTogetherIcon
    },
    {
      titre: 'Leadership Partagé',
      description: 'Développez une culture de leadership et d\'autonomie.',
      icone: LeadershipIcon
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
          position: 'relative',
          minHeight: '162px',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          color: 'white',
          overflow: 'hidden',
          mt: { xs: '23px', md: '40px' },
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.05,
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255,255,255,0.03) 50px, rgba(255,255,255,0.03) 51px),
              repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255,255,255,0.03) 50px, rgba(255,255,255,0.03) 51px)
            `,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: '250px',
            height: '250px',
            border: '2px solid rgba(100, 149, 237, 0.1)',
            borderRadius: '50%',
            top: '-50px',
            right: '-50px',
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
            <Tooltip title="Module Coéquipiers" placement="right">
              <IconButton
                onClick={() => navigate('/professionnels/module-coequipiers')}
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
              Module Équipe : S'Élever Ensemble
            </Typography>

            <Tooltip title="Module Candidats" placement="left">
              <IconButton
                onClick={() => navigate('/professionnels/module-candidats')}
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
                <ArrowForwardIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography
            variant="h6"
            paragraph
            sx={{
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.9)',
              lineHeight: 1.7,
              textAlign: 'center',
              maxWidth: '800px',
              mx: 'auto',
            }}
          >
            Un accompagnement global pour renforcer la cohésion,
            la performance et l'épanouissement collectif de votre équipe.
          </Typography>
        </Container>
      </Box>

      <Box
        sx={{
          background: 'linear-gradient(to bottom, rgba(65, 105, 225, 0.03) 0%, rgba(100, 149, 237, 0.02) 100%)',
          py: 6
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} sx={{ mb: 4 }}>
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

          <Grid container spacing={4} sx={{ mb: 6 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#1a1a2e', mb: 2 }}>
                Objectifs du Module
              </Typography>
              <Typography variant="body1" paragraph sx={{ lineHeight: 1.7, color: 'text.secondary' }}>
                - Renforcer la cohésion et la dynamique collective<br />
                - Développer l'intelligence et la performance d'équipe<br />
                - Favoriser une communication transparente<br />
                - Cultiver un leadership agile et collaboratif
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#1a1a2e', mb: 2 }}>
                Méthodes d'Accompagnement
              </Typography>
              <Typography variant="body1" paragraph sx={{ lineHeight: 1.7, color: 'text.secondary' }}>
                - Séminaires de team building<br />
                - Ateliers de communication<br />
                - Coaching d'équipe<br />
                - Techniques de résolution collaborative<br />
                - Diagnostic de dynamique collective
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
                py: 1.5,
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
        </Container>
      </Box>
    </Box>
  );
};

export default ModuleEquipe;
