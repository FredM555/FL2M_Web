import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  IconButton,
  Stack
} from '@mui/material';
import { Save as SaveIcon, Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { Practitioner } from '../../services/supabase';

interface PractitionerProfileFormProps {
  practitioner: Practitioner;
  onSave: (updates: {
    bio?: string;
    display_name?: string;
    title?: string;
    summary?: string;
    expertise_domains?: string[];
    qualifications?: string[];
  }) => Promise<void>;
  loading?: boolean;
}

export const PractitionerProfileForm: React.FC<PractitionerProfileFormProps> = ({
  practitioner,
  onSave,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    display_name: practitioner.display_name || '',
    title: practitioner.title || '',
    summary: practitioner.summary || '',
    bio: practitioner.bio || '',
    expertise_domains: practitioner.expertise_domains || [],
    qualifications: practitioner.qualifications || []
  });

  const [newExpertise, setNewExpertise] = useState('');
  const [newQualification, setNewQualification] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (field: keyof typeof formData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await onSave(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError(err.message || 'Une erreur est survenue lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    return (
      formData.display_name !== (practitioner.display_name || '') ||
      formData.title !== (practitioner.title || '') ||
      formData.summary !== (practitioner.summary || '') ||
      formData.bio !== (practitioner.bio || '') ||
      JSON.stringify(formData.expertise_domains) !== JSON.stringify(practitioner.expertise_domains || []) ||
      JSON.stringify(formData.qualifications) !== JSON.stringify(practitioner.qualifications || [])
    );
  };

  const handleAddExpertise = () => {
    if (newExpertise.trim() && formData.expertise_domains.length < 5) {
      setFormData(prev => ({
        ...prev,
        expertise_domains: [...prev.expertise_domains, newExpertise.trim()]
      }));
      setNewExpertise('');
      setError(null);
      setSuccess(false);
    } else if (formData.expertise_domains.length >= 5) {
      setError('Vous ne pouvez ajouter que 5 domaines d\'expertise maximum');
    }
  };

  const handleRemoveExpertise = (index: number) => {
    setFormData(prev => ({
      ...prev,
      expertise_domains: prev.expertise_domains.filter((_, i) => i !== index)
    }));
    setError(null);
    setSuccess(false);
  };

  const handleEditExpertise = (index: number) => {
    const domainToEdit = formData.expertise_domains[index];
    setNewExpertise(domainToEdit);
    handleRemoveExpertise(index);
  };

  const handleAddQualification = () => {
    if (newQualification.trim() && formData.qualifications.length < 3) {
      setFormData(prev => ({
        ...prev,
        qualifications: [...prev.qualifications, newQualification.trim()]
      }));
      setNewQualification('');
      setError(null);
      setSuccess(false);
    } else if (formData.qualifications.length >= 3) {
      setError('Vous ne pouvez ajouter que 3 formations/diplômes maximum');
    }
  };

  const handleRemoveQualification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, i) => i !== index)
    }));
    setError(null);
    setSuccess(false);
  };

  const handleEditQualification = (index: number) => {
    const qualificationToEdit = formData.qualifications[index];
    setNewQualification(qualificationToEdit);
    handleRemoveQualification(index);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Informations Publiques
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ces informations seront visibles par vos clients
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Votre profil a été mis à jour avec succès !
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Nom d'affichage"
                fullWidth
                value={formData.display_name}
                onChange={handleChange('display_name')}
                helperText="Le nom qui sera affiché aux clients"
                disabled={loading || saving}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Titre / Fonction"
                fullWidth
                value={formData.title}
                onChange={handleChange('title')}
                helperText="Ex: Psychothérapeute, Coach sportif..."
                disabled={loading || saving}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Résumé / Pitch"
                fullWidth
                multiline
                rows={3}
                value={formData.summary}
                onChange={handleChange('summary')}
                helperText="Un résumé de votre expertise"
                disabled={loading || saving}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Biographie complète"
                fullWidth
                multiline
                rows={8}
                value={formData.bio}
                onChange={handleChange('bio')}
                helperText="Présentez votre parcours, vos qualifications, votre approche..."
                disabled={loading || saving}
              />
            </Grid>

            {/* Domaines d'expertise */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Domaines d'expertise (max. 5)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Ajoutez vos domaines d'expertise principaux
              </Typography>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ mb: 2 }}
              >
                <TextField
                  size="small"
                  fullWidth
                  value={newExpertise}
                  onChange={(e) => setNewExpertise(e.target.value)}
                  placeholder="Ex: Thérapie cognitive et comportementale"
                  disabled={loading || saving || formData.expertise_domains.length >= 5}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddExpertise();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleAddExpertise}
                  disabled={!newExpertise.trim() || loading || saving || formData.expertise_domains.length >= 5}
                  startIcon={<AddIcon />}
                  sx={{
                    minWidth: { xs: '100%', sm: '120px' },
                    background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                    color: '#1a1a2e',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #FFA500, #FFD700)',
                    }
                  }}
                >
                  Ajouter
                </Button>
              </Stack>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {formData.expertise_domains.map((domain, index) => (
                  <Chip
                    key={index}
                    label={domain}
                    onDelete={() => handleRemoveExpertise(index)}
                    deleteIcon={<DeleteIcon />}
                    icon={
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditExpertise(index);
                        }}
                        disabled={loading || saving}
                        sx={{
                          padding: 0,
                          width: 20,
                          height: 20,
                          '&:hover': {
                            backgroundColor: 'transparent',
                          }
                        }}
                      >
                        <EditIcon sx={{ fontSize: 16, color: '#FFA500' }} />
                      </IconButton>
                    }
                    sx={{
                      background: 'rgba(255, 215, 0, 0.1)',
                      border: '1px solid rgba(255, 165, 0, 0.3)',
                      color: '#1a1a2e',
                      pl: 1,
                      '& .MuiChip-icon': {
                        marginLeft: 0,
                        marginRight: '4px',
                      },
                      '& .MuiChip-deleteIcon': {
                        color: '#FFA500',
                        '&:hover': {
                          color: '#FF8C00',
                        }
                      }
                    }}
                    disabled={loading || saving}
                  />
                ))}
              </Box>
            </Grid>

            {/* Formations/Diplômes */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Formations / Diplômes (max. 3)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Ajoutez vos principales formations et diplômes
              </Typography>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ mb: 2 }}
              >
                <TextField
                  size="small"
                  fullWidth
                  value={newQualification}
                  onChange={(e) => setNewQualification(e.target.value)}
                  placeholder="Ex: Master en Psychologie Clinique, Université Paris-Sorbonne"
                  disabled={loading || saving || formData.qualifications.length >= 3}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddQualification();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleAddQualification}
                  disabled={!newQualification.trim() || loading || saving || formData.qualifications.length >= 3}
                  startIcon={<AddIcon />}
                  sx={{
                    minWidth: { xs: '100%', sm: '120px' },
                    background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                    color: '#1a1a2e',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #FFA500, #FFD700)',
                    }
                  }}
                >
                  Ajouter
                </Button>
              </Stack>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {formData.qualifications.map((qualification, index) => (
                  <Chip
                    key={index}
                    label={qualification}
                    onDelete={() => handleRemoveQualification(index)}
                    deleteIcon={<DeleteIcon />}
                    icon={
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditQualification(index);
                        }}
                        disabled={loading || saving}
                        sx={{
                          padding: 0,
                          width: 20,
                          height: 20,
                          '&:hover': {
                            backgroundColor: 'transparent',
                          }
                        }}
                      >
                        <EditIcon sx={{ fontSize: 16, color: '#FFA500' }} />
                      </IconButton>
                    }
                    sx={{
                      background: 'rgba(255, 215, 0, 0.1)',
                      border: '1px solid rgba(255, 165, 0, 0.3)',
                      color: '#1a1a2e',
                      pl: 1,
                      '& .MuiChip-icon': {
                        marginLeft: 0,
                        marginRight: '4px',
                      },
                      '& .MuiChip-deleteIcon': {
                        color: '#FFA500',
                        '&:hover': {
                          color: '#FF8C00',
                        }
                      }
                    }}
                    disabled={loading || saving}
                  />
                ))}
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              type="button"
              variant="outlined"
              disabled={!hasChanges() || loading || saving}
              onClick={() => {
                setFormData({
                  display_name: practitioner.display_name || '',
                  title: practitioner.title || '',
                  summary: practitioner.summary || '',
                  bio: practitioner.bio || '',
                  expertise_domains: practitioner.expertise_domains || [],
                  qualifications: practitioner.qualifications || []
                });
                setNewExpertise('');
                setNewQualification('');
                setError(null);
                setSuccess(false);
              }}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              disabled={!hasChanges() || loading || saving}
            >
              {saving ? 'Sauvegarde...' : 'Enregistrer'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Informations non modifiables */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Informations du Compte
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ces informations ne peuvent pas être modifiées ici
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Nom"
                fullWidth
                value={practitioner.profile?.last_name || ''}
                disabled
                helperText="Modifiable dans les paramètres du compte"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Prénom"
                fullWidth
                value={practitioner.profile?.first_name || ''}
                disabled
                helperText="Modifiable dans les paramètres du compte"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                fullWidth
                value={practitioner.profile?.email || ''}
                disabled
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Statut"
                fullWidth
                value={practitioner.is_active ? 'Actif' : 'Inactif'}
                disabled
                helperText="Géré par les administrateurs"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </form>
  );
};

export default PractitionerProfileForm;
