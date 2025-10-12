// src/pages/ConsultantsPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Avatar,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import { supabase } from '../services/supabase';
import { Link as RouterLink } from 'react-router-dom';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

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

const ConsultantsPage: React.FC = () => {
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConsultants();
  }, []);

  const fetchConsultants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('practitioners')
        .select(`
          *,
          profile:profiles(first_name, last_name, email, phone)
        `)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) throw error;
      setConsultants(data || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement des consultants:', err);
      setError('Impossible de charger la liste des consultants. Veuillez réessayer plus tard.');
    } finally {
      setLoading(false);
    }
  };

  // Obtenir le nom complet du consultant
  const getConsultantName = (consultant: Consultant) => {
    if (consultant.display_name) {
      return consultant.display_name;
    } else if (consultant.profile) {
      return `${consultant.profile.first_name} ${consultant.profile.last_name}`;
    }
    return 'Consultant';
  };

  // Générer les initiales pour l'avatar
  const getInitials = (consultant: Consultant) => {
    if (consultant.display_name) {
      return consultant.display_name.charAt(0);
    } else if (consultant.profile) {
      return consultant.profile.first_name.charAt(0);
    }
    return 'C';
  };

  // Fonction pour tronquer le texte
  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box textAlign="center" mb={6}>
        <Typography variant="h3" component="h1" gutterBottom>
          Nos Consultants
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto' }}>
          Découvrez notre équipe de professionnels qualifiés prêts à vous accompagner dans votre parcours
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      ) : consultants.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6">
            Aucun consultant disponible pour le moment.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
            Veuillez revenir ultérieurement ou nous contacter directement.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={4}>
          {consultants.map((consultant) => (
            <Grid item xs={12} sm={6} md={4} key={consultant.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 6
                  }
                }}
              >
                <Box 
                  sx={{ 
                    bgcolor: 'primary.light',
                    pt: 3,
                    pb: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                >
                  <Avatar
                    sx={{ 
                      width: 100, 
                      height: 100, 
                      fontSize: '2.5rem',
                      bgcolor: 'primary.main',
                      mb: 2,
                      border: '4px solid white'
                    }}
                  >
                    {getInitials(consultant)}
                  </Avatar>
                  <Typography variant="h5" component="h2" align="center" sx={{ color: 'white' }}>
                    {getConsultantName(consultant)}
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

                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {truncateText(consultant.summary || consultant.bio || '', 150)}
                  </Typography>

                  <Box sx={{ mt: 'auto' }}>
                    <Button 
                      variant="contained" 
                      fullWidth
                      component={RouterLink}
                      to={`/prendre-rendez-vous?consultant=${consultant.id}`}
                      startIcon={<CalendarMonthIcon />}
                      sx={{ mb: 1 }}
                    >
                      Prendre rendez-vous
                    </Button>
                    
                    <Button 
                      variant="outlined" 
                      fullWidth
                      component={RouterLink}
                      to={`/consultants/${consultant.id}`}
                      startIcon={<PersonIcon />}
                    >
                      Voir le profil
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Besoin d'assistance pour choisir votre consultant?
        </Typography>
        <Typography variant="body1" paragraph>
          Notre équipe se tient à votre disposition pour vous aider à trouver le consultant qui correspond le mieux à vos besoins.
        </Typography>
        <Button 
          variant="contained" 
          size="large" 
          component={RouterLink} 
          to="/contact"
          startIcon={<EmailIcon />}
        >
          Contactez-nous
        </Button>
      </Box>
    </Container>
  );
};

export default ConsultantsPage;