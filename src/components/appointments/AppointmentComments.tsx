import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Card,
  CardContent,
  TextField,
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  Avatar,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Send as SendIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  ReportProblem as ReportProblemIcon
} from '@mui/icons-material';
import {
  AppointmentComment,
  getAppointmentComments,
  createAppointmentComment,
  updateAppointmentComment,
  deleteAppointmentComment,
  supabase
} from '../../services/supabase';
import { validateAppointment, sendContestationEmail } from '../../services/stripe';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AppointmentCommentsProps {
  appointmentId: string;
  practitionerId: string;
  appointmentStatus?: string;
  clientId?: string;
  onProblemReported?: () => void;
}

export const AppointmentComments: React.FC<AppointmentCommentsProps> = ({
  appointmentId,
  practitionerId,
  appointmentStatus,
  clientId,
  onProblemReported
}) => {
  const { profile } = useAuth();
  const [comments, setComments] = useState<AppointmentComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New comment form
  const [newComment, setNewComment] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingComment, setEditingComment] = useState<AppointmentComment | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editIsPrivate, setEditIsPrivate] = useState(false);

  // Report problem state
  const [showProblemDialog, setShowProblemDialog] = useState(false);
  const [problemDescription, setProblemDescription] = useState('');
  const [reportingProblem, setReportingProblem] = useState(false);

  const isConsultant = profile?.user_type === 'intervenant' || profile?.user_type === 'admin';
  // L'utilisateur peut contester s'il est le CLIENT de ce RDV spécifique ET que le status est completed (pas issue_reported)
  const isClientOfThisAppointment = clientId && profile?.id === clientId;
  const canReportProblem = appointmentStatus === 'completed' && isClientOfThisAppointment;

  useEffect(() => {
    loadComments();
  }, [appointmentId]);

  const loadComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await getAppointmentComments(appointmentId);
      if (error) throw error;
      setComments(data || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement des commentaires:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      setError('Le commentaire ne peut pas être vide');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error } = await createAppointmentComment(
        appointmentId,
        newComment,
        isPrivate
      );

      if (error) throw error;

      // Recharger les commentaires
      await loadComments();

      // Réinitialiser le formulaire
      setNewComment('');
      setIsPrivate(false);
    } catch (err: any) {
      console.error('Erreur lors de l\'ajout du commentaire:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = (comment: AppointmentComment) => {
    setEditingComment(comment);
    setEditContent(comment.content);
    setEditIsPrivate(comment.is_private);
    setEditDialogOpen(true);
  };

  const handleUpdateComment = async () => {
    if (!editingComment) return;

    if (!editContent.trim()) {
      setError('Le commentaire ne peut pas être vide');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error } = await updateAppointmentComment(
        editingComment.id,
        editContent,
        editIsPrivate
      );

      if (error) throw error;

      await loadComments();
      setEditDialogOpen(false);
      setEditingComment(null);
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) {
      return;
    }

    try {
      const { error } = await deleteAppointmentComment(commentId);
      if (error) throw error;
      await loadComments();
    } catch (err: any) {
      console.error('Erreur lors de la suppression:', err);
      setError(err.message);
    }
  };

  const handleReportProblem = async () => {
    if (!problemDescription.trim()) {
      setError('Veuillez décrire le problème');
      return;
    }

    setReportingProblem(true);
    setError(null);

    try {
      // Créer un commentaire visible pour tracer le problème signalé
      await createAppointmentComment(
        appointmentId,
        `⚠️ PROBLÈME SIGNALÉ ⚠️\n\n${problemDescription}`,
        false // Public pour que l'intervenant puisse le voir
      );

      // Signaler le problème (change le status vers issue_reported)
      await validateAppointment(appointmentId, false, problemDescription);

      // Envoyer l'email de notification à l'admin (ne pas bloquer si ça échoue)
      sendContestationEmail(appointmentId, problemDescription);

      // Recharger les commentaires pour afficher le nouveau
      await loadComments();

      setShowProblemDialog(false);
      setProblemDescription('');

      if (onProblemReported) {
        onProblemReported();
      }

      // Message de confirmation
      setError(null);
      alert('Problème signalé avec succès. Notre équipe va examiner votre demande et a été notifiée par email.');
    } catch (err: any) {
      console.error('Erreur lors du signalement:', err);
      setError(err.message || 'Erreur lors du signalement du problème');
    } finally {
      setReportingProblem(false);
    }
  };

  const canEditComment = (comment: AppointmentComment) => {
    if (!profile) return false;
    return comment.author_id === profile.id;
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase();
  };

  const filteredComments = comments.filter(comment => {
    // Admins et consultants voient tout
    if (profile?.user_type === 'admin' || profile?.user_type === 'intervenant') {
      return true;
    }
    // Clients ne voient que les commentaires publics
    return !comment.is_private;
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Commentaires et notes
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* New Comment Form */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            label={isConsultant && isPrivate ? 'Note privée' : 'Nouveau commentaire'}
            multiline
            rows={3}
            fullWidth
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={
              isConsultant
                ? 'Ajouter un commentaire ou une note privée...'
                : 'Ajouter un commentaire...'
            }
          />

          <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
            <Box>
              {isConsultant && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      icon={<LockOpenIcon />}
                      checkedIcon={<LockIcon />}
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2">
                        Note privée (uniquement pour vous)
                      </Typography>
                    </Box>
                  }
                />
              )}
            </Box>

            <Button
              variant="contained"
              endIcon={<SendIcon />}
              onClick={handleSubmitComment}
              disabled={submitting || !newComment.trim()}
            >
              {submitting ? 'Envoi...' : 'Envoyer'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Comments List */}
      {filteredComments.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
          Aucun commentaire pour le moment
        </Typography>
      ) : (
        <List>
          {filteredComments.map((comment) => {
            const isProblemReport = comment.content.startsWith('⚠️ PROBLÈME SIGNALÉ ⚠️');

            return (
              <Card
                key={comment.id}
                sx={{
                  mb: 2,
                  ...(isProblemReport && {
                    border: '2px solid',
                    borderColor: 'error.main',
                    bgcolor: 'rgba(211, 47, 47, 0.05)'
                  })
                }}
              >
                <CardContent>
                  <Box display="flex" gap={2}>
                    <Avatar sx={{
                      bgcolor: isProblemReport ? 'error.main' : (comment.is_private ? 'warning.main' : 'primary.main')
                    }}>
                      {isProblemReport ? <ReportProblemIcon /> : getInitials(comment.author?.first_name, comment.author?.last_name)}
                    </Avatar>

                    <Box flex={1}>
                      <Box display="flex" justifyContent="space-between" alignItems="start">
                        <Box>
                          <Typography variant="subtitle2">
                            {comment.author?.first_name} {comment.author?.last_name}
                            {comment.author?.pseudo && (
                              <Typography component="span" variant="body2" color="text.secondary">
                                {' '}({comment.author.pseudo})
                              </Typography>
                            )}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(comment.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                          </Typography>
                        </Box>

                        <Box display="flex" gap={1} alignItems="center">
                          {isProblemReport && (
                            <Chip
                              icon={<ReportProblemIcon />}
                              label="Problème signalé"
                              size="small"
                              color="error"
                            />
                          )}

                          {comment.is_private && (
                            <Tooltip title="Note privée - Visible uniquement par le consultant">
                              <Chip
                                icon={<LockIcon />}
                                label="Privé"
                                size="small"
                                color="warning"
                              />
                            </Tooltip>
                          )}

                          {canEditComment(comment) && !isProblemReport && (
                            <>
                              <Tooltip title="Modifier">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditComment(comment)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Supprimer">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteComment(comment.id)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
                      </Box>

                      <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                        {comment.content}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </List>
      )}

      {/* Bouton pour contester le RDV - uniquement pour les RDV "à valider" et une seule fois */}
      {canReportProblem && (
        <Box sx={{ mt: 4, pt: 3, borderTop: '1px dashed', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, textAlign: 'center' }}>
            Un problème avec ce rendez-vous ?
          </Typography>
          <Box sx={{ textAlign: 'center' }}>
            <Button
              size="small"
              variant="text"
              color="error"
              startIcon={<ReportProblemIcon fontSize="small" />}
              onClick={() => setShowProblemDialog(true)}
              sx={{
                textTransform: 'none',
                fontSize: '0.813rem',
                opacity: 0.7,
                '&:hover': {
                  opacity: 1,
                  backgroundColor: 'rgba(211, 47, 47, 0.04)'
                }
              }}
            >
              Contester le RDV
            </Button>
          </Box>
        </Box>
      )}

      {/* Report Problem Dialog */}
      <Dialog open={showProblemDialog} onClose={() => setShowProblemDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Contester le rendez-vous</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Le problème sera signalé à l'équipe FL2M Services. Le paiement de l'intervenant sera bloqué jusqu'à résolution.
            </Typography>
          </Alert>

          <TextField
            label="Décrivez le problème *"
            multiline
            rows={4}
            fullWidth
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            placeholder="Expliquez précisément ce qui s'est passé..."
            required
            sx={{ mt: 2 }}
            helperText="Ce commentaire est obligatoire"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowProblemDialog(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleReportProblem}
            variant="contained"
            color="error"
            disabled={reportingProblem || !problemDescription.trim()}
            startIcon={reportingProblem ? <CircularProgress size={20} /> : undefined}
          >
            {reportingProblem ? 'Envoi en cours...' : 'Contester'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Modifier le commentaire</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              label="Commentaire"
              multiline
              rows={4}
              fullWidth
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
            />

            {isConsultant && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editIsPrivate}
                    onChange={(e) => setEditIsPrivate(e.target.checked)}
                    icon={<LockOpenIcon />}
                    checkedIcon={<LockIcon />}
                  />
                }
                label="Note privée (uniquement pour vous)"
                sx={{ mt: 2 }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleUpdateComment}
            variant="contained"
            disabled={submitting || !editContent.trim()}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
