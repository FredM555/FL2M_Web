import React from 'react';
import { 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button 
} from '@mui/material';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import PeopleIcon from '@mui/icons-material/People';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import BusinessIcon from '@mui/icons-material/Business';
import BarChartIcon from '@mui/icons-material/BarChart';
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
      lien: '/professionnels/module-candidat'
    },
    {
      titre: 'Module Associé',
      description: 'Alignement stratégique et collaboration entre associés.',
      icone: BusinessIcon,
      lien: '/professionnels/module-associe'
    },
    {
      titre: 'Module Stratégie',
      description: 'Session Kairos pour une vision stratégique claire et ambitieuse.',
      icone: BarChartIcon,
      lien: '/professionnels/module-strategie'
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
        sx={{ mb: 4 }}
      >
        Modules Professionnels
      </Typography>

      <Grid container spacing={4}>
        {modules.map((module, index) => (
          <Grid item xs={12} md={6} lg={4} key={index}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': {
                  transform: 'translateY(-10px)',
                  boxShadow: 3
                }
              }}
            >
              <CardContent 
                sx={{ 
                  flexGrow: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  textAlign: 'center' 
                }}
              >
                <module.icone 
                  sx={{ 
                    fontSize: 48, 
                    color: 'primary.main', 
                    mb: 2 
                  }} 
                />
                <Typography variant="h5" gutterBottom>
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
                  onClick={() => navigate(module.lien)}
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

export default Professionnels;