// src/pages/admin/DashboardPage.tsx
import React from 'react';
import { 
  Grid, 
  Typography, 
  Box,
  Paper,
  Divider
} from '@mui/material';
import AdminStats from '../../components/admin/AdminStats';
import RecentEntries from '../../components/admin/RecentEntries';
import ActivityChart from '../../components/admin/ActivityChart';

const AdminDashboardPage: React.FC = () => {
  return (
    // Suppression du Box extérieur qui pouvait ajouter une marge
    <>
      <Box sx={{ 
        mb: 4,
        ml: -1, // Marge négative pour compenser l'écart
      }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Tableau de bord
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Bienvenue dans l'espace d'administration de FLM. Voici un aperçu de l'activité récente.
        </Typography>
      </Box>

      {/* Statistiques générales */}
      <Box sx={{ 
        mb: 4,
        ml: -1, // Marge négative pour compenser l'écart
      }}>
        <AdminStats />
      </Box>

      {/* Graphique d'activité */}
      <Box sx={{ 
        mb: 4,
        ml: -1, // Marge négative pour compenser l'écart 
      }}>
        <ActivityChart 
          title="Évolution de l'activité" 
          defaultTimeRange="30days"
          defaultChartType="both"
        />
      </Box>

      {/* Données récentes */}
      <Grid 
        container 
        spacing={4} 
        sx={{ 
          ml: -1, // Marge négative pour compenser l'écart
          width: 'calc(100% + 8px)', // Compense la marge négative pour éviter le débordement horizontal
        }}
      >
        <Grid item xs={12} md={6}>
          <RecentEntries 
            title="Rendez-vous récents" 
            type="appointments" 
            limit={5} 
            linkTo="/admin/rendez-vous"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <RecentEntries 
            title="Nouveaux utilisateurs" 
            type="users" 
            limit={5} 
            linkTo="/admin/utilisateurs"
          />
        </Grid>
      </Grid>
    </>
  );
};

export default AdminDashboardPage;