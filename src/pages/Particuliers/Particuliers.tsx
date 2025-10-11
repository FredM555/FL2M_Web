import React from 'react';
import { 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button 
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useNavigate } from 'react-router-dom'; // Changez cette ligne

// Interface pour les modules
interface ModuleInfo {
  titre: string;
  description: string;
  icone: React.ElementType;
  lien: string;
}

const Particuliers: React.FC = () => {
  const navigate = useNavigate(); // Utilisez useNavigate au lieu de useRouter

  // Configuration des modules
  const modules: ModuleInfo[] = [
    {
      titre: 'Module Adulte',
      description: 'Parcours de développement personnel pour mieux se connaître et s\'épanouir.',
      icone: PersonIcon,
      lien: '/particuliers/module-adultes'
    },
    {
      titre: 'Module Couple',
      description: 'Approfondir la communication et la compréhension mutuelle au sein du couple.',
      icone: GroupIcon,
      lien: '/particuliers/module-couples'
    },
    {
      titre: 'Module Enfant',
      description: 'Accompagnement pour développer le potentiel et l\'épanouissement de l\'enfant.',
      icone: ChildCareIcon,
      lien: '/particuliers/module-enfants'
    },
    {
      titre: 'Suivi Annuel (Climat)',
      description: 'Bilan annuel personnalisé pour maintenir et améliorer votre équilibre personnel.',
      icone: CalendarTodayIcon,
      lien: '/particuliers/module-suivi-annuel'
    }
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      {/* Le reste du code reste identique */}
            <Typography 
              variant="h3" 
              component="h1" 
              gutterBottom 
              align="center" 
              fontWeight="bold"
              sx={{ mb: 4 }}
            >
              Modules Particuliers
            </Typography>
      <Grid container spacing={4}>
        {modules.map((module, index) => (
          <Grid item xs={12} md={6} lg={3} key={index}>
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

export default Particuliers;