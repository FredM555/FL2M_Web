// src/pages/PractitionerTransactionsPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import {
  getPractitionerTransactions,
  getPractitionerStats,
  TransactionWithDetails,
  TransactionStats
} from '../services/transactions';
import { formatAmount, getTransactionStatusLabel } from '../types/payments';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PendingIcon from '@mui/icons-material/Pending';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReceiptIcon from '@mui/icons-material/Receipt';

const PractitionerTransactionsPage: React.FC = () => {
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [transferFilter, setTransferFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const perPage = 20;

  useEffect(() => {
    if (profile?.practitioner_id) {
      loadData();
    }
  }, [profile, statusFilter, transferFilter, page]);

  const loadData = async () => {
    if (!profile?.practitioner_id) return;

    setLoading(true);
    setError(null);

    try {
      // Récupérer les stats
      const { data: statsData } = await getPractitionerStats(profile.practitioner_id);
      setStats(statsData);

      // Récupérer les transactions
      const filters: any = {
        limit: perPage,
        offset: (page - 1) * perPage
      };

      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      if (transferFilter !== 'all') {
        filters.transfer_status = transferFilter;
      }

      const { data: transactionsData } = await getPractitionerTransactions(
        profile.practitioner_id,
        filters
      );

      setTransactions(transactionsData || []);
    } catch (err: any) {
      console.error('Erreur chargement transactions:', err);
      setError('Erreur lors du chargement des transactions');
    } finally {
      setLoading(false);
    }
  };

  const getTransferStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'En attente',
      eligible: 'Éligible',
      processing: 'En cours',
      completed: 'Transféré',
      failed: 'Échec'
    };
    return labels[status] || status;
  };

  const getTransferStatusColor = (status: string): any => {
    const colors: Record<string, any> = {
      pending: 'warning',
      eligible: 'info',
      processing: 'info',
      completed: 'success',
      failed: 'error'
    };
    return colors[status] || 'default';
  };

  if (!profile?.practitioner_id) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Vous devez être connecté en tant qu'intervenant pour accéder à cette page.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
        Mes Transactions
      </Typography>

      {/* Statistiques */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ReceiptIcon sx={{ color: 'primary.main', mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Total Transactions
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {stats.total_transactions}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AttachMoneyIcon sx={{ color: 'success.main', mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Revenu Total
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                  {formatAmount(stats.total_revenue)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PendingIcon sx={{ color: 'warning.main', mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    En Attente
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                  {stats.pending_transfers}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Transférés
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {stats.completed_transfers}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filtres */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Statut Paiement</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Statut Paiement"
              >
                <MenuItem value="all">Tous</MenuItem>
                <MenuItem value="succeeded">Réussi</MenuItem>
                <MenuItem value="pending">En attente</MenuItem>
                <MenuItem value="failed">Échec</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Statut Transfert</InputLabel>
              <Select
                value={transferFilter}
                onChange={(e) => setTransferFilter(e.target.value)}
                label="Statut Transfert"
              >
                <MenuItem value="all">Tous</MenuItem>
                <MenuItem value="pending">En attente</MenuItem>
                <MenuItem value="eligible">Éligible</MenuItem>
                <MenuItem value="completed">Transféré</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Tableau des transactions */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : transactions.length === 0 ? (
        <Alert severity="info">Aucune transaction trouvée</Alert>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell align="right">Montant Total</TableCell>
                  <TableCell align="right">Votre Part</TableCell>
                  <TableCell align="right">Commission</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Transfert</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id} hover>
                    <TableCell>
                      {format(parseISO(transaction.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {transaction.appointment?.service?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {transaction.client
                        ? `${transaction.client.first_name} ${transaction.client.last_name}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell align="right">
                      <strong>{formatAmount(transaction.amount_total)}</strong>
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600 }}>
                      {formatAmount(transaction.amount_practitioner)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>
                      {formatAmount(transaction.amount_platform_commission)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getTransactionStatusLabel(transaction.status)}
                        color={transaction.status === 'succeeded' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getTransferStatusLabel(transaction.transfer_status)}
                        color={getTransferStatusColor(transaction.transfer_status)}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={Math.ceil((stats?.total_transactions || 0) / perPage)}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
            />
          </Box>
        </>
      )}
    </Container>
  );
};

export default PractitionerTransactionsPage;
