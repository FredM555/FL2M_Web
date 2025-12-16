import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Grid
} from '@mui/material';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ScienceIcon from '@mui/icons-material/Science';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TabletIcon from '@mui/icons-material/Tablet';

// Interface pour définir la structure d'un service
interface Service {
  id: number;
  titre: string;
  description: string;
  icone: React.ElementType;
}

const ServicesPage: React.FC = () => {
  // Liste des services
  const services: Service[] = [
    {
      id: 1,
      titre: 'Consultations Médicales',
      description: 'Consultations générales et spécialisées assurées par nos médecins experts.',
      icone: MedicalServicesIcon
    },
    {
      id: 2,
      titre: 'Examens Cardiaques',
      description: 'Bilans complets et suivi cardiologique avec un plateau technique moderne.',
      icone: FavoriteIcon
    },
    {
      id: 3,
      titre: 'Laboratoire d\'Analyses',
      description: 'Analyses médicales précises et rapides réalisées dans notre laboratoire.',
      icone: ScienceIcon
    },
    {
      id: 4,
      titre: 'Neurologie',
      description: 'Diagnostic et traitement des affections neurologiques avec des technologies avancées.',
      icone: PsychologyIcon
    },
    {
      id: 5,
      titre: 'Télémédecine',
      description: 'Consultations à distance pour votre confort et facilité d\'accès aux soins.',
      icone: TabletIcon
    }
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      <Typography
        variant="h3"
        component="h1"
        gutterBottom
        align="center"
        fontWeight="bold"
        sx={{
          mb: { xs: 3, md: 6 },
          fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
          px: { xs: 2, sm: 0 }
        }}
      >
        Nos Services Médicaux
      </Typography>
      
      <Grid container spacing={{ xs: 3, md: 6 }}>
        {services.map((service) => (
          <Grid item xs={12} sm={6} md={6} lg={4} key={service.id}>
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
              <CardContent sx={{ textAlign: 'center', flexGrow: 1 }}>
                <service.icone 
                  sx={{ 
                    fontSize: 48, 
                    color: 'primary.main', 
                    mb: 2 
                  }} 
                />
                <Typography variant="h5" component="h2" gutterBottom>
                  {service.titre}
                </Typography>
                <Typography>
                  {service.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </div>
  );
};

export default ServicesPage;