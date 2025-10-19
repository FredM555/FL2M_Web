import React from 'react';
import {
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Container,
  Box,
  IconButton,
  Tooltip
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import SacredGeometryBackground from '../../components/SacredGeometryBackground';

// Interface pour les modules
interface ModuleInfo {
  titre: string;
  description: string;
  icone: React.ElementType;
  lien: string;
}

const Particuliers: React.FC = () => {
  const navigate = useNavigate();

  // Configuration des modules
  const modules: ModuleInfo[] = [
    {
      titre: 'Module Adulte',
      description: 'Un parcours personnel pour apprendre à se connaître et à s’épanouir pleinement.',
      icone: PersonIcon,
      lien: '/particuliers/module-adultes'
    },
    {
      titre: 'Module Couple',
      description: 'Approfondir la communication et la compréhension mutuelle au sein du couple.',
      icone: GroupIcon,
      lien: '/particuliers/module-couples'
    },
    {
      titre: 'Module Enfant',
      description: 'Accompagnement pour développer le potentiel et l\'épanouissement de l\'enfant.',
      icone: ChildCareIcon,
      lien: '/particuliers/module-enfants'
    },
    {
      titre: 'Suivi Annuel (Climat)',
      description: 'Bilan annuel personnalisé pour maintenir et améliorer votre équilibre personnel.',
      icone: CalendarTodayIcon,
      lien: '/particuliers/module-suivi-annuel'
    }
  ];

  return (
    <Box sx={{ width: '100%', position: 'relative', minHeight: '100vh' }}>
      {/* Image de fond - personne réflexive */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          backgroundImage: 'url(/images/particuliers-reflection.jpg)',
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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 1 }}>
              <Tooltip title="Suivi Annuel (Climat)" placement="right">
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
                  <ArrowBackIcon />
                </IconButton>
              </Tooltip>

              <Typography
                variant="h2"
                component="h1"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '2rem', md: '2.5rem' },
                  textAlign: 'center',
                  background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 2px 8px rgba(255, 215, 0, 0.3))',
                }}
              >
                Modules Particuliers
              </Typography>

              <Tooltip title="Module Adultes" placement="left">
                <IconButton
                  onClick={() => navigate('/particuliers/module-adultes')}
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
              Des accompagnements personnalisés pour révéler votre potentiel et celui de vos proches
            </Typography>
          </Container>
        </Box>
        </Box>

        {/* Section des modules */}
        <Box
          sx={{
            py: 3
            
          }}
        >
          <Grid container spacing={4} justifyContent="center">
          {modules.map((module, index) => (
            <Grid item xs={12} sm={6} md={6} key={index}>
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
                    borderColor: '#FFD700',
                    boxShadow: '0 12px 40px rgba(255, 215, 0, 0.25)',
                    transform: 'translateY(-8px)',
                  }
                }}
              >
                <CardContent
                  sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    p: 3
                  }}
                >
                  <module.icone
                    sx={{
                      fontSize: 60,
                      color: '#FFD700',
                      mb: 2
                    }}
                  />
                  <Typography
                    variant="h5"
                    gutterBottom
                    sx={{
                      fontWeight: 600,
                      color: '#1a1a2e',
                      mb: 2
                    }}
                  >
                    {module.titre}
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{
                      flexGrow: 1,
                      mb: 3,
                      lineHeight: 1.7
                    }}
                  >
                    {module.description}
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => navigate(module.lien)}
                    sx={{
                      background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                      color: '#1a1a2e',
                      fontWeight: 600,
                      px: 3,
                      py: 1,
                      borderRadius: 50,
                      boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #FFA500, #FFD700)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 20px rgba(255, 215, 0, 0.4)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Découvrir
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
          </Grid>
        </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default Particuliers;