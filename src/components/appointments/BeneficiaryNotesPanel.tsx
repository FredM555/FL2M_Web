// src/components/appointments/BeneficiaryNotesPanel.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Chip
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import {
  getBeneficiaryNotes,
  createBeneficiaryNote,
  updateBeneficiaryNote,
  deleteBeneficiaryNote
} from '../../services/beneficiaries';
import type { BeneficiaryNote, BeneficiaryNoteType } from '../../types/beneficiary';
import { logger } from '../../utils/logger';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BeneficiaryNotesPanelProps {
  beneficiaryId: string;
  practitionerId: string;
}

export const BeneficiaryNotesPanel: React.FC<BeneficiaryNotesPanelProps> = ({
  beneficiaryId,
  practitionerId
}) => {
  const [notes, setNotes] = useState<BeneficiaryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState<BeneficiaryNoteType>('practitioner');
  const [isCreating, setIsCreating] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState<BeneficiaryNoteType>('practitioner');

  useEffect(() => {
    loadNotes();
  }, [beneficiaryId]);

  const loadNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: loadError } = await getBeneficiaryNotes(beneficiaryId, practitionerId);
      if (loadError) throw loadError;

      setNotes(data || []);
    } catch (err: any) {
      logger.error('Erreur lors du chargement des notes:', err);
      setError(err.message || 'Erreur lors du chargement des notes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;

    setIsCreating(true);
    setError(null);
    try {
      const { data, error: createError } = await createBeneficiaryNote({
        beneficiary_id: beneficiaryId,
        note_type: newNoteType,
        content: newNoteContent.trim(),
        practitioner_id: practitionerId
      });

      if (createError) throw createError;

      // Ajouter la nouvelle note à la liste
      if (data) {
        setNotes(prev => [data, ...prev]);
      }

      // Réinitialiser le formulaire
      setNewNoteContent('');
      setNewNoteType('practitioner');
    } catch (err: any) {
      logger.error('Erreur lors de la création de la note:', err);
      setError(err.message || 'Erreur lors de la création de la note');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (note: BeneficiaryNote) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
    setEditType(note.note_type);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (noteId: string) => {
    setError(null);
    try {
      const { data, error: updateError } = await updateBeneficiaryNote(noteId, {
        content: editContent.trim(),
        note_type: editType
      });

      if (updateError) throw updateError;

      // Mettre à jour la note dans la liste
      if (data) {
        setNotes(prev => prev.map(n => n.id === noteId ? data : n));
      }

      setEditingNoteId(null);
    } catch (err: any) {
      logger.error('Erreur lors de la mise à jour de la note:', err);
      setError(err.message || 'Erreur lors de la mise à jour de la note');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette note ?')) return;

    setError(null);
    try {
      const { success, error: deleteError } = await deleteBeneficiaryNote(noteId);

      if (deleteError || !success) {
        throw deleteError || new Error('Erreur lors de la suppression');
      }

      // Retirer la note de la liste
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err: any) {
      logger.error('Erreur lors de la suppression de la note:', err);
      setError(err.message || 'Erreur lors de la suppression de la note');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Formulaire de création */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
          Ajouter une note
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          value={newNoteContent}
          onChange={(e) => setNewNoteContent(e.target.value)}
          placeholder="Écrivez votre note ici..."
          disabled={isCreating}
          sx={{ mb: 2, bgcolor: 'white' }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <ToggleButtonGroup
            value={newNoteType}
            exclusive
            onChange={(e, value) => value && setNewNoteType(value)}
            size="small"
          >
            <ToggleButton value="practitioner">
              <LockIcon sx={{ mr: 0.5, fontSize: 18 }} />
              Privée
            </ToggleButton>
            <ToggleButton value="shared">
              <GroupIcon sx={{ mr: 0.5, fontSize: 18 }} />
              Partagée
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            startIcon={isCreating ? <CircularProgress size={20} /> : <SaveIcon />}
            onClick={handleCreateNote}
            disabled={isCreating || !newNoteContent.trim()}
            sx={{
              background: 'linear-gradient(45deg, #345995, #1D3461)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1D3461, #345995)',
              },
            }}
          >
            {isCreating ? 'Enregistrement...' : 'Ajouter'}
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Les notes privées sont visibles uniquement par vous. Les notes partagées sont visibles par tous les intervenants (mais pas par le client).
        </Typography>
      </Box>

      {/* Liste des notes */}
      {notes.length === 0 ? (
        <Alert severity="info">
          Aucune note pour ce bénéficiaire.
        </Alert>
      ) : (
        <Box>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Notes existantes ({notes.length})
          </Typography>
          {notes.map((note) => {
            const isEditing = editingNoteId === note.id;

            // Déterminer le nom de l'auteur et le type de note
            let authorName = 'Auteur';
            if (note.note_type === 'user') {
              authorName = note.user?.first_name || note.user?.last_name
                ? `${note.user?.first_name || ''} ${note.user?.last_name || ''}`.trim()
                : note.user?.email || 'Client';
            } else {
              authorName = note.practitioner?.display_name ||
                          note.practitioner?.profile?.pseudo ||
                          `${note.practitioner?.profile?.first_name || ''} ${note.practitioner?.profile?.last_name || ''}`.trim() ||
                          'Intervenant';
            }

            // Icône et label selon le type de note
            const noteTypeConfig = {
              user: { icon: <PersonIcon />, label: 'Client', color: 'info' as const },
              practitioner: { icon: <LockIcon />, label: 'Privée', color: 'default' as const },
              shared: { icon: <GroupIcon />, label: 'Partagée', color: 'success' as const }
            };
            const typeConfig = noteTypeConfig[note.note_type];

            return (
              <Card key={note.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        icon={typeConfig.icon}
                        label={typeConfig.label}
                        size="small"
                        color={typeConfig.color}
                      />
                      <Chip
                        label={authorName}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {format(parseISO(note.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                    </Typography>
                  </Box>

                  {isEditing ? (
                    <Box>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        sx={{ mb: 1 }}
                      />
                      <ToggleButtonGroup
                        value={editType}
                        exclusive
                        onChange={(e, value) => value && setEditType(value)}
                        size="small"
                      >
                        <ToggleButton value="practitioner">
                          <LockIcon sx={{ mr: 0.5, fontSize: 18 }} />
                          Privée
                        </ToggleButton>
                        <ToggleButton value="shared">
                          <GroupIcon sx={{ mr: 0.5, fontSize: 18 }} />
                          Partagée
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {note.content}
                    </Typography>
                  )}

                  {note.updated_at !== note.created_at && !isEditing && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
                      Modifiée le {format(parseISO(note.updated_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                    </Typography>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end' }}>
                  {isEditing ? (
                    <>
                      <Button
                        size="small"
                        startIcon={<CancelIcon />}
                        onClick={handleCancelEdit}
                      >
                        Annuler
                      </Button>
                      <Button
                        size="small"
                        startIcon={<SaveIcon />}
                        onClick={() => handleSaveEdit(note.id)}
                        variant="contained"
                        disabled={!editContent.trim()}
                      >
                        Enregistrer
                      </Button>
                    </>
                  ) : (
                    <>
                      <IconButton size="small" onClick={() => handleStartEdit(note)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteNote(note.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </CardActions>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
};
