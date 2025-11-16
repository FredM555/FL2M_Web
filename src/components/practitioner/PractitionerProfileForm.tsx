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
  Grid
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { Practitioner } from '../../services/supabase';

interface PractitionerProfileFormProps {
  practitioner: Practitioner;
  onSave: (updates: {
    bio?: string;
    display_name?: string;
    title?: string;
    summary?: string;
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
    bio: practitioner.bio || ''
  });

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
      formData.bio !== (practitioner.bio || '')
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Informations Publiques
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
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
                helperText="Un court résumé de votre expertise (2-3 lignes)"
                disabled={loading || saving}
                inputProps={{ maxLength: 250 }}
              />
              <Typography variant="caption" color="text.secondary">
                {formData.summary.length} / 250 caractères
              </Typography>
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
                  bio: practitioner.bio || ''
                });
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
