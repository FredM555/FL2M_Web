import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography,
  Grid,
  Box
} from "@mui/material";
import PeopleIcon from '@mui/icons-material/People';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAppointments: 0,
    totalPractitioners: 0,
    totalServices: 0
  });

  const [chartData, setChartData] = useState([
    { name: 'Jan', users: 400, appointments: 240 },
    { name: 'Fev', users: 300, appointments: 139 },
    { name: 'Mar', users: 200, appointments: 980 },
    { name: 'Avr', users: 278, appointments: 390 },
    { name: 'Mai', users: 189, appointments: 480 },
    { name: 'Juin', users: 239, appointments: 380 }
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Remplacez par vos vraies méthodes de récupération de stats
        const [usersResponse, appointmentsResponse, practitionersResponse, servicesResponse] = await Promise.all([
          fetch('/api/users/count'),
          fetch('/api/appointments/count'),
          fetch('/api/practitioners/count'),
          fetch('/api/services/count')
        ]);

        const users = await usersResponse.json();
        const appointments = await appointmentsResponse.json();
        const practitioners = await practitionersResponse.json();
        const services = await servicesResponse.json();

        setStats({
          totalUsers: users.count,
          totalAppointments: appointments.count,
          totalPractitioners: practitioners.count,
          totalServices: services.count
        });
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques', error);
      }
    };

    fetchStats();
  }, []);

  const statsCards = [
    {
      title: 'Utilisateurs',
      value: stats.totalUsers,
      icon: PeopleIcon,
      color: '#1976d2'
    },
    {
      title: 'Rendez-vous',
      value: stats.totalAppointments,
      icon: EventAvailableIcon,
      color: '#2e7d32'
    },
    {
      title: 'Praticiens',
      value: stats.totalPractitioners,
      icon: LocalHospitalIcon,
      color: '#9c27b0'
    },
    {
      title: 'Services',
      value: stats.totalServices,
      icon: AddCircleIcon,
      color: '#d32f2f'
    }
  ];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 4 }}>
      <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom sx={{ mb: 4 }}>
        Tableau de Bord Admin
      </Typography>

      {/* Statistiques principales */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((stat, index) => (
          <Grid item xs={12} md={6} lg={3} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {stat.title}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stat.value}
                  </Typography>
                </Box>
                <stat.icon 
                  sx={{ 
                    fontSize: 48, 
                    color: stat.color,
                    opacity: 0.7
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Graphiques */}
      <Grid container spacing={4}>
        {/* Graphique des Utilisateurs */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Évolution des Utilisateurs
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="users" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Graphique des Rendez-vous */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Rendez-vous Mensuels
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="appointments" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboardPage;