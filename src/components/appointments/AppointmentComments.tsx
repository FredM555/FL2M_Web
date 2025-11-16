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
  Tooltip
} from '@mui/material';
import {
  Send as SendIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon
} from '@mui/icons-material';
import {
  AppointmentComment,
  getAppointmentComments,
  createAppointmentComment,
  updateAppointmentComment,
  deleteAppointmentComment
} from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AppointmentCommentsProps {
  appointmentId: string;
  practitionerId: string;
}

export const AppointmentComments: React.FC<AppointmentCommentsProps> = ({
  appointmentId,
  practitionerId
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

  const isConsultant = profile?.user_type === 'intervenant' || profile?.user_type === 'admin';

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
          {filteredComments.map((comment) => (
            <Card key={comment.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" gap={2}>
                  <Avatar sx={{ bgcolor: comment.is_private ? 'warning.main' : 'primary.main' }}>
                    {getInitials(comment.author?.first_name, comment.author?.last_name)}
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

                        {canEditComment(comment) && (
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
          ))}
        </List>
      )}

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
