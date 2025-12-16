import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Button
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useNavigate } from 'react-router-dom';

// Interface pour définir la structure d'un module
interface ModuleParticulier {
  id: number;
  titre: string;
  description: string;
  icone: React.ElementType;
  lien: string;
}

const ParticuliersPage: React.FC = () => {
  const navigate = useNavigate();

  // Liste des modules Particuliers
  const modules: ModuleParticulier[] = [
    {
      id: 1,
      titre: 'Module Adulte',
      description: 'Parcours de développement personnel pour mieux se connaître et s\'épanouir.',
      icone: PersonIcon,
      lien: '/particuliers/module-adulte'
    },
    {
      id: 2,
      titre: 'Module Couple',
      description: 'Approfondir la communication et la compréhension mutuelle au sein du couple.',
      icone: GroupIcon,
      lien: '/particuliers/module-couple'
    },
    {
      id: 3,
      titre: 'Module Enfant',
      description: 'Accompagnement pour développer le potentiel et l\'épanouissement de l\'enfant.',
      icone: ChildCareIcon,
      lien: '/particuliers/module-enfant'
    },
    {
      id: 4,
      titre: 'Suivi Annuel (Climat)',
      description: 'Bilan annuel personnalisé pour maintenir et améliorer votre équilibre personnel.',
      icone: CalendarTodayIcon,
      lien: '/particuliers/module-suivi-annuel'
    }
  ];

  const handleModuleClick = (lien: string) => {
    navigate(lien);
  };

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
        Parcours Particuliers
      </Typography>

      {/* Introduction */}
      <Typography
        variant="body1"
        align="center"
        sx={{
          maxWidth: '800px',
          margin: '0 auto',
          mb: { xs: 3, md: 6 },
          color: 'text.secondary',
          px: { xs: 2, sm: 0 }
        }}
      >
        Découvrez nos modules personnalisés conçus pour vous accompagner
        à chaque étape de votre développement personnel et relationnel.
      </Typography>
      
      <Grid container spacing={{ xs: 3, md: 6 }}>
        {modules.map((module) => (
          <Grid item xs={12} sm={6} md={6} lg={3} key={module.id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'box-shadow 0.3s, transform 0.3s',
                '&:hover': {
                  boxShadow: 6,
                  transform: 'translateY(-5px)'
                }
              }}
            >
              <CardContent 
                sx={{ 
                  textAlign: 'center', 
                  flexGrow: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center' 
                }}
              >
                <module.icone 
                  sx={{ 
                    fontSize: 48, 
                    color: 'primary.main', 
                    mb: 2 
                  }} 
                />
                <Typography variant="h5" component="h2" gutterBottom>
                  {module.titre}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    flexGrow: 1, 
                    mb: 2 
                  }}
                >
                  {module.description}
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => handleModuleClick(module.lien)}
                >
                  Découvrir
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </div>
  );
};

export default ParticuliersPage;