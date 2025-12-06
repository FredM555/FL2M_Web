// src/pages/Admin/AdminTransactionsPage.tsx
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
  Tabs,
  Tab,
  TextField
} from '@mui/material';
import {
  getAllTransactions,
  getGlobalStats,
  getStatsByPeriod,
  getStatsByPractitioner,
  TransactionWithDetails,
  TransactionStats,
  PeriodStats
} from '../../services/transactions';
import { formatAmount, getTransactionStatusLabel } from '../../types/payments';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminTransactionsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [periodStats, setPeriodStats] = useState<PeriodStats[]>([]);
  const [practitionerStats, setPractitionerStats] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Onglets
  const [tabValue, setTabValue] = useState(0);

  // Filtres
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [transferFilter, setTransferFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<'week' | 'month'>('month');

  useEffect(() => {
    loadData();
  }, [statusFilter, transferFilter, modeFilter]);

  useEffect(() => {
    if (tabValue === 1) {
      loadPeriodStats();
    } else if (tabValue === 2) {
      loadPractitionerStats();
    }
  }, [tabValue, periodFilter]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Récupérer les stats globales
      const { data: statsData } = await getGlobalStats();
      setStats(statsData);

      // Récupérer les transactions
      const filters: any = { limit: 100 };

      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      if (transferFilter !== 'all') {
        filters.transfer_status = transferFilter;
      }

      if (modeFilter !== 'all') {
        filters.is_test_mode = modeFilter === 'test';
      }

      const { data: transactionsData } = await getAllTransactions(filters);
      setTransactions(transactionsData || []);
    } catch (err: any) {
      console.error('Erreur chargement transactions:', err);
      setError('Erreur lors du chargement des transactions');
    } finally {
      setLoading(false);
    }
  };

  const loadPeriodStats = async () => {
    try {
      const { data } = await getStatsByPeriod(periodFilter);
      setPeriodStats(data || []);
    } catch (err) {
      console.error('Erreur chargement stats période:', err);
    }
  };

  const loadPractitionerStats = async () => {
    try {
      const { data } = await getStatsByPractitioner();
      setPractitionerStats(data || []);
    } catch (err) {
      console.error('Erreur chargement stats intervenant:', err);
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

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
        Gestion des Transactions
      </Typography>

      {/* Statistiques Globales */}
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
                    Chiffre d'Affaires
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
                  <TrendingUpIcon sx={{ color: 'info.main', mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Commissions Totales
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                  {formatAmount(stats.total_commission)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Taux de Commission Moyen
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {stats.total_revenue > 0
                    ? ((stats.total_commission / stats.total_revenue) * 100).toFixed(1)
                    : '0'}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Onglets */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          aria-label="admin transactions tabs"
        >
          <Tab label="Toutes les Transactions" />
          <Tab label="Statistiques par Période" />
          <Tab label="Par Intervenant" />
        </Tabs>
      </Paper>

      {/* Onglet 1: Toutes les transactions */}
      <TabPanel value={tabValue} index={0}>
        {/* Filtres */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
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

            <Grid item xs={12} sm={4}>
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

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Mode</InputLabel>
                <Select
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                  label="Mode"
                >
                  <MenuItem value="all">Tous</MenuItem>
                  <MenuItem value="prod">Production</MenuItem>
                  <MenuItem value="test">Test</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Tableau */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : transactions.length === 0 ? (
          <Alert severity="info">Aucune transaction trouvée</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Code RDV</TableCell>
                  <TableCell>Intervenant</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Commission</TableCell>
                  <TableCell align="right">Frais Stripe</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Transfert</TableCell>
                  <TableCell>Mode</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id} hover>
                    <TableCell>
                      {format(parseISO(transaction.created_at), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {transaction.appointment?.unique_code ? (
                        <Chip
                          label={transaction.appointment.unique_code}
                          size="small"
                          variant="outlined"
                          sx={{
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            fontSize: '0.75rem'
                          }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {transaction.practitioner?.profiles
                        ? `${transaction.practitioner.profiles.first_name} ${transaction.practitioner.profiles.last_name}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {transaction.client
                        ? `${transaction.client.first_name} ${transaction.client.last_name}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell>{transaction.appointment?.service?.name || 'N/A'}</TableCell>
                    <TableCell align="right">
                      <strong>{formatAmount(transaction.amount_total)}</strong>
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'info.main', fontWeight: 600 }}>
                      {formatAmount(transaction.amount_platform_commission)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'warning.main', fontSize: '0.875rem' }}>
                      {formatAmount(transaction.amount_stripe_fees)}
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
                    <TableCell>
                      <Chip
                        label={transaction.is_test_mode ? 'TEST' : 'PROD'}
                        color={transaction.is_test_mode ? 'warning' : 'success'}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.7rem'
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Onglet 2: Statistiques par période */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 3 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Période</InputLabel>
            <Select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as 'week' | 'month')}
              label="Période"
            >
              <MenuItem value="week">Par Semaine</MenuItem>
              <MenuItem value="month">Par Mois</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {periodStats.length > 0 && (
          <>
            {/* Graphique */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Évolution des Revenus et Commissions
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={periodStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatAmount(Number(value))} />
                  <Legend />
                  <Bar dataKey="total_revenue" fill="#4caf50" name="Chiffre d'Affaires" />
                  <Bar dataKey="total_commission" fill="#2196f3" name="Commissions" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>

            {/* Tableau */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Période</TableCell>
                    <TableCell align="right">Nb Transactions</TableCell>
                    <TableCell align="right">Chiffre d'Affaires</TableCell>
                    <TableCell align="right">Commissions</TableCell>
                    <TableCell align="right">Taux</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {periodStats.map((stat) => (
                    <TableRow key={stat.period}>
                      <TableCell><strong>{stat.period}</strong></TableCell>
                      <TableCell align="right">{stat.transaction_count}</TableCell>
                      <TableCell align="right">
                        <strong>{formatAmount(Number(stat.total_revenue))}</strong>
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'info.main' }}>
                        {formatAmount(Number(stat.total_commission))}
                      </TableCell>
                      <TableCell align="right">
                        {Number(stat.total_revenue) > 0
                          ? ((Number(stat.total_commission) / Number(stat.total_revenue)) * 100).toFixed(1)
                          : '0'}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </TabPanel>

      {/* Onglet 3: Par intervenant */}
      <TabPanel value={tabValue} index={2}>
        {practitionerStats.length > 0 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Intervenant</TableCell>
                  <TableCell align="right">Nb Transactions</TableCell>
                  <TableCell align="right">CA Généré</TableCell>
                  <TableCell align="right">Commissions</TableCell>
                  <TableCell align="right">En Attente</TableCell>
                  <TableCell align="right">Transférés</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {practitionerStats.map((stat) => (
                  <TableRow key={stat.practitioner_id}>
                    <TableCell><strong>{stat.practitioner_name}</strong></TableCell>
                    <TableCell align="right">{stat.total_transactions}</TableCell>
                    <TableCell align="right">
                      <strong>{formatAmount(Number(stat.total_revenue))}</strong>
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'info.main' }}>
                      {formatAmount(Number(stat.total_commission))}
                    </TableCell>
                    <TableCell align="right">{stat.pending_transfers}</TableCell>
                    <TableCell align="right">{stat.completed_transfers}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>
    </Container>
  );
};

export default AdminTransactionsPage;
