// src/pages/SignupPage.tsx
import React, { useState } from 'react';

import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  Divider,
  Grid,
  Link,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  IconButton,
  Tooltip,
  InputAdornment
} from '@mui/material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleIcon from '@mui/icons-material/Google';
import AppleIcon from '@mui/icons-material/Apple';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { logger } from '../utils/logger';

interface LocationState {
  from?: string;
  preSelectedServiceId?: string;
  preSelectedCategory?: string;
}

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState || {};
  
  const { signUpWithEmail, signInWithGoogle, signInWithApple } = useAuth();
  
  // Informations de base - obligatoires
  const [email, setEmail] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Informations pour la préparation des séances - facultatives
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    if (!email || !pseudo) {
      setError('Le pseudo et l\'email sont obligatoires.');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    
    if (!acceptTerms) {
      setError('Vous devez accepter les conditions générales pour continuer.');
      return;
    }
    
    setLoading(true);
    
    try {
      const { error: signUpError, data: signUpData } = await signUpWithEmail(email, password, {
        first_name: firstName,
        last_name: lastName,
        pseudo: pseudo,
        birth_date: birthDate,
        user_type: 'client'
      });

      if (signUpError) {
        throw signUpError;
      }

      // Vérifier si l'email doit être confirmé
      // Si data.session est null, cela signifie qu'une confirmation d'email est requise
      const needsEmailConfirmation = !signUpData?.session;

      if (needsEmailConfirmation) {
        // Afficher un message de confirmation d'email
        setError(null);
        setLoading(false);
        // On pourrait afficher un message de succès au lieu d'une erreur
        alert('Inscription réussie ! Veuillez vérifier votre email pour confirmer votre compte.');
        // Rediriger vers la page de login
        navigate('/login', {
          state: {
            message: 'Veuillez vérifier votre email pour confirmer votre compte.'
          }
        });
        return;
      }

      // Inscription réussie avec session établie, rediriger vers la page spécifiée ou par défaut
      if (state.from) {
        // Si la redirection vient de la page module adulte et contient les informations de service
        if (state.from === '/prendre-rendez-vous' && state.preSelectedServiceId) {
          navigate(state.from, {
            state: {
              preSelectedServiceId: state.preSelectedServiceId,
              preSelectedCategory: state.preSelectedCategory
            }
          });
        } else {
          // Redirection standard
          navigate(state.from);
        }
      } else {
        // Redirection par défaut
        navigate('/');
      }

    } catch (err) {
      logger.error('Erreur d\'inscription:', err);
      setError('Erreur lors de l\'inscription. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleSignup = async () => {
    setError(null);
    try {
      await signInWithGoogle();
      // La redirection se fera automatiquement via OAuth
    } catch (err) {
      logger.error('Erreur d\'inscription avec Google:', err);
      setError('Erreur lors de l\'inscription avec Google. Veuillez réessayer.');
    }
  };
  
  const handleAppleSignup = async () => {
    setError(null);
    try {
      await signInWithApple();
      // La redirection se fera automatiquement via OAuth
    } catch (err) {
      logger.error('Erreur d\'inscription avec Apple:', err);
      setError('Erreur lors de l\'inscription avec Apple. Veuillez réessayer.');
    }
  };
  
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6, md: 8 }, px: { xs: 2, sm: 3 } }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 2 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          align="center"
          sx={{
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
          }}
        >
          Créer un compte
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSignup} noValidate sx={{ mt: 3 }}>
          {/* Informations de base - obligatoires */}
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              fontSize: { xs: '1.125rem', sm: '1.25rem' }
            }}
          >
            Informations de base
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
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
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="email"
                label="Adresse email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="password"
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                        disabled={loading}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="confirmPassword"
                label="Confirmer le mot de passe"
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle confirm password visibility"
                        onClick={handleToggleConfirmPasswordVisibility}
                        edge="end"
                        disabled={loading}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
          
          {/* Informations pour la préparation des séances - facultatives */}
          <Box sx={{ mt: 4, mb: 2 }}>
            <Box display="flex" alignItems="center" flexWrap="wrap">
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  fontSize: { xs: '1.125rem', sm: '1.25rem' }
                }}
              >
                Informations nécessaires pour la préparation des séances
              </Typography>
              <Tooltip title="Les informations suivantes sont indispensables pour préparé la séance:
* tous nos prénoms
* le nom de famille complet
* date de naissance" arrow>
                <IconButton size="small" sx={{ ml: 1 }}>
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
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
                helperText="Indiquez votre nom de famille complet tel qu'il apparaît sur vos documents officiels"
              />
            </Grid>
            <Grid item xs={12}>
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
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={acceptTerms} 
                    onChange={(e) => setAcceptTerms(e.target.checked)} 
                    color="primary" 
                    disabled={loading}
                  />
                }
                label="J'accepte les conditions générales d'utilisation"
              />
            </Grid>
          </Grid>
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "S'inscrire"}
          </Button>
        </Box>
        
        <Divider sx={{ my: 3 }}>ou</Divider>
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleSignup}
              disabled={loading}
            >
              Continuer avec Google
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<AppleIcon />}
              onClick={handleAppleSignup}
              disabled={loading}
            >
              Continuer avec Apple
            </Button>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2">
            Vous avez déjà un compte ?{' '}
            <Link 
              component={RouterLink} 
              to="/login" 
              state={state} // Passer l'état à la page de connexion
              variant="body2"
            >
              Se connecter
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default SignupPage;