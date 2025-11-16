// src/pages/Admin/PractitionerRequestsPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  getAllPractitionerRequests,
  approvePractitionerRequest,
  rejectPractitionerRequest,
  deletePractitionerRequest,
  PractitionerRequest
} from '../../services/supabase';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import WorkIcon from '@mui/icons-material/Work';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

const AdminPractitionerRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<PractitionerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<PractitionerRequest | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await getAllPractitionerRequests();
      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement des demandes:', err);
      showSnackbar('Erreur lors du chargement des demandes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleViewDetails = (request: PractitionerRequest) => {
    setSelectedRequest(request);
    setDetailsOpen(true);
  };

  const handleOpenActionDialog = (request: PractitionerRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setAdminNotes('');
    setActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    setActionLoading(true);
    try {
      const actionFn = actionType === 'approve' ? approvePractitionerRequest : rejectPractitionerRequest;
      const { error } = await actionFn(selectedRequest.id, adminNotes || undefined);

      if (error) throw error;

      showSnackbar(
        `Demande ${actionType === 'approve' ? 'approuvée' : 'rejetée'} avec succès`,
        'success'
      );
      setActionDialogOpen(false);
      await fetchRequests();
    } catch (err: any) {
      console.error('Erreur lors de l\'action:', err);
      showSnackbar(err.message || 'Erreur lors du traitement de la demande', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (requestId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette demande ?')) return;

    try {
      const { error } = await deletePractitionerRequest(requestId);
      if (error) throw error;

      showSnackbar('Demande supprimée avec succès', 'success');
      await fetchRequests();
    } catch (err: any) {
      console.error('Erreur lors de la suppression:', err);
      showSnackbar('Erreur lors de la suppression de la demande', 'error');
    }
  };

  const getStatusChip = (status: PractitionerRequest['status']) => {
    const statusConfig = {
      pending: { label: 'En attente', color: 'warning' as const, icon: <HourglassEmptyIcon fontSize="small" /> },
      approved: { label: 'Approuvée', color: 'success' as const, icon: <CheckCircleIcon fontSize="small" /> },
      rejected: { label: 'Rejetée', color: 'error' as const, icon: <CancelIcon fontSize="small" /> }
    };

    const config = statusConfig[status];
    return <Chip icon={config.icon} label={config.label} color={config.color} size="small" />;
  };

  const filterRequestsByStatus = (status?: PractitionerRequest['status']) => {
    if (!status) return requests;
    return requests.filter(req => req.status === status);
  };

  const renderRequestsTable = (status?: PractitionerRequest['status']) => {
    const filteredRequests = filterRequestsByStatus(status);

    if (filteredRequests.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body1" color="text.secondary">
            Aucune demande {status === 'pending' ? 'en attente' : status === 'approved' ? 'approuvée' : status === 'rejected' ? 'rejetée' : ''}
          </Typography>
        </Box>
      );
    }

    return (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Utilisateur</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Date de demande</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRequests.map((request) => (
              <TableRow key={request.id} hover>
                <TableCell>
                  {request.user?.first_name} {request.user?.last_name}
                </TableCell>
                <TableCell>{request.user?.email}</TableCell>
                <TableCell>
                  {format(new Date(request.created_at), 'dd MMMM yyyy', { locale: fr })}
                </TableCell>
                <TableCell>{getStatusChip(request.status)}</TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => handleViewDetails(request)}
                    color="primary"
                  >
                    <VisibilityIcon />
                  </IconButton>
                  {request.status === 'pending' && (
                    <>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenActionDialog(request, 'approve')}
                        color="success"
                      >
                        <CheckCircleIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenActionDialog(request, 'reject')}
                        color="error"
                      >
                        <CancelIcon />
                      </IconButton>
                    </>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(request.id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Demandes d'Intervenant
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gérez les demandes d'inscription en tant qu'intervenant
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={fetchRequests}
          disabled={loading}
        >
          Actualiser
        </Button>
      </Box>

      {/* Statistiques */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    En attente
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: 'warning.main' }}>
                    {pendingCount}
                  </Typography>
                </Box>
                <HourglassEmptyIcon sx={{ fontSize: 48, color: 'warning.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Approuvées
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {approvedCount}
                  </Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Rejetées
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: 'error.main' }}>
                    {rejectedCount}
                  </Typography>
                </Box>
                <CancelIcon sx={{ fontSize: 48, color: 'error.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label={`Toutes (${requests.length})`} />
          <Tab label={`En attente (${pendingCount})`} />
          <Tab label={`Approuvées (${approvedCount})`} />
          <Tab label={`Rejetées (${rejectedCount})`} />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TabPanel value={tabValue} index={0}>
              {renderRequestsTable()}
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              {renderRequestsTable('pending')}
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
              {renderRequestsTable('approved')}
            </TabPanel>
            <TabPanel value={tabValue} index={3}>
              {renderRequestsTable('rejected')}
            </TabPanel>
          </>
        )}
      </Paper>

      {/* Dialog de détails */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #345995 0%, #1D3461 100%)', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <WorkIcon sx={{ mr: 1 }} />
            Détails de la demande
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          {selectedRequest && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">
                      {selectedRequest.user?.first_name} {selectedRequest.user?.last_name}
                    </Typography>
                    {getStatusChip(selectedRequest.status)}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {selectedRequest.user?.email}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Divider />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Motivation
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {selectedRequest.motivation}
                  </Typography>
                </Grid>

                {selectedRequest.specialties && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Domaines d'expertise
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {selectedRequest.specialties}
                    </Typography>
                  </Grid>
                )}

                {selectedRequest.experience && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Expérience professionnelle
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {selectedRequest.experience}
                    </Typography>
                  </Grid>
                )}

                {selectedRequest.certifications && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Certifications et diplômes
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {selectedRequest.certifications}
                    </Typography>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Divider />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Profil public proposé
                  </Typography>
                </Grid>

                {selectedRequest.proposed_display_name && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Nom d'affichage
                    </Typography>
                    <Typography variant="body1">
                      {selectedRequest.proposed_display_name}
                    </Typography>
                  </Grid>
                )}

                {selectedRequest.proposed_title && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Titre professionnel
                    </Typography>
                    <Typography variant="body1">
                      {selectedRequest.proposed_title}
                    </Typography>
                  </Grid>
                )}

                {selectedRequest.proposed_summary && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Résumé
                    </Typography>
                    <Typography variant="body1">
                      {selectedRequest.proposed_summary}
                    </Typography>
                  </Grid>
                )}

                {selectedRequest.proposed_bio && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Biographie
                    </Typography>
                    <Typography variant="body1">
                      {selectedRequest.proposed_bio}
                    </Typography>
                  </Grid>
                )}

                {selectedRequest.admin_notes && (
                  <>
                    <Grid item xs={12}>
                      <Divider />
                    </Grid>
                    <Grid item xs={12}>
                      <Alert severity="info">
                        <Typography variant="subtitle2" gutterBottom>
                          Notes de l'administrateur
                        </Typography>
                        <Typography variant="body2">
                          {selectedRequest.admin_notes}
                        </Typography>
                        {selectedRequest.reviewer && (
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            Par {selectedRequest.reviewer.first_name} {selectedRequest.reviewer.last_name}
                            {selectedRequest.reviewed_at && ` le ${format(new Date(selectedRequest.reviewed_at), 'dd MMMM yyyy', { locale: fr })}`}
                          </Typography>
                        )}
                      </Alert>
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          {selectedRequest?.status === 'pending' && (
            <>
              <Button
                variant="contained"
                color="error"
                onClick={() => {
                  setDetailsOpen(false);
                  handleOpenActionDialog(selectedRequest, 'reject');
                }}
                startIcon={<CancelIcon />}
              >
                Rejeter
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={() => {
                  setDetailsOpen(false);
                  handleOpenActionDialog(selectedRequest, 'approve');
                }}
                startIcon={<CheckCircleIcon />}
              >
                Approuver
              </Button>
            </>
          )}
          <Button onClick={() => setDetailsOpen(false)}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog d'action (approuver/rejeter) */}
      <Dialog
        open={actionDialogOpen}
        onClose={() => !actionLoading && setActionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {actionType === 'approve' ? 'Approuver la demande' : 'Rejeter la demande'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            {actionType === 'approve'
              ? 'Cette action va créer automatiquement un compte intervenant pour cet utilisateur.'
              : 'L\'utilisateur sera notifié du rejet de sa demande.'}
          </Typography>
          <TextField
            label="Notes (optionnel)"
            multiline
            rows={4}
            fullWidth
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Ajoutez une note pour l'utilisateur..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)} disabled={actionLoading}>
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleAction}
            disabled={actionLoading}
            color={actionType === 'approve' ? 'success' : 'error'}
            startIcon={actionLoading ? <CircularProgress size={20} /> : actionType === 'approve' ? <CheckCircleIcon /> : <CancelIcon />}
          >
            {actionLoading ? 'Traitement...' : actionType === 'approve' ? 'Approuver' : 'Rejeter'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminPractitionerRequestsPage;
