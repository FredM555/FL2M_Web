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
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import PeopleIcon from '@mui/icons-material/People';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import BusinessIcon from '@mui/icons-material/Business';
import BarChartIcon from '@mui/icons-material/BarChart';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';

// Interface pour les modules
interface ModuleInfo {
  titre: string;
  description: string;
  icone: React.ElementType;
  lien: string;
}

const Professionnels: React.FC = () => {
  const navigate = useNavigate();

  // Configuration des modules
  const modules: ModuleInfo[] = [
    {
      titre: 'Module Coéquipiers',
      description: 'Accompagnement pour s\'épanouir individuellement au sein d\'une équipe.',
      icone: GroupWorkIcon,
      lien: '/professionnels/module-coequipiers'
    },
    {
      titre: 'Module Équipe',
      description: 'Développement collectif pour s\'élever ensemble et renforcer la synergie.',
      icone: PeopleIcon,
      lien: '/professionnels/module-equipe'
    },
    {
      titre: 'Module Candidat',
      description: 'Identification et développement du potentiel des talents émergents.',
      icone: PersonSearchIcon,
      lien: '/professionnels/module-candidats'
    },
    {
      titre: 'Module Associé',
      description: 'Alignement stratégique et collaboration entre associés.',
      icone: BusinessIcon,
      lien: '/professionnels/module-associes'
    },
    {
      titre: 'Module Stratégie',
      description: 'Session Kairos pour une vision stratégique claire et ambitieuse.',
      icone: BarChartIcon,
      lien: '/professionnels/module-strategies'
    }
  ];

  return (
    <Box sx={{ width: '100%' }}>
      {/* Section Hero avec design harmonisé */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          py: 4,
          mt: { xs: '23px', md: '10px' },
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
                  <Tooltip title="Module Stratégie" placement="right">
                    <IconButton
                      onClick={() => navigate('/professionnels/module-strategies')}
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
                    Modules Professionnels
                  </Typography>

                  <Tooltip title="Module Coéquipiers" placement="left">
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
                      <ArrowForwardIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 400,
                    color: 'rgba(255, 255, 255, 0.9)',
                    lineHeight: 1.7,
                    textAlign: 'center',
                    maxWidth: '800px',
                    mx: 'auto',
                  }}
                >
                  Des accompagnements professionnels pour optimiser vos équipes et développer votre entreprise
                </Typography>
              </Container>
            </Box>
          </Box>

        {/* Section des modules */}
        <Box
          sx={{
            py: 0
          }}
        >
          <Container maxWidth="lg">
          <Grid container spacing={4} sx={{ justifyContent: 'center' }}>
            {modules.map((module, index) => (
              <Grid
                item
                xs={12}
                sm={6}
                md={4}
                key={index}
                sx={{
                  // Centrer les 2 derniers modules (index 3 et 4)
                  ...(index >= 3 && {
                    '@media (min-width: 900px)': {
                      maxWidth: '33.333333%',
                      flexBasis: '33.333333%',
                    }
                  })
                }}
              >
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
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
                        color: '#4169E1',
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
                        background: 'linear-gradient(45deg, #4169E1, #6495ED)',
                        color: 'white',
                        fontWeight: 600,
                        px: 3,
                        py: 1,
                        borderRadius: 50,
                        boxShadow: '0 4px 15px rgba(65, 105, 225, 0.3)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #6495ED, #4169E1)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 6px 20px rgba(65, 105, 225, 0.4)',
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
          </Container>
        </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default Professionnels;
