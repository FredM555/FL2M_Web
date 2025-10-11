// src/components/auth/Login.jsx
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button, TextField, Typography, Box, Divider, Alert } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithEmail, signInWithGoogle, signInWithApple } = useAuth();
  const navigate = useNavigate();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      setLoading(false);
      return;
    }

    try {
      const { error } = await signInWithEmail(email, password);
      if (error) throw error;
      navigate('/'); // Rediriger vers la page d'accueil après connexion
    } catch (error) {
      setError('Erreur de connexion: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
      // Redirection gérée par Supabase
    } catch (error) {
      setError('Erreur de connexion avec Google: ' + error.message);
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { error } = await signInWithApple();
      if (error) throw error;
      // Redirection gérée par Supabase
    } catch (error) {
      setError('Erreur de connexion avec Apple: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', p: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Connexion
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <form onSubmit={handleEmailLogin}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          disabled={loading}
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </Button>
      </form>

      <Divider sx={{ my: 3 }}>ou</Divider>

      <Button
        variant="outlined"
        fullWidth
        startIcon={
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" 
            alt="Google" 
            style={{ width: 20, height: 20 }} 
          />
        }
        onClick={handleGoogleLogin}
        sx={{ mb: 2 }}
        disabled={loading}
      >
        Continuer avec Google
      </Button>

      <Button
        variant="outlined"
        fullWidth
        startIcon={
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" 
            alt="Apple" 
            style={{ width: 20, height: 20 }} 
          />
        }
        onClick={handleAppleLogin}
        disabled={loading}
      >
        Continuer avec Apple
      </Button>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2">
          Vous n'avez pas de compte ?{' '}
          <Link to="/signup" style={{ textDecoration: 'none' }}>
            S'inscrire
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};

export default Login;