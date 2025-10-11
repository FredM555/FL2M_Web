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
import { useNavigate } from 'react-router-dom';

// Interface pour les modules
interface ModuleInfo {
  titre: string;
  description: string;
  icone: React.ElementType;
  lien: string;
}

const Sportifs: React.FC = () => {
  const navigate = useNavigate();

  // Configuration des modules
  const modules: ModuleInfo[] = [
    {
      titre: 'Module Solo',
      description: 'Parcours de performance individuelle pour optimiser votre potentiel athlétique.',
      icone: PersonIcon,
      lien: '/sportifs/module-solo'
    },
    {
      titre: 'Module Team',
      description: 'Développement de la cohésion et de la performance collective.',
      icone: GroupIcon,
      lien: '/sportifs/module-team'
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
        Modules Sportifs
      </Typography>

      <Grid container spacing={4} justifyContent="center">
        {modules.map((module, index) => (
          <Grid item xs={12} md={6} lg={5} key={index}>
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

export default Sportifs;