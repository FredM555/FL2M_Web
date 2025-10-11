import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext'; // Importation du contexte d'authentification

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

const ModuleAdultes: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // Récupération de l'état d'authentification
  
  // États pour gérer les données et le chargement
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Caractéristiques du module
  const caracteristiques = [
    {
      titre: 'Connaissance de Soi',
      description: 'Explorez vos forces, vos talents et vos zones de développement personnel.'
    },
    {
      titre: 'Développement Personnel',
      description: 'Techniques et outils pour renforcer votre confiance et votre potentiel.'
    },
    {
      titre: 'Accompagnement Personnalisé',
      description: 'Suivi individuel adapté à vos objectifs spécifiques.'
    }
  ];
  
  // Code du service Module Adulte
  const moduleAdulteCode = 'PAAD';
  
  // Charger les données du service
  useEffect(() => {
    const fetchServiceData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('code', moduleAdulteCode)
          .single();
        
        if (error) {
          throw error;
        }
        
        if (data) {
          setService(data as Service);
        }
      } catch (err) {
        console.error('Erreur lors du chargement du service:', err);
        setError('Impossible de charger les informations du service.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchServiceData();
  }, []);
  
  // Gestionnaire de clic pour le bouton de réservation
  const handleReservationClick = () => {
    if (service) {
      // Si l'utilisateur n'est pas connecté, rediriger vers la page de login
      // avec les informations nécessaires pour revenir à l'étape 2 de la réservation
      if (!user) {
        // Stocker les informations du service dans l'état de navigation
        navigate('/login', {
          state: {
            from: '/prendre-rendez-vous',
            preSelectedServiceId: service.id,
            preSelectedCategory: service.category
          }
        });
      } else {
        // Si l'utilisateur est connecté, aller directement à la page de réservation
        navigate('/prendre-rendez-vous', {
          state: {
            preSelectedServiceId: service.id,
            preSelectedCategory: service.category
          }
        });
      }
    } else {
      // Fallback si le service n'est pas chargé
      navigate('/prendre-rendez-vous');
    }
  };
  
  // Afficher un indicateur de chargement
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
  
  // Afficher un message d'erreur
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography 
        variant="h3" 
        component="h1" 
        gutterBottom 
        align="center" 
        fontWeight="bold"
      >
        {service ? service.name : 'Module Adulte '} : Se Connaître
      </Typography>

      {/* Section Introduction */}
      <Typography 
        variant="body1" 
        align="center" 
        sx={{ 
          maxWidth: '800px', 
          margin: '0 auto', 
          mb: 4, 
          color: 'text.secondary' 
        }}
      >
        {service ? service.description : 'Un parcours de développement personnel conçu pour vous aider à mieux vous comprendre, développer vos potentiels et atteindre vos objectifs de vie.'}
      </Typography>

      {/* Caractéristiques du Module */}
      <Grid container spacing={4} sx={{ mb: 4 }}>
        {caracteristiques.map((caract, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                transition: 'box-shadow 0.3s, transform 0.3s',
                '&:hover': {
                  boxShadow: 3,
                  transform: 'translateY(-5px)'
                }
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <PersonIcon 
                  sx={{ 
                    fontSize: 48, 
                    color: 'primary.main', 
                    mb: 2 
                  }} 
                />
                <Typography variant="h5" component="h2" gutterBottom>
                  {caract.titre}
                </Typography>
                <Typography variant="body2">
                  {caract.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Section Détails */}
      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Typography variant="h5" gutterBottom>
            Objectifs du Module
          </Typography>
          <Typography variant="body1" paragraph>
            - Développer une meilleure connaissance de soi<br />
            - Identifier et surmonter ses freins personnels<br />
            - Renforcer sa confiance et son potentiel
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h5" gutterBottom>
            Méthodes d'Accompagnement
          </Typography>
          <Typography variant="body1" paragraph>
            - Entretiens individuels<br />
            - Outils de développement personnel<br />
            - Coaching personnalisé
          </Typography>
        </Grid>
      </Grid>

      {/* Informations prix et durée */}
      {service && (
        <Typography 
          variant="h6" 
          align="center" 
          sx={{ mb: 3 }}
        >
          Durée: {service.duration} minutes | Prix: {service.price} €
        </Typography>
      )}

      {/* Bouton de Réservation */}
      <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
        <Button 
          variant="contained" 
          color="primary" 
          size="large"
          onClick={handleReservationClick}
          sx={{ 
            mt: 2, 
            px: 4, 
            py: 1.5, 
            fontSize: '1rem' 
          }}
          disabled={!service}
        >
          Réserver une Session
        </Button>
      </Container>
    </Container>
  );
};

export default ModuleAdultes;