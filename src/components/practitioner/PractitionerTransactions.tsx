// src/components/practitioner/PractitionerTransactions.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import InfoIcon from '@mui/icons-material/Info';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../services/supabase';
import { formatAmount, TransactionStatus } from '../../types/payments';

interface SubscriptionPayment {
  id: string;
  amount: number;
  period_start_date: string;
  period_end_date: string;
  status: TransactionStatus;
  payment_date: string | null;
  description: string | null;
  invoice_url: string | null;
  created_at: string;
}

interface AppointmentTransaction {
  id: string;
  amount_total: number;
  amount_practitioner: number;
  amount_platform_commission: number;
  status: TransactionStatus;
  payment_date: string | null;
  description: string | null;
  commission_type: 'free' | 'starter' | 'pro' | 'premium' | null;
  created_at: string;
}

interface PractitionerTransactionsProps {
  practitionerId: string;
}

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index } = props;
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const PractitionerTransactions: React.FC<PractitionerTransactionsProps> = ({ practitionerId }) => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [subscriptionPayments, setSubscriptionPayments] = useState<SubscriptionPayment[]>([]);
  const [appointmentTransactions, setAppointmentTransactions] = useState<AppointmentTransaction[]>([]);

  useEffect(() => {
    loadTransactions();
  }, [practitionerId]);

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      // Charger les paiements d'abonnement
      const { data: payments, error: paymentsError } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('practitioner_id', practitionerId)
        .order('period_start_date', { ascending: false });

      if (paymentsError) throw paymentsError;
      setSubscriptionPayments(payments || []);

      // Charger les transactions de rendez-vous
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('practitioner_id', practitionerId)
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;
      setAppointmentTransactions(transactions || []);

    } catch (err: any) {
      console.error('Erreur lors du chargement des transactions:', err);
      setError(err.message || 'Erreur lors du chargement des transactions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status: TransactionStatus) => {
    const statusConfig = {
      pending: { label: 'En attente', color: 'warning' as const },
      processing: { label: 'En cours', color: 'info' as const },
      succeeded: { label: 'Réussi', color: 'success' as const },
      failed: { label: 'Échoué', color: 'error' as const },
      refunded: { label: 'Remboursé', color: 'default' as const },
      cancelled: { label: 'Annulé', color: 'default' as const }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Chargement des transactions...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  // Calculer les totaux
  const totalSubscriptionPaid = subscriptionPayments
    .filter(p => p.status === 'succeeded')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalAppointmentRevenue = appointmentTransactions
    .filter(t => t.status === 'succeeded')
    .reduce((sum, t) => sum + t.amount_practitioner, 0);

  const totalCommissions = appointmentTransactions
    .filter(t => t.status === 'succeeded')
    .reduce((sum, t) => sum + t.amount_platform_commission, 0);

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Mes Transactions
      </Typography>

      {/* Résumé financier */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ flex: 1, minWidth: 200, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <CardContent>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Abonnements payés
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {formatAmount(totalSubscriptionPaid)}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 200, bgcolor: 'success.light', color: 'success.contrastText' }}>
          <CardContent>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Revenus rendez-vous
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {formatAmount(totalAppointmentRevenue)}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 200, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
          <CardContent>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Commissions versées
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {formatAmount(totalCommissions)}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Onglets */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: 2,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              '&.Mui-selected': {
                color: 'primary.main',
              },
            },
          }}
        >
          <Tab icon={<ReceiptIcon />} label={`Abonnements (${subscriptionPayments.length})`} iconPosition="start" />
          <Tab icon={<AccountBalanceIcon />} label={`Rendez-vous (${appointmentTransactions.length})`} iconPosition="start" />
        </Tabs>

        {/* Onglet Abonnements */}
        <TabPanel value={tabValue} index={0}>
          {subscriptionPayments.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>
              Aucun paiement d'abonnement pour le moment.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Période</TableCell>
                    <TableCell>Montant</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Date de paiement</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {subscriptionPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {format(new Date(payment.period_start_date), 'MMMM yyyy', { locale: fr })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(payment.period_start_date), 'dd/MM/yyyy', { locale: fr })} -{' '}
                          {format(new Date(payment.period_end_date), 'dd/MM/yyyy', { locale: fr })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatAmount(payment.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>{getStatusChip(payment.status)}</TableCell>
                      <TableCell>
                        {payment.payment_date ? (
                          <Typography variant="body2">
                            {format(new Date(payment.payment_date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {payment.invoice_url && (
                          <Tooltip title="Voir la facture">
                            <IconButton
                              size="small"
                              onClick={() => window.open(payment.invoice_url!, '_blank')}
                            >
                              <ReceiptIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Onglet Rendez-vous */}
        <TabPanel value={tabValue} index={1}>
          {appointmentTransactions.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>
              Aucune transaction de rendez-vous pour le moment.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Type de contrat</TableCell>
                    <TableCell align="right">Montant total</TableCell>
                    <TableCell align="right">Votre part</TableCell>
                    <TableCell align="right">Commission</TableCell>
                    <TableCell>Statut</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {appointmentTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {format(new Date(transaction.created_at), 'dd/MM/yyyy', { locale: fr })}
                        </Typography>
                        {transaction.payment_date && (
                          <Typography variant="caption" color="text.secondary">
                            Payé le {format(new Date(transaction.payment_date), 'dd/MM/yyyy', { locale: fr })}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {transaction.commission_type ? (
                          <Chip
                            label={transaction.commission_type.toUpperCase()}
                            size="small"
                            variant="outlined"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {formatAmount(transaction.amount_total)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                          {formatAmount(transaction.amount_practitioner)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {formatAmount(transaction.amount_platform_commission)}
                        </Typography>
                      </TableCell>
                      <TableCell>{getStatusChip(transaction.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </Paper>

      {/* Note informative */}
      <Alert severity="info" icon={<InfoIcon />} sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>📝 Note:</strong> Les transactions affichées ici sont à titre informatif. Pour toute question concernant
          vos paiements ou virements, contactez l'administration.
        </Typography>
      </Alert>
    </Box>
  );
};

export default PractitionerTransactions;
