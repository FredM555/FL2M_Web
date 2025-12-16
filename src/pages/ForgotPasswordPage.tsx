// src/pages/ForgotPasswordPage.tsx
import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Link
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { supabase } from '../services/supabase';
import EmailIcon from '@mui/icons-material/Email';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Valider l'email
      if (!email || !email.includes('@')) {
        throw new Error('Veuillez entrer une adresse email valide');
      }

      // Envoyer l'email de réinitialisation via Supabase
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;

      setSuccess(true);
    } catch (err: any) {
      console.error('Erreur lors de la demande de réinitialisation:', err);
      setError(err.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

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
      {/* Overlay */}
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
          {/* Bouton retour */}
          <Button
            component={RouterLink}
            to="/login"
            startIcon={<ArrowBackIcon />}
            sx={{ mb: 2 }}
          >
            Retour à la connexion
          </Button>

          {success ? (
            // Message de succès
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircleIcon
                sx={{
                  fontSize: 64,
                  color: 'success.main',
                  mb: 2
                }}
              />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Email envoyé !
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Un email de réinitialisation a été envoyé à :
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 3 }}>
                {email}
              </Typography>
              <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Vérifiez votre boîte mail</strong>
                </Typography>
                <Typography variant="body2">
                  • Cliquez sur le lien dans l'email pour réinitialiser votre mot de passe
                </Typography>
                <Typography variant="body2">
                  • Le lien est valide pendant 1 heure
                </Typography>
                <Typography variant="body2">
                  • Vérifiez également vos spams si vous ne voyez pas l'email
                </Typography>
              </Alert>
              <Button
                variant="outlined"
                onClick={() => {
                  setSuccess(false);
                  setEmail('');
                }}
              >
                Renvoyer un email
              </Button>
            </Box>
          ) : (
            // Formulaire de demande
            <>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <EmailIcon
                  sx={{
                    fontSize: 48,
                    color: 'primary.main',
                    mb: 2
                  }}
                />
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
                  Mot de passe oublié ?
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Pas de problème ! Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
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
                  id="email"
                  label="Adresse email"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  placeholder="votre@email.com"
                  InputProps={{
                    startAdornment: (
                      <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    ),
                  }}
                />

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
                  disabled={loading || !email}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Envoyer le lien de réinitialisation'
                  )}
                </Button>

                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Vous vous souvenez de votre mot de passe ?{' '}
                    <Link component={RouterLink} to="/login" variant="body2">
                      Se connecter
                    </Link>
                  </Typography>
                </Box>
              </Box>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default ForgotPasswordPage;
