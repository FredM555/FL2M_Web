// src/components/admin/AdminStats.tsx
import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  CircularProgress,
  Skeleton,
  useTheme
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import { supabase } from '../../services/supabase';
import { logger } from '../../utils/logger';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactElement;
  color: string;
  loading: boolean;
}

// Composant pour une carte de statistique
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, loading }) => {
  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderTop: `4px solid ${color}`,
        transition: 'transform 0.3s, box-shadow 0.3s',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: (theme) => theme.shadows[6],
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" color="text.secondary">{title}</Typography>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: `${color}20`, // Couleur avec 20% d'opacité
          borderRadius: '50%',
          p: 1
        }}>
          {React.cloneElement(icon, { sx: { fontSize: 28, color: color } } as any)}
        </Box>
      </Box>
      
      {loading ? (
        <Skeleton variant="text" width="80%" height={60} />
      ) : (
        <Typography variant="h3" component="div" sx={{ fontWeight: 'bold' }}>
          {value}
        </Typography>
      )}
    </Paper>
  );
};

const AdminStats: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAppointments: 0,
    totalPractitioners: 0,
    totalServices: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Récupération des statistiques depuis Supabase
        const [usersResponse, appointmentsResponse, practitionersResponse, servicesResponse] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('appointments').select('id', { count: 'exact', head: true }),
          supabase.from('practitioners').select('id', { count: 'exact', head: true }),
          supabase.from('services').select('id', { count: 'exact', head: true }),
        ]);

        setStats({
          totalUsers: usersResponse.count || 0,
          totalAppointments: appointmentsResponse.count || 0,
          totalPractitioners: practitionersResponse.count || 0, 
          totalServices: servicesResponse.count || 0
        });
      } catch (error) {
        logger.error('Erreur lors de la récupération des statistiques:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Configuration des cartes de statistiques
  const statsConfig = [
    {
      title: 'Utilisateurs',
      value: stats.totalUsers,
      icon: <PeopleIcon />,
      color: theme.palette.primary.main,
    },
    {
      title: 'Rendez-vous',
      value: stats.totalAppointments,
      icon: <EventAvailableIcon />,
      color: theme.palette.success.main,
    },
    {
      title: 'Intervenants',
      value: stats.totalPractitioners,
      icon: <LocalHospitalIcon />,
      color: theme.palette.info.main,
    },
    {
      title: 'Services',
      value: stats.totalServices,
      icon: <DesignServicesIcon />,
      color: theme.palette.secondary.main,
    }
  ];

  return (
    <Grid container spacing={3}>
      {statsConfig.map((stat, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <StatCard
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            loading={loading}
          />
        </Grid>
      ))}
    </Grid>
  );
};

export default AdminStats;