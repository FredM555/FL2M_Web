// src/pages/HomePage.tsx
import { Box, Button, Container, Grid, Paper, Typography, Card, CardContent } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PsychologyIcon from '@mui/icons-material/Psychology';
import GroupsIcon from '@mui/icons-material/Groups';

const HomePage = () => {
  return (
    <Box sx={{ width: '100%' }}>
      {/* Section Hero moderne */}
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
                <Typography
                  variant="h2"
                  component="h1"
                  gutterBottom
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '2rem', md: '2.5rem' },
                    textAlign: 'center',
                    background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 2px 8px rgba(255, 215, 0, 0.3))',
                    mb: 2,
                  }}
                >
                  Développez votre potentiel.
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 400,
                    color: 'rgba(255, 255, 255, 0.9)',
                    lineHeight: 1.7,
                    textAlign: 'center',
                    maxWidth: '900px',
                    mx: 'auto',
                    mb: 3,
                  }}
                >
                  On vous accompagne, grâce à la Numérologie, à mieux vous connaître, à trouver votre équilibre, à déployer votre potentiel et à passer à l'action avec clarté et confiance.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    component={RouterLink}
                    to="/prendre-rendez-vous"
                    size="large"
                    sx={{
                      px: 4,
                      py: 1.5,
                      background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                      color: '#1a1a2e',
                      fontWeight: 600,
                      fontSize: '1.1rem',
                      borderRadius: 50,
                      boxShadow: '0 8px 25px rgba(255, 215, 0, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #FFA500, #FFD700)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 12px 35px rgba(255, 215, 0, 0.4)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Prendre rendez-vous
                  </Button>
                  <Button
                    variant="outlined"
                    component={RouterLink}
                    to="/particuliers"
                    size="large"
                    sx={{
                      px: 4,
                      py: 1.5,
                      color: '#FFD700',
                      borderColor: '#FFD700',
                      fontSize: '1.1rem',
                      borderRadius: 50,
                      '&:hover': {
                        borderColor: '#FFA500',
                        backgroundColor: 'rgba(255, 215, 0, 0.1)',
                      },
                    }}
                  >
                    En savoir plus
                  </Button>
                </Box>
              </Container>
            </Box>
          </Box>

      {/* Section Valeurs clés */}
        <Grid container spacing={4} sx={{ mt: 2 }}>
          <Grid item xs={12} md={4}>
            <Card
              elevation={0}
              sx={{
                textAlign: 'center',
                p: 3,
                border: '1px solid rgba(255, 215, 0, 0.2)',
                borderRadius: 3,
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: '#FFD700',
                  boxShadow: '0 8px 30px rgba(255, 215, 0, 0.15)',
                  transform: 'translateY(-5px)',
                },
              }}
            >
              <PsychologyIcon sx={{ fontSize: 60, color: '#FFD700', mb: 2 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#1a1a2e' }}>
                Numérologie Stratégique®
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7, mb: 2 }}>
                Découvrez votre chemin de vie et vos dons et talents grâce à l'analyse numérologique personnalisée.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, fontStyle: 'italic' }}>
                Méthode : La Numérologie Stratégique® mise au point par Lydie Castells.{' '}
                <Box
                  component="a"
                  href="https://numerologie-strategique.fr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: '#FFD700',
                    textDecoration: 'none',
                    fontWeight: 500,
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  En savoir plus
                </Box>
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              elevation={0}
              sx={{
                textAlign: 'center',
                p: 3,
                border: '1px solid rgba(255, 215, 0, 0.2)',
                borderRadius: 3,
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: '#FFD700',
                  boxShadow: '0 8px 30px rgba(255, 215, 0, 0.15)',
                  transform: 'translateY(-5px)',
                },
              }}
            >
              <TrendingUpIcon sx={{ fontSize: 60, color: '#FFD700', mb: 2 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#1a1a2e' }}>
                Dons & Talents
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                Révélez vos dons naturels et vos talents innés pour déployer pleinement votre potentiel et atteindre vos aspirations.
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              elevation={0}
              sx={{
                textAlign: 'center',
                p: 3,
                border: '1px solid rgba(255, 215, 0, 0.2)',
                borderRadius: 3,
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: '#FFD700',
                  boxShadow: '0 8px 30px rgba(255, 215, 0, 0.15)',
                  transform: 'translateY(-5px)',
                },
              }}
            >
              <GroupsIcon sx={{ fontSize: 60, color: '#FFD700', mb: 2 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#1a1a2e' }}>
                Méthode Personnalisée
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7, mb: 2 }}>
                Une approche unique élaborée à partir de votre nom, prénom et date de naissance, utilisant la symbolique de l'arbre : les racines (vos fondations), le tronc (votre chemin) et les fruits (vos réalisations).
              </Typography>
              <Button
                variant="text"
                component={RouterLink}
                to="/particuliers"
                sx={{
                  color: '#FFD700',
                  fontWeight: 600,
                  textTransform: 'none',
                  p: 0,
                  '&:hover': {
                    backgroundColor: 'transparent',
                    textDecoration: 'underline',
                  },
                }}
              >
                En savoir plus →
              </Button>
            </Card>
          </Grid>
        </Grid>

      {/* Section Services */}
          <Typography
            variant="h3"
            component="h2"
            textAlign="center"
            gutterBottom
            sx={{
              fontWeight: 700,
              color: '#1a1a2e',
              mb: 2,
            }}
          >
            Nos Services
          </Typography>
          <Typography
            variant="h6"
            textAlign="center"
            paragraph
            sx={{
              color: 'text.secondary',
              mb: 6,
              maxWidth: '700px',
              mx: 'auto',
            }}
          >
            Des solutions adaptées à chaque profil pour révéler votre plein potentiel
          </Typography>

          <Grid container spacing={4} sx={{ mb: 2 }}>
            {/* Particuliers */}
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                  color: '#1a1a2e',
                  borderRadius: 3,
                  transition: 'all 0.4s ease',
                  '&:hover': {
                    transform: 'translateY(-10px)',
                    boxShadow: '0 20px 40px rgba(255, 215, 0, 0.4)',
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: 4 }}>
                  <Box display="flex" justifyContent="center" mb={3}>
                    <PersonIcon sx={{ fontSize: 70, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }} />
                  </Box>
                  <Typography variant="h5" component="h3" gutterBottom textAlign="center" sx={{ fontWeight: 600, mb: 2 }}>
                    Particuliers
                  </Typography>
                  <Typography variant="body1" paragraph textAlign="center" sx={{ lineHeight: 1.7, mb: 3 }}>
                    Modules personnalisés pour mieux vous connaître, améliorer vos relations et développer votre potentiel personnel.
                  </Typography>
                  <Box sx={{ textAlign: 'center', mt: 'auto' }}>
                    <Button
                      variant="contained"
                      component={RouterLink}
                      to="/particuliers"
                      sx={{
                        bgcolor: 'white',
                        color: '#FFA500',
                        fontWeight: 600,
                        px: 4,
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.9)',
                        },
                      }}
                    >
                      Découvrir
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Professionnels */}
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'linear-gradient(135deg, #4169E1 0%, #6495ED 100%)',
                  color: 'white',
                  borderRadius: 3,
                  transition: 'all 0.4s ease',
                  '&:hover': {
                    transform: 'translateY(-10px)',
                    boxShadow: '0 20px 40px rgba(65, 105, 225, 0.4)',
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: 4 }}>
                  <Box display="flex" justifyContent="center" mb={3}>
                    <BusinessIcon sx={{ fontSize: 70, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }} />
                  </Box>
                  <Typography variant="h5" component="h3" gutterBottom textAlign="center" sx={{ fontWeight: 600, mb: 2 }}>
                    Professionnels
                  </Typography>
                  <Typography variant="body1" paragraph textAlign="center" sx={{ lineHeight: 1.7, mb: 3 }}>
                    Des outils pour révéler le potentiel humain au cœur de votre entreprise.
                  </Typography>
                  <Box sx={{ textAlign: 'center', mt: 'auto' }}>
                    <Button
                      variant="contained"
                      component={RouterLink}
                      to="/professionnels"
                      sx={{
                        bgcolor: 'white',
                        color: '#4169E1',
                        fontWeight: 600,
                        px: 4,
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.9)',
                        },
                      }}
                    >
                      Découvrir
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Sportifs */}
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                  color: '#1a1a2e',
                  borderRadius: 3,
                  transition: 'all 0.4s ease',
                  '&:hover': {
                    transform: 'translateY(-10px)',
                    boxShadow: '0 20px 40px rgba(17, 153, 142, 0.4)',
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: 4 }}>
                  <Box display="flex" justifyContent="center" mb={3}>
                    <SportsSoccerIcon sx={{ fontSize: 70, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }} />
                  </Box>
                  <Typography variant="h5" component="h3" gutterBottom textAlign="center" sx={{ fontWeight: 600, mb: 2 }}>
                    Sportifs
                  </Typography>
                  <Typography variant="body1" paragraph textAlign="center" sx={{ lineHeight: 1.7, mb: 3 }}>
                    Programmes dédiés pour booster vos performances individuelles et renforcer la cohésion d'équipe.
                  </Typography>
                  <Box sx={{ textAlign: 'center', mt: 'auto' }}>
                    <Button
                      variant="contained"
                      component={RouterLink}
                      to="/sportifs"
                      sx={{
                        bgcolor: 'white',
                        color: '#11998e',
                        fontWeight: 600,
                        px: 4,
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.9)',
                        },
                      }}
                    >
                      Découvrir
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

      {/* Section CTA finale */}
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography
            variant="h3"
            gutterBottom
            sx={{
              color: '#1a1a2e',
              fontWeight: 700,
              mb: 3,
            }}
          >
            Prêt à démarrer votre transformation ?
          </Typography>
          <Typography
            variant="h6"
            paragraph
            sx={{
              color: 'text.secondary',
              mb: 5,
              lineHeight: 1.7,
            }}
          >
            La numérologie vous offre une boîte à outils unique pour révéler vos dons, développer vos talents et libérer votre véritable potentiel.
          </Typography>
          <Button
            variant="contained"
            size="large"
            component={RouterLink}
            to="/prendre-rendez-vous"
            startIcon={<CalendarMonthIcon />}
            sx={{
              px: 6,
              py: 2,
              fontSize: '1.2rem',
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
            Réserver une consultation
          </Button>
        </Box>
        </Container>
      </Box>
    </Box>
  );
}; 

export default HomePage;
