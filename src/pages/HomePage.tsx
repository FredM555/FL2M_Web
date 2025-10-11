// src/pages/HomePage.tsx
import { Box, Button, Container, Grid, Paper, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

const HomePage = () => {
  return (
    <Container maxWidth="lg">
      {/* Section Hero */}
      <Paper
        sx={{
          position: 'relative',
          backgroundColor: 'grey.800',
          color: '#fff',
          mb: 4,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundImage: 'url(https://source.unsplash.com/random?coaching)',
          p: 6,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            left: 0,
            backgroundColor: 'rgba(0,0,0,.55)',
          }}
        />
        <Grid container>
          <Grid item md={6}>
            <Box
              sx={{
                position: 'relative',
                p: { xs: 3, md: 6 },
              }}
            >
              <Typography component="h1" variant="h3" color="inherit" gutterBottom>
                Développez votre potentiel
              </Typography>
              <Typography variant="h5" color="inherit" paragraph>
                Des prestations personnalisées pour particuliers, professionnels et sportifs. 
                Découvrez comment nous pouvons vous aider à vous épanouir et à atteindre vos objectifs.
              </Typography>
              <Button
                variant="contained"
                component={RouterLink}
                to="/prendre-rendez-vous"
                size="large"
                sx={{ mt: 2 }}
              >
                Prendre rendez-vous
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Sections des services */}
      <Typography variant="h4" component="h2" gutterBottom textAlign="center" sx={{ mb: 4 }}>
        Nos services
      </Typography>

      <Grid container spacing={4}>
        {/* Particuliers */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: 350,
              transition: 'transform 0.3s, box-shadow 0.3s',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: 6,
              },
            }}
          >
            <Box display="flex" justifyContent="center" mb={2}>
              <PersonIcon sx={{ fontSize: 60, color: 'primary.main' }} />
            </Box>
            <Typography variant="h5" component="h3" gutterBottom textAlign="center">
              Particuliers
            </Typography>
            <Typography variant="body1" paragraph>
              Des modules adaptés pour vous aider à mieux vous connaître, améliorer votre communication en couple 
              et développer le potentiel de vos enfants.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 'auto' }}>
              <Button variant="outlined" component={RouterLink} to="/particuliers">
                En savoir plus
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Professionnels */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: 350,
              transition: 'transform 0.3s, box-shadow 0.3s',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: 6,
              },
            }}
          >
            <Box display="flex" justifyContent="center" mb={2}>
              <BusinessIcon sx={{ fontSize: 60, color: 'primary.main' }} />
            </Box>
            <Typography variant="h5" component="h3" gutterBottom textAlign="center">
              Professionnels
            </Typography>
            <Typography variant="body1" paragraph>
              Améliorez votre environnement professionnel avec nos modules pour coéquipiers, équipes et 
              candidats. Optimisez votre stratégie d'entreprise et alignez vos objectifs.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 'auto' }}>
              <Button variant="outlined" component={RouterLink} to="/professionnels">
                En savoir plus
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Sportifs */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: 350,
              transition: 'transform 0.3s, box-shadow 0.3s',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: 6,
              },
            }}
          >
            <Box display="flex" justifyContent="center" mb={2}>
              <SportsSoccerIcon sx={{ fontSize: 60, color: 'primary.main' }} />
            </Box>
            <Typography variant="h5" component="h3" gutterBottom textAlign="center">
              Sportifs
            </Typography>
            <Typography variant="body1" paragraph>
              Atteignez de nouveaux sommets dans votre carrière sportive avec nos modules spécialisés. 
              Améliorez vos performances individuelles ou renforcez la cohésion de votre équipe.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 'auto' }}>
              <Button variant="outlined" component={RouterLink} to="/sportifs">
                En savoir plus
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Section Appel à l'action */}
      <Paper sx={{ p: 4, mt: 6, textAlign: 'center', bgcolor: 'primary.light', color: 'white' }}>
        <Typography variant="h5" gutterBottom>
          Prêt à commencer votre parcours ?
        </Typography>
        <Typography variant="body1" paragraph>
          Nos experts sont disponibles pour vous accompagner dans votre développement personnel et professionnel.
        </Typography>
        <Button 
          variant="contained" 
          color="secondary" 
          size="large" 
          component={RouterLink} 
          to="/prendre-rendez-vous"
          startIcon={<CalendarMonthIcon />}
        >
          Prendre rendez-vous maintenant
        </Button>
      </Paper>
    </Container>
  );
};

export default HomePage;