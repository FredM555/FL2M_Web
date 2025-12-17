// src/pages/ResetPasswordPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  LinearProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

import LockResetIcon from '@mui/icons-material/LockReset';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { logger } from '../utils/logger';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  // Validation du mot de passe
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  useEffect(() => {
    // Vérifier si l'utilisateur arrive avec un token de réinitialisation
    const checkToken = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          setError('Le lien de réinitialisation est invalide ou a expiré.');
        }
      } catch (err) {
        logger.error('Erreur lors de la validation du token:', err);
        setTokenValid(false);
        setError('Une erreur est survenue lors de la validation du lien.');
      } finally {
        setValidatingToken(false);
      }
    };

    checkToken();
  }, []);

  useEffect(() => {
    // Valider la force du mot de passe
    setPasswordStrength({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  }, [password]);

  const isPasswordValid = Object.values(passwordStrength).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (!isPasswordValid) {
      setError('Le mot de passe ne respecte pas tous les critères de sécurité.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);

    try {
      // Mettre à jour le mot de passe via Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      setSuccess(true);

      // Rediriger vers la page de connexion après 3 secondes
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      logger.error('Erreur lors de la réinitialisation:', err);
      setError(err.message || 'Une erreur est survenue lors de la réinitialisation du mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = (isValid: boolean) => {
    return isValid ? 'success.main' : 'text.disabled';
  };

  const getStrengthIcon = (isValid: boolean) => {
    return isValid ? <CheckCircleIcon fontSize="small" /> : <ErrorIcon fontSize="small" />;
  };

  if (validatingToken) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, mt: { xs: '23px', md: '40px' } }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body1">
            Validation du lien de réinitialisation...
          </Typography>
        </Paper>
      </Container>
    );
  }

  if (!tokenValid) {
    return (
      <Box sx={{ width: '100%', position: 'relative', minHeight: '100vh' }}>
        {/* Image de fond */}
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
            backgroundImage: {
              xs: 'none',
              md: 'url(/images/MonProfil.jpg)'
            },
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.7,
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
            background: 'linear-gradient(180deg, rgba(248, 249, 250, 0.3) 0%, rgba(233, 236, 239, 0.35) 50%, rgba(222, 226, 230, 0.4) 100%)',
            pointerEvents: 'none',
          }}
        />
        <Container maxWidth="sm" sx={{ py: { xs: 4, md: 8 }, position: 'relative', zIndex: 1, mt: { xs: '80px', md: '40px' } }}>
          <Paper elevation={3} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
            <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Lien invalide ou expiré
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Le lien de réinitialisation est invalide ou a expiré. Veuillez faire une nouvelle demande.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/forgot-password')}
              sx={{
                mt: 2,
                background: 'linear-gradient(45deg, #345995, #1D3461)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1D3461, #345995)',
                },
              }}
            >
              Demander un nouveau lien
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', position: 'relative', minHeight: '100vh' }}>
      {/* Image de fond */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          backgroundImage: {
            xs: 'none',
            md: 'url(/images/MonProfil.jpg)'
          },
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.7,
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          background: 'linear-gradient(180deg, rgba(248, 249, 250, 0.3) 0%, rgba(233, 236, 239, 0.35) 50%, rgba(222, 226, 230, 0.4) 100%)',
          pointerEvents: 'none',
        }}
      />

      <Container
        maxWidth="sm"
        sx={{
          py: { xs: 4, md: 8 },
          position: 'relative',
          zIndex: 1,
          mt: { xs: '80px', md: '40px' }
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(255, 215, 0, 0.3)',
          }}
        >
          {success ? (
            // Message de succès
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Mot de passe réinitialisé !
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Votre mot de passe a été réinitialisé avec succès.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Redirection vers la page de connexion...
              </Typography>
              <LinearProgress sx={{ mt: 2 }} />
            </Box>
          ) : (
            // Formulaire de réinitialisation
            <>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <LockResetIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
                  Nouveau mot de passe
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Choisissez un nouveau mot de passe sécurisé pour votre compte.
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit} noValidate>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Nouveau mot de passe"
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
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  margin="normal"
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
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Indicateurs de force du mot de passe */}
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Critères de sécurité :
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ color: getStrengthColor(passwordStrength.length) }}>
                        {getStrengthIcon(passwordStrength.length)}
                      </Box>
                      <Typography variant="body2" color={getStrengthColor(passwordStrength.length)}>
                        Au moins 8 caractères
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ color: getStrengthColor(passwordStrength.uppercase) }}>
                        {getStrengthIcon(passwordStrength.uppercase)}
                      </Box>
                      <Typography variant="body2" color={getStrengthColor(passwordStrength.uppercase)}>
                        Une lettre majuscule
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ color: getStrengthColor(passwordStrength.lowercase) }}>
                        {getStrengthIcon(passwordStrength.lowercase)}
                      </Box>
                      <Typography variant="body2" color={getStrengthColor(passwordStrength.lowercase)}>
                        Une lettre minuscule
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ color: getStrengthColor(passwordStrength.number) }}>
                        {getStrengthIcon(passwordStrength.number)}
                      </Box>
                      <Typography variant="body2" color={getStrengthColor(passwordStrength.number)}>
                        Un chiffre
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ color: getStrengthColor(passwordStrength.special) }}>
                        {getStrengthIcon(passwordStrength.special)}
                      </Box>
                      <Typography variant="body2" color={getStrengthColor(passwordStrength.special)}>
                        Un caractère spécial (!@#$%^&*...)
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{
                    mt: 3,
                    mb: 2,
                    background: 'linear-gradient(45deg, #345995, #1D3461)',
                    py: 1.5,
                    fontWeight: 600,
                    '&:hover': {
                      background: 'linear-gradient(45deg, #1D3461, #345995)',
                    },
                  }}
                  disabled={loading || !isPasswordValid || password !== confirmPassword}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Réinitialiser le mot de passe'
                  )}
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default ResetPasswordPage;
