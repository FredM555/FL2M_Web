import React from 'react';
import {
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  Container,
  IconButton,
  Tooltip
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
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

const Sportifs: React.FC = () => {
  const navigate = useNavigate();

  // Configuration des modules
  const modules: ModuleInfo[] = [
    {
      titre: 'Module Solo',
      description: 'Parcours de performance individuelle pour optimiser votre potentiel athlétique.',
      icone: PersonIcon,
      lien: '/sportifs/module-solo'
    },
    {
      titre: 'Module Team',
      description: 'Développement de la cohésion et de la performance collective.',
      icone: GroupIcon,
      lien: '/sportifs/module-team'
    }
  ];

  return (
    <Box sx={{ width: '100%', position: 'relative', minHeight: '100vh' }}>
      {/* Image de fond - sportifs */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          backgroundImage: 'url(/images/ModuleSportif.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.5,
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
              <SacredGeometryBackground theme="sportifs" />
              <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 1 }}>
                  <Tooltip title="Module Team" placement="right">
                    <IconButton
                      onClick={() => navigate('/sportifs/module-team')}
                sx={{
                  color: 'rgba(17, 153, 142, 0.8)',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    color: '#38ef7d',
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
                  background: 'linear-gradient(45deg, #11998e, #38ef7d)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 2px 8px rgba(17, 153, 142, 0.3))',
                }}
                  >
                    Modules Sportifs
                  </Typography>

                  <Tooltip title="Module Solo" placement="left">
                    <IconButton
                      onClick={() => navigate('/sportifs/module-solo')}
sx={{
                    color: 'rgba(17, 153, 142, 0.8)',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      color: '#38ef7d',
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
                  Des programmes d'accompagnement dédiés pour optimiser
                  vos performances individuelles et collectives.
                </Typography>
              </Container>
            </Box>
          </Box>
          <Box
            sx={{
              py: 3
            }}
          >
            <Grid container spacing={4} justifyContent="center">
            {modules.map((module, index) => (
              <Grid item xs={12} md={6} lg={5} key={index}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    background: 'white',
                    border: '2px solid rgba(17, 153, 142, 0.3)',
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
                      background: 'linear-gradient(90deg, #11998e, #38ef7d)',
                    },
                    '&:hover': {
                      borderColor: '#38ef7d',
                      boxShadow: '0 12px 40px rgba(17, 153, 142, 0.25)',
                      transform: 'translateY(-8px)',
                    }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <module.icone sx={{ fontSize: 60, color: '#11998e', mb: 2 }} />
                    <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, color: '#1a1a2e' }}>
                      {module.titre}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7, mb: 3 }}>
                      {module.description}
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => navigate(module.lien)}
                      sx={{
                        px: 4,
                        py: 1.5,
                        fontSize: '1rem',
                        background: 'linear-gradient(45deg, #11998e, #38ef7d)',
                        color: 'white',
                        fontWeight: 600,
                        borderRadius: 50,
                        boxShadow: '0 8px 25px rgba(17, 153, 142, 0.3)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #38ef7d, #11998e)',
                          transform: 'translateY(-3px)',
                          boxShadow: '0 12px 35px rgba(17, 153, 142, 0.4)',
                        },
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

export default Sportifs;