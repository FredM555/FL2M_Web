// src/components/admin/PractitionerInvoicesModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  Grid,
  Divider
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import { InvoiceService, Invoice } from '../../services/invoice-service';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logger } from '../../utils/logger';

interface PractitionerInvoicesModalProps {
  open: boolean;
  onClose: () => void;
  practitionerId: string;
  practitionerName: string;
}

const PractitionerInvoicesModal: React.FC<PractitionerInvoicesModalProps> = ({
  open,
  onClose,
  practitionerId,
  practitionerName
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [invoiceStats, setInvoiceStats] = useState<any>(null);

  // États pour la génération de facture manuelle
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [estimatedFee, setEstimatedFee] = useState(0);

  useEffect(() => {
    if (open) {
      loadInvoices();
      loadStats();
    }
  }, [open, practitionerId]);

  const loadInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await InvoiceService.getPractitionerInvoices(practitionerId, {
        limit: 50
      });
      setInvoices(data);
    } catch (err: any) {
      logger.error('Erreur lors du chargement des factures:', err);
      setError('Impossible de charger les factures');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const stats = await InvoiceService.getPractitionerInvoiceStats(practitionerId);
      setInvoiceStats(stats);
    } catch (err: any) {
      logger.error('Erreur lors du chargement des statistiques:', err);
    }
  };

  const calculateFee = async () => {
    try {
      const fee = await InvoiceService.calculateInvoiceFee(practitionerId, 'manual');
      setEstimatedFee(fee);
    } catch (err: any) {
      logger.error('Erreur lors du calcul des frais:', err);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!periodStart || !periodEnd) {
      setError('Veuillez sélectionner une période');
      return;
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    if (start > end) {
      setError('La date de début doit être avant la date de fin');
      return;
    }

    setGeneratingInvoice(true);
    setError(null);

    try {
      await InvoiceService.generatePractitionerInvoice({
        practitionerId,
        periodStart,
        periodEnd,
        generationType: 'manual',
        adminId: user?.id
      });

      setSuccess('Facture générée avec succès !');
      setShowGenerateForm(false);
      setPeriodStart('');
      setPeriodEnd('');
      loadInvoices();
      loadStats();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      logger.error('Erreur lors de la génération de la facture:', err);
      setError(err.message || 'Impossible de générer la facture');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    if (!window.confirm('Marquer cette facture comme payée ?')) {
      return;
    }

    try {
      await InvoiceService.markInvoiceAsPaid(invoiceId, undefined, user?.id);
      setSuccess('Facture marquée comme payée !');
      loadInvoices();
      loadStats();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      logger.error('Erreur lors du marquage comme payée:', err);
      setError('Impossible de marquer la facture comme payée');
    }
  };

  const getStatusChip = (status: Invoice['status']) => {
    const config = {
      draft: { label: 'Brouillon', color: 'default' as const, icon: <PendingIcon /> },
      issued: { label: 'Émise', color: 'warning' as const, icon: <PendingIcon /> },
      paid: { label: 'Payée', color: 'success' as const, icon: <CheckCircleIcon /> },
      cancelled: { label: 'Annulée', color: 'error' as const, icon: <CancelIcon /> },
      refunded: { label: 'Remboursée', color: 'info' as const, icon: <CancelIcon /> }
    };

    const { label, color, icon } = config[status] || config.draft;
    return <Chip label={label} color={color} size="small" icon={icon} />;
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, maxHeight: '90vh' }
      }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #345995 0%, #1D3461 100%)',
          color: 'white'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ReceiptIcon sx={{ mr: 1 }} />
            Factures - {practitionerName}
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => {
              setShowGenerateForm(!showGenerateForm);
              calculateFee();
            }}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.3)'
              }
            }}
          >
            Générer Facture
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ mt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Statistiques */}
        {invoiceStats && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(52, 89, 149, 0.05)', borderRadius: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Total factures
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {invoiceStats.total_invoices}
                </Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Montant total
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {formatAmount(invoiceStats.total_amount)}
                </Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Ce mois
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {invoiceStats.this_month_count} facture(s)
                </Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Frais ce mois
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: invoiceStats.this_month_fees > 0 ? 'error.main' : 'inherit' }}>
                  {formatAmount(invoiceStats.this_month_fees)}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Formulaire de génération */}
        {showGenerateForm && (
          <Box sx={{ mb: 3, p: 3, border: '2px solid', borderColor: 'primary.main', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Générer une nouvelle facture
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} md={5}>
                <TextField
                  label="Date de début"
                  type="date"
                  fullWidth
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={5}>
                <TextField
                  label="Date de fin"
                  type="date"
                  fullWidth
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleGenerateInvoice}
                  disabled={generatingInvoice}
                  sx={{ height: '100%' }}
                >
                  {generatingInvoice ? <CircularProgress size={24} /> : 'Générer'}
                </Button>
              </Grid>
            </Grid>

            {estimatedFee > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                ⚠️ Cette facture engendrera des frais de <strong>{formatAmount(estimatedFee)}</strong>
                (plus de 2 factures ce mois)
              </Alert>
            )}
          </Box>
        )}

        {/* Liste des factures */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : invoices.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <ReceiptIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Aucune facture générée pour cet intervenant
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                  <TableCell><strong>N° Facture</strong></TableCell>
                  <TableCell><strong>Période</strong></TableCell>
                  <TableCell><strong>Émise le</strong></TableCell>
                  <TableCell align="right"><strong>Montant</strong></TableCell>
                  <TableCell><strong>Type</strong></TableCell>
                  <TableCell><strong>Statut</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace' }}>
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>
                      {invoice.period_start && invoice.period_end ? (
                        <>
                          {format(new Date(invoice.period_start), 'dd/MM/yyyy', { locale: fr })}
                          {' - '}
                          {format(new Date(invoice.period_end), 'dd/MM/yyyy', { locale: fr })}
                        </>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invoice.issue_date), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatAmount(invoice.amount_total)}
                      {invoice.extra_invoice_fee && invoice.extra_invoice_fee > 0 && (
                        <Typography variant="caption" display="block" color="error">
                          (+{formatAmount(invoice.extra_invoice_fee)} frais)
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={invoice.generation_type === 'automatic' ? 'Auto' : 'Manuelle'}
                        size="small"
                        color={invoice.generation_type === 'automatic' ? 'default' : 'primary'}
                      />
                    </TableCell>
                    <TableCell>
                      {getStatusChip(invoice.status)}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        {invoice.status === 'issued' && (
                          <Tooltip title="Marquer comme payée">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleMarkAsPaid(invoice.id)}
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Télécharger PDF">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              // TODO: Implémenter téléchargement PDF
                              alert('La génération de PDF sera implémentée prochainement');
                            }}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PractitionerInvoicesModal;
