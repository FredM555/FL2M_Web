// Section pour la page d'accueil - Message du Jour
import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FavoriteIcon from '@mui/icons-material/Favorite';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { useNavigate } from 'react-router-dom';

const DailyDrawHomeSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        py: 3,
        position: 'relative',
        background: 'transparent',
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <AutoAwesomeIcon
            sx={{
              fontSize: 48,
              mb: 1,
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.5))',
            }}
          />
          <Typography
            variant="h4"
            component="h2"
            gutterBottom
            fontWeight="bold"
            sx={{
              background: 'linear-gradient(135deg, #1D3461 0%, #345995 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Votre Message du Jour
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 800, mx: 'auto' }}>
            Découvrez chaque jour votre message personnalisé basé sur votre date de naissance
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={4}>
            <Paper
              elevation={3}
              sx={{
                p: 2,
                textAlign: 'center',
                height: '100%',
                backgroundColor: 'white',
                border: '2px solid',
                borderColor: 'primary.light',
                borderRadius: 3,
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: 6,
                  backgroundColor: 'rgba(103, 126, 234, 0.05)'
                }
              }}
            >
              <FavoriteIcon sx={{ fontSize: 36, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom fontWeight="bold" color="text.primary">
                Personnalisé
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                Calculé à partir de votre jour et mois de naissance pour
                une guidance qui vous correspond
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper
              elevation={3}
              sx={{
                p: 2,
                textAlign: 'center',
                height: '100%',
                backgroundColor: 'white',
                border: '2px solid',
                borderColor: 'secondary.light',
                borderRadius: 3,
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: 6,
                  backgroundColor: 'rgba(156, 39, 176, 0.05)'
                }
              }}
            >
              <TrendingUpIcon sx={{ fontSize: 36, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom fontWeight="bold" color="text.primary">
                Quotidien
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                Un nouveau message chaque jour pour vous accompagner
                dans votre évolution personnelle
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper
              elevation={3}
              sx={{
                p: 2,
                textAlign: 'center',
                height: '100%',
                backgroundColor: 'white',
                border: '2px solid',
                borderColor: 'success.light',
                borderRadius: 3,
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: 6,
                  backgroundColor: 'rgba(76, 175, 80, 0.05)'
                }
              }}
            >
              <LightbulbIcon sx={{ fontSize: 36, color: 'success.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom fontWeight="bold" color="text.primary">
                Gratuit
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                Sans inscription, sans engagement. Juste votre prénom
                et votre date de naissance
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ textAlign: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/message-du-jour')}
            sx={{
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              color: '#1D3461',
              py: 1.2,
              px: 4,
              fontSize: '1rem',
              fontWeight: 'bold',
              borderRadius: 3,
              boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #FFC700 0%, #FF9500 100%)',
                boxShadow: '0 6px 16px rgba(255, 215, 0, 0.4)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s'
            }}
          >
            Découvrir mon message du jour
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default DailyDrawHomeSection;
