// src/pages/LoginPage.tsx
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
  IconButton,
  InputAdornment
} from '@mui/material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleIcon from '@mui/icons-material/Google';
import AppleIcon from '@mui/icons-material/Apple';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

interface LocationState {
  from?: string;
  preSelectedServiceId?: string;
  preSelectedCategory?: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState || {};
  
  const { signInWithEmail, signInWithGoogle, signInWithApple } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const { error: signInError } = await signInWithEmail(email, password);
      
      if (signInError) {
        throw signInError;
      }
      
      // Redirection réussie, vérifier s'il y a une URL de redirection
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
      console.error('Erreur de connexion:', err);
      setError('Identifiants incorrects. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleLogin = async () => {
    setError(null);
    try {
      await signInWithGoogle();
      // La redirection se fera automatiquement via OAuth
    } catch (err) {
      console.error('Erreur de connexion Google:', err);
      setError('Erreur lors de la connexion avec Google. Veuillez réessayer.');
    }
  };
  
  const handleAppleLogin = async () => {
    setError(null);
    try {
      await signInWithApple();
      // La redirection se fera automatiquement via OAuth
    } catch (err) {
      console.error('Erreur de connexion Apple:', err);
      setError('Erreur lors de la connexion avec Apple. Veuillez réessayer.');
    }
  };
  
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Connexion
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleEmailLogin} noValidate sx={{ mt: 3 }}>
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
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Mot de passe"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="current-password"
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
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Se connecter'}
          </Button>
          
          <Box sx={{ textAlign: 'center', my: 2 }}>
            <Link component={RouterLink} to="/forgot-password" variant="body2">
              Mot de passe oublié ?
            </Link>
          </Box>
        </Box>
        
        <Divider sx={{ my: 3 }}>ou</Divider>
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleLogin}
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
              onClick={handleAppleLogin}
              disabled={loading}
            >
              Continuer avec Apple
            </Button>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2">
            Vous n'avez pas de compte ?{' '}
            <Link 
              component={RouterLink} 
              to="/signup" 
              state={state} // Passer l'état à la page d'inscription également
              variant="body2"
            >
              Créer un compte
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage;