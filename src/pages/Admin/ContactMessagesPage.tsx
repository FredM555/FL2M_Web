// src/pages/admin/ContactMessagesPage.tsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableRow, 
  TableContainer, 
  TablePagination,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  Tab,
  Tabs,
  CircularProgress,
  Alert
} from '@mui/material';
import { supabase } from '../../services/supabase';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';

// Interface pour les messages
interface ContactMessage {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'new' | 'processing' | 'responded';
  created_at: string;
  updated_at: string;
  assigned_to_email?: string;
  response?: string;
  responded_at?: string;
}

const AdminContactMessagesPage: React.FC = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabValue, setTabValue] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [responseText, setResponseText] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Chargement des messages
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let query = supabase
          .from('contact_messages')
          .select('*')
          .order('created_at', { ascending: false });
        
        // Filtrer selon l'onglet sélectionné
        if (tabValue === 0) {
          query = query.eq('status', 'new');
        } else if (tabValue === 1) {
          query = query.eq('status', 'processing');
        } else if (tabValue === 2) {
          query = query.eq('status', 'responded');
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        setMessages(data || []);
      } catch (err: any) {
        console.error('Erreur lors du chargement des messages:', err);
        setError(err.message || 'Une erreur est survenue lors du chargement des messages');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMessages();
  }, [tabValue, refreshTrigger]);
  
  // Gestion du changement d'onglet
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(0); // Réinitialiser la pagination lors du changement d'onglet
  };

  // Pagination
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Afficher les détails d'un message
  const handleViewMessage = (message: ContactMessage) => {
    setSelectedMessage(message);
    setViewDialogOpen(true);
  };
  
  // Ouvrir le dialogue de réponse
  const handleOpenResponseDialog = (message: ContactMessage) => {
    setSelectedMessage(message);
    setResponseText(message.response || '');
    setResponseDialogOpen(true);
  };
  
  // Mettre à jour le statut d'un message
  const handleUpdateStatus = async (messageId: string, newStatus: 'new' | 'processing' | 'responded') => {
    try {
      const updateData: { status: string; assigned_to_email?: string } = { status: newStatus };
      
      // Si passé à 'processing', assigner à l'utilisateur actuel
      if (newStatus === 'processing') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          updateData.assigned_to_email = user.email;
        }
      }
      
      const { error } = await supabase
        .from('contact_messages')
        .update(updateData)
        .eq('id', messageId);
      
      if (error) throw error;
      
      // Rafraîchir la liste
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du statut:', err);
      setError(err.message || 'Une erreur est survenue lors de la mise à jour du statut');
    }
  };
  
  // Envoyer une réponse
  const handleSendResponse = async () => {
    if (!selectedMessage) return;
    
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({
          status: 'responded',
          response: responseText,
          responded_at: new Date().toISOString()
        })
        .eq('id', selectedMessage.id);
      
      if (error) throw error;
      
      // Dans un système complet, envoyer réellement l'email ici via une fonction Edge Supabase
      console.log('Email envoyé à:', selectedMessage.email, 'avec la réponse:', responseText);
      
      // Fermer le dialogue et rafraîchir la liste
      setResponseDialogOpen(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      console.error('Erreur lors de l\'envoi de la réponse:', err);
      setError(err.message || 'Une erreur est survenue lors de l\'envoi de la réponse');
    }
  };
  
  // Supprimer un message
  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) return;
    
    try {
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', messageId);
      
      if (error) throw error;
      
      // Rafraîchir la liste
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      console.error('Erreur lors de la suppression du message:', err);
      setError(err.message || 'Une erreur est survenue lors de la suppression du message');
    }
  };
  
  // Obtenir la couleur de statut
  const getStatusChipProps = (status: string) => {
    switch (status) {
      case 'new':
        return {
          label: 'Nouveau',
          color: 'info' as const,
          icon: <EmailIcon fontSize="small" />
        };
      case 'processing':
        return {
          label: 'En traitement',
          color: 'warning' as const,
          icon: <HourglassEmptyIcon fontSize="small" />
        };
      case 'responded':
        return {
          label: 'Répondu',
          color: 'success' as const,
          icon: <CheckCircleIcon fontSize="small" />
        };
      default:
        return {
          label: status,
          color: 'default' as const,
          icon: null
        };
    }
  };
  
  // Fonction pour tronquer le texte
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };
  
  // Messages paginés
  const paginatedMessages = messages.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  
  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Messages de contact
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gérez les messages reçus via le formulaire de contact de FL²M Services.
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Card sx={{ mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <EmailIcon sx={{ mr: 1 }} />
                Nouveaux
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <HourglassEmptyIcon sx={{ mr: 1 }} />
                En cours
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon sx={{ mr: 1 }} />
                Répondus
              </Box>
            } 
          />
        </Tabs>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            disabled={loading}
          >
            Actualiser
          </Button>
        </Box>
        
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : messages.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Aucun message{' '}
                {tabValue === 0 ? 'nouveau' : tabValue === 1 ? 'en cours' : 'répondu'} pour le moment.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto' }}>
              <Table sx={{ minWidth: { xs: 650, sm: 750 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Expéditeur</TableCell>
                    <TableCell>Sujet</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Message</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Date</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedMessages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" fontWeight="bold">
                            {message.first_name} {message.last_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {message.email}
                          </Typography>
                          {message.phone && (
                            <Typography variant="body2" color="text.secondary">
                              {message.phone}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {message.subject}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Typography variant="body2">
                          {truncateText(message.message, 50)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        <Typography variant="body2">
                          {format(parseISO(message.created_at), 'PPp', { locale: fr })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusChipProps(message.status).label}
                          color={getStatusChipProps(message.status).color}
                          size="small"
                          icon={getStatusChipProps(message.status).icon || undefined}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Tooltip title="Voir le détail">
                            <IconButton
                              size="small"
                              onClick={() => handleViewMessage(message)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          {message.status === 'new' && (
                            <Tooltip title="Prendre en charge">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => handleUpdateStatus(message.id, 'processing')}
                              >
                                <HourglassEmptyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          
                          {(message.status === 'new' || message.status === 'processing') && (
                            <Tooltip title="Répondre">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleOpenResponseDialog(message)}
                              >
                                <MarkEmailReadIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          
                          <Tooltip title="Supprimer">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteMessage(message.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={messages.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Lignes par page:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
              />
            </TableContainer>
          )}
        </CardContent>
      </Card>
      
      {/* Dialogue pour voir les détails d'un message */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedMessage && (
          <>
            <DialogTitle>
              Détails du message
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="subtitle1" fontWeight="bold">
                      {selectedMessage.first_name} {selectedMessage.last_name}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <EmailIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body1">
                      {selectedMessage.email}
                    </Typography>
                  </Box>
                  
                  {selectedMessage.phone && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <PhoneIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="body1">
                        {selectedMessage.phone}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Date de réception:
                    </Typography>
                    <Typography variant="body1">
                      {format(parseISO(selectedMessage.created_at), 'PPPp', { locale: fr })}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Statut:
                    </Typography>
                    <Chip
                      label={getStatusChipProps(selectedMessage.status).label}
                      color={getStatusChipProps(selectedMessage.status).color}
                      icon={getStatusChipProps(selectedMessage.status).icon || undefined}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Sujet:
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedMessage.subject}
                  </Typography>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Message:
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, mb: 2, maxHeight: '200px', overflow: 'auto' }}>
                    <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                      {selectedMessage.message}
                    </Typography>
                  </Paper>
                  
                  {selectedMessage.response && (
                    <>
                      <Typography variant="subtitle2" gutterBottom>
                        Réponse:
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover', mb: 2 }}>
                        <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                          {selectedMessage.response}
                        </Typography>
                      </Paper>
                      
                      {selectedMessage.responded_at && (
                        <Typography variant="caption" color="text.secondary">
                          Répondu le {format(parseISO(selectedMessage.responded_at), 'PPPp', { locale: fr })}
                        </Typography>
                      )}
                    </>
                  )}
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              {selectedMessage.status === 'new' && (
                <Button 
                  onClick={() => {
                    handleUpdateStatus(selectedMessage.id, 'processing');
                    setViewDialogOpen(false);
                  }}
                  color="warning"
                >
                  Prendre en charge
                </Button>
              )}
              
              {(selectedMessage.status === 'new' || selectedMessage.status === 'processing') && (
                <Button 
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleOpenResponseDialog(selectedMessage);
                  }}
                  color="primary"
                >
                  Répondre
                </Button>
              )}
              
              <Button onClick={() => setViewDialogOpen(false)}>
                Fermer
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      
      {/* Dialogue pour répondre à un message */}
      <Dialog
        open={responseDialogOpen}
        onClose={() => setResponseDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedMessage && (
          <>
            <DialogTitle>
              Répondre au message
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  De: {selectedMessage.first_name} {selectedMessage.last_name} ({selectedMessage.email})
                </Typography>
                <Typography variant="subtitle2" gutterBottom>
                  Sujet: {selectedMessage.subject}
                </Typography>
                <Typography variant="subtitle2" gutterBottom>
                  Message original:
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.100' }}>
                  <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedMessage.message}
                  </Typography>
                </Paper>
              </Box>
              
              <Typography variant="subtitle1" gutterBottom>
                Votre réponse:
              </Typography>
              <TextField
                multiline
                rows={8}
                fullWidth
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Rédigez votre réponse ici..."
                variant="outlined"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setResponseDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleSendResponse}
                variant="contained" 
                color="primary"
                disabled={!responseText.trim()}
              >
                Envoyer la réponse
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default AdminContactMessagesPage;