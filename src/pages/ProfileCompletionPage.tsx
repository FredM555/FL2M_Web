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
  Stepper,
  Step,
  StepLabel,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

/**
 * Page de complétion de profil OAuth
 * Affichée après une connexion OAuth pour collecter les informations obligatoires
 */
const ProfileCompletionPage = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // Informations de base - obligatoires
  const [pseudo, setPseudo] = useState('');

  // Informations pour la préparation des séances - facultatives
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const steps = ['Informations de base', 'Informations complémentaires'];

  useEffect(() => {
    // Rediriger si l'utilisateur n'est pas connecté
    if (!user) {
      console.log('[PROFILE_COMPLETION] Utilisateur non connecté, redirection vers login');
      navigate('/login', { replace: true });
      return;
    }

    // Vérifier si le profil existe déjà et est complet
    if (profile && profile.pseudo) {
      console.log('[PROFILE_COMPLETION] Profil déjà complet, redirection vers accueil');
      navigate('/', { replace: true });
      return;
    }

    // Pré-remplir les champs si des données existent déjà
    if (profile) {
      setPseudo(profile.pseudo || '');
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setBirthDate(profile.birth_date || '');
      setPhone(profile.phone || '');
    }

    // Récupérer les métadonnées OAuth si disponibles
    if (user.user_metadata) {
      // Google fournit : full_name, avatar_url, email
      // Apple fournit : full_name (si autorisé), email
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
        // Format alternatif (Apple peut utiliser ce format)
        if (name.givenName && !firstName) {
          setFirstName(name.givenName);
        }
        if (name.familyName && !lastName) {
          setLastName(name.familyName);
        }
      }
    }
  }, [user, profile, navigate]);

  const handleNext = () => {
    // Validation de l'étape courante
    if (activeStep === 0) {
      if (!pseudo.trim()) {
        setError('Le pseudo est obligatoire pour continuer.');
        return;
      }
    }

    setError(null);
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation finale
    if (!pseudo.trim()) {
      setError('Le pseudo est obligatoire.');
      return;
    }

    setLoading(true);

    try {
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      console.log('[PROFILE_COMPLETION] Mise à jour du profil pour:', user.id);

      // Mettre à jour le profil dans la base de données
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          pseudo: pseudo.trim(),
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          birth_date: birthDate || null,
          phone: phone.trim() || null,
          user_type: 'client', // Par défaut, les utilisateurs OAuth sont des clients
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('[PROFILE_COMPLETION] Erreur mise à jour profil:', updateError);
        throw updateError;
      }

      console.log('[PROFILE_COMPLETION] Profil mis à jour avec succès');

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
      console.error('[PROFILE_COMPLETION] Erreur lors de la complétion du profil:', err);
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
          Pour finaliser votre inscription, nous avons besoin de quelques informations supplémentaires.
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          {/* Étape 1: Informations de base */}
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Informations de base (obligatoires)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Ces informations sont nécessaires pour créer votre compte.
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

              <Alert severity="info" sx={{ mt: 2 }}>
                Votre email: <strong>{user.email}</strong>
              </Alert>
            </Box>
          )}

          {/* Étape 2: Informations complémentaires */}
          {activeStep === 1 && (
            <Box>
              <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
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
                Ces informations sont facultatives mais recommandées pour une meilleure expérience.
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
                    helperText="Veuillez indiquer tous vos prénoms dans l'ordre de l'état civil"
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
          )}

          {/* Boutons de navigation */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0 || loading}
              onClick={handleBack}
              variant="outlined"
            >
              Retour
            </Button>

            <Box>
              {activeStep === steps.length - 1 ? (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || !pseudo.trim()}
                >
                  {loading ? <CircularProgress size={24} /> : 'Terminer'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={loading || !pseudo.trim()}
                >
                  Suivant
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default ProfileCompletionPage;
