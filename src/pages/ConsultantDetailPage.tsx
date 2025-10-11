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
  useTheme,
  useMediaQuery,
  Breadcrumbs,
  Link
} from '@mui/material';
import { supabase } from '../services/supabase';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

// Interface pour les consultants
interface Consultant {
  id: string;
  user_id: string;
  bio: string;
  priority: number;
  display_name?: string;
  title?: string;
  summary?: string;
  is_active: boolean;
  profile?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  }
}

const ConsultantDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [consultant, setConsultant] = useState<Consultant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Liste fictive de spécialités (à remplacer par des données réelles)
  const specialties = [
    "Accompagnement personnel", 
    "Développement professionnel", 
    "Gestion du stress", 
    "Communication efficace", 
    "Confiance en soi"
  ];

  useEffect(() => {
    if (id) {
      fetchConsultant(id);
    } else {
      setError("Identifiant de consultant manquant");
      setLoading(false);
    }
  }, [id]);

  const fetchConsultant = async (consultantId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('practitioners')
        .select(`
          *,
          profile:profiles(first_name, last_name, email, phone)
        `)
        .eq('id', consultantId)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      
      if (!data) {
        throw new Error("Consultant non trouvé ou inactif");
      }
      
      setConsultant(data);
    } catch (err: any) {
      console.error('Erreur lors du chargement du consultant:', err);
      setError('Consultant non trouvé ou non disponible.');
    } finally {
      setLoading(false);
    }
  };

  // Obtenir le nom complet du consultant
  const getConsultantName = () => {
    if (!consultant) return '';
    
    if (consultant.display_name) {
      return consultant.display_name;
    } else if (consultant.profile) {
      return `${consultant.profile.first_name} ${consultant.profile.last_name}`;
    }
    return 'Consultant';
  };

  // Générer les initiales pour l'avatar
  const getInitials = () => {
    if (!consultant) return 'C';
    
    if (consultant.display_name) {
      return consultant.display_name.charAt(0);
    } else if (consultant.profile) {
      return consultant.profile.first_name.charAt(0);
    }
    return 'C';
  };

  // Formatage du texte avec des paragraphes
  const formatBio = (bio: string) => {
    if (!bio) return null;
    
    return bio.split('\n').map((paragraph, index) => (
      <Typography key={index} variant="body1" paragraph>
        {paragraph}
      </Typography>
    ));
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !consultant) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Button 
          startIcon={<ArrowBackIcon />}
          variant="outlined"
          component={RouterLink}
          to="/consultants"
          sx={{ mb: 3 }}
        >
          Retour aux consultants
        </Button>
        
        <Alert severity="error" sx={{ mb: 4 }}>
          {error || "Ce consultant n'existe pas ou n'est pas disponible."}
        </Alert>
        
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6">
            Consultez nos autres consultants disponibles.
          </Typography>
          <Button 
            variant="contained" 
            component={RouterLink} 
            to="/consultants"
            sx={{ mt: 3 }}
          >
            Voir tous les consultants
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Fil d'Ariane */}
      <Breadcrumbs 
        separator={<NavigateNextIcon fontSize="small" />} 
        aria-label="breadcrumb"
        sx={{ mb: 4 }}
      >
        <Link color="inherit" component={RouterLink} to="/">
          Accueil
        </Link>
        <Link color="inherit" component={RouterLink} to="/consultants">
          Consultants
        </Link>
        <Typography color="text.primary">{getConsultantName()}</Typography>
      </Breadcrumbs>

      <Button 
        startIcon={<ArrowBackIcon />}
        variant="outlined"
        component={RouterLink}
        to="/consultants"
        sx={{ mb: 4 }}
      >
        Retour aux consultants
      </Button>

      <Grid container spacing={4}>
        {/* Profil et informations de contact */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <Box 
              sx={{ 
                bgcolor: 'primary.light',
                pt: 4,
                pb: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <Avatar
                sx={{ 
                  width: 150, 
                  height: 150, 
                  fontSize: '3.5rem',
                  bgcolor: 'primary.main',
                  mb: 2,
                  border: '4px solid white'
                }}
              >
                {getInitials()}
              </Avatar>
              <Typography variant="h4" align="center" sx={{ color: 'white' }}>
                {getConsultantName()}
              </Typography>
              {consultant.title && (
                <Chip 
                  label={consultant.title} 
                  sx={{ 
                    mt: 1, 
                    bgcolor: 'primary.dark', 
                    color: 'white',
                    fontWeight: 'medium'
                  }} 
                />
              )}
            </Box>
            <CardContent>
              {consultant.profile?.email && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <EmailIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="body2">
                    {consultant.profile.email}
                  </Typography>
                </Box>
              )}
              
              {consultant.profile?.phone && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PhoneIcon sx={{ mr: 2, color: 'primary.main' }} />
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
                sx={{ mt: 2 }}
              >
                Prendre rendez-vous
              </Button>
            </CardContent>
          </Card>

          {/* Domaines d'expertise */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Domaines d'expertise
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List dense disablePadding>
                {specialties.map((specialty, index) => (
                  <ListItem key={index} disableGutters sx={{ pb: 1 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckCircleIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={specialty} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Biographie et informations principales */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                À propos
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              {consultant.summary && (
                <Typography variant="subtitle1" paragraph sx={{ fontWeight: 'medium' }}>
                  {consultant.summary}
                </Typography>
              )}
              
              {formatBio(consultant.bio)}

              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Accompagnement proposé
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1" paragraph>
                  Notre consultant vous accompagne de manière personnalisée pour répondre à vos besoins spécifiques. 
                  Chaque parcours est adapté à votre situation et vos objectifs.
                </Typography>
                
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          Séance individuelle
                        </Typography>
                        <Typography variant="body2">
                          Consultation personnalisée adaptée à vos besoins spécifiques.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          Suivi régulier
                        </Typography>
                        <Typography variant="body2">
                          Programme d'accompagnement sur plusieurs séances pour des résultats durables.
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
                  sx={{ mt: 4 }}
                >
                  Prendre rendez-vous maintenant
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ConsultantDetailPage;