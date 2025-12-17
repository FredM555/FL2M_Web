import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Pagination,
  Grid,
  Alert,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import { format, startOfDay, endOfDay } from 'date-fns';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  getActivityLogs,
  getActionTypes,
  ActivityLog,
  getProfiles,
  Profile
} from '../../services/supabase';
import { logger } from '../../utils/logger';

const AdminActivityLogsPage: React.FC = () => {
  // États
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Filtres
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Données pour les filtres
  const [users, setUsers] = useState<Profile[]>([]);
  const [actionTypes, setActionTypes] = useState<string[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  // Charger les données initiales
  useEffect(() => {
    loadUsers();
    loadActionTypes();
    loadLogs();
  }, []);

  // Recharger les logs quand les filtres ou la page changent
  useEffect(() => {
    loadLogs();
  }, [page, selectedUser, selectedAction, startDate, endDate]);

  const loadUsers = async () => {
    try {
      const { data, error } = await getProfiles();
      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      logger.error('Erreur lors du chargement des utilisateurs:', err);
    }
  };

  const loadActionTypes = async () => {
    try {
      const { data, error } = await getActionTypes();
      if (error) throw error;
      setActionTypes(data || []);
    } catch (err: any) {
      logger.error('Erreur lors du chargement des types d\'action:', err);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error, count } = await getActivityLogs({
        userId: selectedUser || undefined,
        actionType: selectedAction || undefined,
        startDate: startDate ? startOfDay(startDate).toISOString() : undefined,
        endDate: endDate ? endOfDay(endDate).toISOString() : undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize
      });

      if (error) throw error;

      setLogs(data);
      setTotalCount(count || 0);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedUser('');
    setSelectedAction('');
    setStartDate(null);
    setEndDate(null);
    setPage(1);
  };

  const getActionColor = (actionType: string) => {
    if (actionType.includes('login')) return 'success';
    if (actionType.includes('logout')) return 'default';
    if (actionType.includes('failed')) return 'error';
    if (actionType.includes('created')) return 'primary';
    if (actionType.includes('cancelled')) return 'warning';
    if (actionType.includes('deleted')) return 'error';
    if (actionType.includes('updated')) return 'info';
    return 'default';
  };

  const getActionLabel = (actionType: string) => {
    const labels: { [key: string]: string } = {
      'login': 'Connexion',
      'logout': 'Déconnexion',
      'login_failed': 'Échec connexion',
      'appointment_created': 'RDV créé',
      'appointment_updated': 'RDV modifié',
      'appointment_cancelled': 'RDV annulé',
      'appointment_confirmed': 'RDV confirmé',
      'appointment_completed': 'RDV terminé',
      'profile_updated': 'Profil modifié',
      'password_changed': 'Mot de passe changé',
      'document_uploaded': 'Document uploadé',
      'document_deleted': 'Document supprimé'
    };
    return labels[actionType] || actionType;
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 4 }}>
        <Card>
          <CardHeader
            title="Journaux d'Activité"
            subheader={`${totalCount} événement(s) total`}
          />
          <CardContent>
            {/* Filtres */}
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Utilisateur</InputLabel>
                    <Select
                      value={selectedUser}
                      label="Utilisateur"
                      onChange={(e) => {
                        setSelectedUser(e.target.value);
                        setPage(1);
                      }}
                    >
                      <MenuItem value="">Tous</MenuItem>
                      {users.map((user) => (
                        <MenuItem key={user.id} value={user.id}>
                          {user.pseudo || `${user.first_name} ${user.last_name}`} ({user.email})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Type d'action</InputLabel>
                    <Select
                      value={selectedAction}
                      label="Type d'action"
                      onChange={(e) => {
                        setSelectedAction(e.target.value);
                        setPage(1);
                      }}
                    >
                      <MenuItem value="">Tous</MenuItem>
                      {actionTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {getActionLabel(type)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={2}>
                  <DatePicker
                    label="Date début"
                    value={startDate}
                    onChange={(newValue) => {
                      setStartDate(newValue);
                      setPage(1);
                    }}
                    slotProps={{
                      textField: { size: 'small', fullWidth: true }
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={2}>
                  <DatePicker
                    label="Date fin"
                    value={endDate}
                    onChange={(newValue) => {
                      setEndDate(newValue);
                      setPage(1);
                    }}
                    slotProps={{
                      textField: { size: 'small', fullWidth: true }
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={2}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      onClick={handleResetFilters}
                      fullWidth
                      startIcon={<FilterListIcon />}
                    >
                      Réinitialiser
                    </Button>
                    <Button
                      variant="contained"
                      onClick={loadLogs}
                      sx={{ minWidth: 'auto' }}
                    >
                      <RefreshIcon />
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Erreur */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Loading */}
            {loading && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Chargement des logs...
                </Typography>
              </Box>
            )}

            {/* Tableau */}
            {!loading && (
              <>
                <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto' }}>
                  <Table sx={{ minWidth: { xs: 650, sm: 900 } }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Utilisateur</TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          Type
                        </TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                          Description
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                          IP
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                              Aucun log trouvé
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        logs.map((log) => (
                          <TableRow key={log.id} hover>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                {log.pseudo || `${log.first_name} ${log.last_name}`}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                {log.email}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                              <Chip
                                label={log.user_type === 'admin' ? 'Admin' : log.user_type === 'intervenant' ? 'Intervenant' : 'Client'}
                                size="small"
                                color={log.user_type === 'admin' ? 'error' : log.user_type === 'intervenant' ? 'primary' : 'default'}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={getActionLabel(log.action_type)}
                                size="small"
                                color={getActionColor(log.action_type)}
                              />
                            </TableCell>
                            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  maxWidth: 300,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                }}
                              >
                                {log.action_description || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                {log.ip_address || '-'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={(e, value) => setPage(value)}
                      color="primary"
                      size="large"
                    />
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </LocalizationProvider>
  );
};

export default AdminActivityLogsPage;
