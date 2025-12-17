// src/pages/ProfileCompletionPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';

/**
 * Page de complétion de profil OAuth
 * Affichée après une connexion OAuth pour collecter les informations obligatoires
 */
const ProfileCompletionPage = () => {
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();

  // Informations de base - obligatoires
  const [pseudo, setPseudo] = useState('');

  // Informations pour la préparation des séances - facultatives
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Vérification initiale - une seule fois au chargement
  useEffect(() => {
    // Rediriger si l'utilisateur n'est pas connecté
    if (!user) {
      logger.debug('[PROFILE_COMPLETION] Utilisateur non connecté, redirection vers login');
      navigate('/login', { replace: true });
      return;
    }

    // Pré-remplir les champs avec les données existantes
    if (profile) {
      setPseudo(profile.pseudo || '');
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setBirthDate(profile.birth_date || '');
      setPhone(profile.phone || '');
    }

    // Pré-remplir avec les métadonnées OAuth si disponibles
    if (user.user_metadata) {
      const { full_name, name } = user.user_metadata;

      if (full_name) {
        const nameParts = full_name.split(' ');
        if (nameParts.length > 0 && !firstName) {
          setFirstName(nameParts[0]);
        }
        if (nameParts.length > 1 && !lastName) {
          setLastName(nameParts.slice(1).join(' '));
        }
      } else if (name) {
        if (name.givenName && !firstName) {
          setFirstName(name.givenName);
        }
        if (name.familyName && !lastName) {
          setLastName(name.familyName);
        }
      }
    }
  }, []); // Dépendances vides = une seule fois

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!pseudo.trim()) {
      setError('Le pseudo est obligatoire.');
      return;
    }

    setLoading(true);

    try {
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      logger.debug('[PROFILE_COMPLETION] Mise à jour du profil pour:', user.id);

      // Mettre à jour le profil via le contexte AuthContext
      // Cela met à jour la BDD ET synchronise le contexte React
      const profileData: any = {
        pseudo: pseudo.trim(),
        user_type: 'client', // Par défaut, les utilisateurs OAuth sont des clients
        updated_at: new Date().toISOString(),
      };

      // Ajouter les champs optionnels seulement s'ils sont renseignés
      if (firstName.trim()) profileData.first_name = firstName.trim();
      if (lastName.trim()) profileData.last_name = lastName.trim();
      if (birthDate) profileData.birth_date = birthDate;
      if (phone.trim()) profileData.phone = phone.trim();

      const { error: updateError } = await updateProfile(profileData);

      if (updateError) {
        logger.error('[PROFILE_COMPLETION] Erreur mise à jour profil:', updateError);
        throw updateError;
      }

      logger.debug('[PROFILE_COMPLETION] Profil mis à jour avec succès');

      // Vérifier s'il y a une redirection sauvegardée
      const savedRedirect = sessionStorage.getItem('oauth_redirect');
      if (savedRedirect) {
        sessionStorage.removeItem('oauth_redirect');
        navigate(savedRedirect, { replace: true });
      } else {
        // Rediriger vers la page d'accueil
        navigate('/', { replace: true });
      }

    } catch (err: any) {
      logger.error('[PROFILE_COMPLETION] Erreur lors de la complétion du profil:', err);
      setError(err.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Complétez votre profil
        </Typography>

        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
          Pour finaliser votre inscription, nous avons besoin de quelques informations.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          {/* Section 1: Informations de base */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Informations de base
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Le pseudo est obligatoire pour créer votre compte.
            </Typography>

            <TextField
              required
              fullWidth
              id="pseudo"
              label="Pseudo"
              name="pseudo"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              disabled={loading}
              placeholder="Choisissez un pseudo pour vous identifier"
              helperText="Ce pseudo sera visible par les autres utilisateurs"
              sx={{ mb: 2 }}
            />

            <Alert severity="info">
              Votre email: <strong>{user.email}</strong>
            </Alert>
          </Box>

          {/* Section 2: Informations complémentaires */}
          <Box sx={{ mb: 4 }}>
            <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6">
                Informations pour la préparation des séances
              </Typography>
              <Tooltip
                title="Ces informations sont indispensables pour préparer la séance: tous vos prénoms, le nom de famille complet, et la date de naissance"
                arrow
              >
                <IconButton size="small" sx={{ ml: 1 }}>
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Ces informations sont facultatives pour la création du profil mais obligatoire pour une séance.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="firstName"
                  label="Tous les prénoms"
                  name="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={loading}
                  helperText="Tous vos prénoms dans l'ordre de l'état civil"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="lastName"
                  label="Nom de famille complet"
                  name="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                  helperText="Nom complet tel qu'il apparaît sur vos documents"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="birthDate"
                  label="Date de naissance"
                  name="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  disabled={loading}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  helperText="Format: AAAA-MM-JJ"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="phone"
                  label="Téléphone"
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                  helperText="Numéro de contact (facultatif)"
                />
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 3 }}>
              Vous pourrez modifier ces informations ultérieurement dans votre profil.
            </Alert>
          </Box>

          {/* Bouton de validation */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading || !pseudo.trim()}
            >
              {loading ? <CircularProgress size={24} /> : 'Enregistrer mon profil'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default ProfileCompletionPage;
