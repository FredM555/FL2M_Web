// src/components/admin/RecentEntries.tsx
import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Skeleton,
  Button
} from '@mui/material';
import { format, formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link as RouterLink } from 'react-router-dom';
import { supabase } from '../../services/supabase';

interface Entry {
  id: string;
  type: 'appointment' | 'user' | 'service';
  title: string;
  description: string;
  status?: string;
  date: string;
}

interface RecentEntriesProps {
  title: string;
  type: 'appointments' | 'users' | 'services';
  limit?: number;
  linkTo: string;
}

const RecentEntries: React.FC<RecentEntriesProps> = ({ 
  title, 
  type, 
  limit = 5,
  linkTo
}) => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentEntries = async () => {
      setLoading(true);
      try {
        let data: Entry[] = [];
        
        switch (type) {
          case 'appointments':
            const { data: appointments, error: appointmentsError } = await supabase
              .from('appointments')
              .select(`
                id,
                start_time,
                status,
                client:profiles!client_id(first_name, last_name),
                service:services(name)
              `)
              .order('created_at', { ascending: false })
              .limit(limit);
            
            if (appointmentsError) throw appointmentsError;
            
            data = appointments.map(apt => ({
              id: apt.id,
              type: 'appointment',
              title: apt.service?.name || 'Service inconnu',
              description: `${apt.client?.first_name || ''} ${apt.client?.last_name || ''}`,
              status: apt.status,
              date: apt.start_time
            }));
            break;
            
          case 'users':
            const { data: users, error: usersError } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, email, user_type, created_at')
              .order('created_at', { ascending: false })
              .limit(limit);
            
            if (usersError) throw usersError;
            
            data = users.map(user => ({
              id: user.id,
              type: 'user',
              title: `${user.first_name || ''} ${user.last_name || ''}`,
              description: user.email || '',
              status: user.user_type,
              date: user.created_at
            }));
            break;
            
          case 'services':
            const { data: services, error: servicesError } = await supabase
              .from('services')
              .select('id, name, category, subcategory, created_at')
              .order('created_at', { ascending: false })
              .limit(limit);
            
            if (servicesError) throw servicesError;
            
            data = services.map(service => ({
              id: service.id,
              type: 'service',
              title: service.name,
              description: `${service.category} - ${service.subcategory}`,
              date: service.created_at
            }));
            break;
        }
        
        setEntries(data);
      } catch (error: any) {
        console.error(`Erreur lors de la récupération des ${type}:`, error);
        setError(`Impossible de charger les données: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentEntries();
  }, [type, limit]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'confirmed':
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      case 'admin':
        return 'primary';
      case 'intervenant':
        return 'info';
      case 'client':
        return 'default';
      default:
        return 'default';
    }
  };

  // Formater la date relative (il y a X temps)
  const formatRelativeDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistance(date, new Date(), { 
        addSuffix: true,
        locale: fr 
      });
    } catch (e) {
      return 'Date inconnue';
    }
  };

  // Formater la date absolue (format standard)
  const formatAbsoluteDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy HH:mm', { locale: fr });
    } catch (e) {
      return 'Date inconnue';
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3, height: '100%' }}>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <Box sx={{ pt: 2 }}>
          {[...Array(3)].map((_, index) => (
            <Box key={index} sx={{ display: 'flex', mb: 2 }}>
              <Skeleton variant="rectangular" width={40} height={40} sx={{ mr: 2 }} />
              <Box sx={{ width: '100%' }}>
                <Skeleton variant="text" width="60%" height={24} />
                <Skeleton variant="text" width="40%" height={20} />
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3, height: '100%' }}>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <Typography color="error">{error}</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{title}</Typography>
        <Button 
          component={RouterLink} 
          to={linkTo} 
          size="small" 
          sx={{ textTransform: 'none' }}
        >
          Voir tous
        </Button>
      </Box>
      
      {entries.length === 0 ? (
        <Typography color="textSecondary" align="center" sx={{ py: 3 }}>
          Aucune donnée disponible
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Détail</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} hover>
                  <TableCell>{entry.title}</TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell>
                    {entry.status && (
                      <Chip 
                        size="small" 
                        label={entry.status} 
                        color={getStatusColor(entry.status) as any}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right" title={formatAbsoluteDate(entry.date)}>
                    {formatRelativeDate(entry.date)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default RecentEntries;