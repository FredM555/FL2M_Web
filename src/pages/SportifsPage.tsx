import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Button,
  Grid,
  Box,
  CardHeader
} from '@mui/material';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import FavoriteIcon from '@mui/icons-material/Favorite';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

// Interface pour définir la structure d'un sportif
interface Sportif {
  id: number;
  nom: string;
  prenom: string;
  specialite: string;
  description: string;
  certifications: string[];
}

const SportifsPage: React.FC = () => {
  // Liste des sportifs (à remplacer par des données dynamiques)
  const sportifs: Sportif[] = [
    {
      id: 1,
      nom: 'Lefevre',
      prenom: 'Emma',
      specialite: 'Préparation Physique',
      description: 'Experte en optimisation de la performance sportive et préparation athlétique.',
      certifications: [
        'Diplôme en Préparation Physique',
        'Certification Nutrition Sportive',
        'Coach Sportif Niveau 3'
      ]
    },
    {
      id: 2,
      nom: 'Dubois',
      prenom: 'Marc',
      specialite: 'Kinésithérapie Sportive',
      description: 'Spécialiste de la réathlétisation et de la prévention des blessures sportives.',
      certifications: [
        'Diplôme en Kinésithérapie du Sport',
        'Expert en Réhabilitation Musculaire',
        'Membre de l\'Ordre des Masseurs-Kinésithérapeutes'
      ]
    },
    {
      id: 3,
      nom: 'Rousseau',
      prenom: 'Clara',
      specialite: 'Nutrition et Performance',
      description: 'Nutritionniste spécialisée dans l\'accompagnement des athlètes et sportifs.',
      certifications: [
        'Diplôme de Nutritionniste',
        'Certification Nutrition Sportive',
        'Coach Nutrition Performance'
      ]
    }
  ];

  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto', p: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 6 }}>
        <DirectionsRunIcon sx={{ mr: 2, fontSize: 40, color: 'primary.main' }} />
        <Typography variant="h3" component="h1" fontWeight="bold">
          Nos Experts Sportifs
        </Typography>
        <FitnessCenterIcon sx={{ ml: 2, fontSize: 40, color: 'primary.main' }} />
      </Box>
      
      <Grid container spacing={6}>
        {sportifs.map((sportif) => (
          <Grid item xs={12} md={6} lg={4} key={sportif.id}>
            <Card sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              transition: 'box-shadow 0.3s, transform 0.3s',
              '&:hover': {
                boxShadow: 6,
                transform: 'translateY(-5px)'
              }
            }}>
              <CardHeader
                title={
                  <Typography variant="h5" align="center">
                    {sportif.prenom} {sportif.nom}
                  </Typography>
                }
                subheader={
                  <Typography variant="subtitle1" align="center" color="text.secondary">
                    {sportif.specialite}
                  </Typography>
                }
                avatar={
                  <FavoriteIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                }
                sx={{ textAlign: 'center', pb: 0 }}
              />
              <CardContent sx={{ flexGrow: 1, pt: 1 }}>
                <Typography align="center" paragraph>
                  {sportif.description}
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <EmojiEventsIcon sx={{ mr: 1, color: 'warning.main' }} />
                    <Typography variant="subtitle1" fontWeight="bold">
                      Certifications
                    </Typography>
                  </Box>
                  
                  <ul style={{ paddingLeft: '20px' }}>
                    {sportif.certifications.map((cert, index) => (
                      <li key={index}>
                        <Typography variant="body2">{cert}</Typography>
                      </li>
                    ))}
                  </ul>
                </Box>

                <Button 
                  variant="outlined" 
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  Consulter
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h4" component="h2" fontWeight="bold" gutterBottom>
          Notre Approche Sportive
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '800px', mx: 'auto' }}>
          Nous proposons un accompagnement personnalisé pour les sportifs 
          de tous niveaux, alliant expertise médicale, préparation physique 
          et suivi nutritionnel pour optimiser vos performances et votre santé.
        </Typography>
      </Box>
    </Box>
  );
};

export default SportifsPage;