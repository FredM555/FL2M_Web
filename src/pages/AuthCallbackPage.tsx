// src/pages/AuthCallbackPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { supabase } from '../services/supabase';

/**
 * Page de callback OAuth
 * Cette page gère le retour après une authentification OAuth (Google, Apple)
 * et redirige l'utilisateur vers la page appropriée
 */
const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'processing' | 'checking_profile' | 'redirecting' | 'error'>('processing');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      console.log('[AUTH_CALLBACK] Début du traitement du callback OAuth');

      try {
        // Vérifier s'il y a un code d'erreur dans l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const errorCode = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (errorCode) {
          console.error('[AUTH_CALLBACK] Erreur OAuth:', errorCode, errorDescription);
          setError(errorDescription || 'Une erreur est survenue lors de la connexion');
          setStatus('error');

          // Rediriger vers la page de connexion après 3 secondes
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
          return;
        }

        // Récupérer la session actuelle
        setStatus('processing');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[AUTH_CALLBACK] Erreur récupération session:', sessionError);
          throw sessionError;
        }

        if (!session) {
          console.warn('[AUTH_CALLBACK] Aucune session trouvée');
          setError('Aucune session trouvée. Redirection vers la page de connexion...');
          setStatus('error');
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 2000);
          return;
        }

        console.log('[AUTH_CALLBACK] Session OAuth récupérée:', session.user.id);

        // Vérifier si le profil existe et est complet
        setStatus('checking_profile');
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('[AUTH_CALLBACK] Erreur récupération profil:', profileError);
          // Le profil n'existe peut-être pas encore, rediriger vers la complétion
          console.log('[AUTH_CALLBACK] Profil non trouvé, redirection vers complétion');
          setStatus('redirecting');
          navigate('/complete-profile', { replace: true });
          return;
        }

        // Vérifier si le profil est complet
        // Un profil est considéré comme complet s'il a au minimum un pseudo
        const isProfileComplete = profile && profile.pseudo;

        console.log('[AUTH_CALLBACK] Profil trouvé:', {
          id: profile?.id,
          pseudo: profile?.pseudo,
          isComplete: isProfileComplete
        });

        setStatus('redirecting');

        if (!isProfileComplete) {
          // Profil incomplet, rediriger vers la page de complétion
          console.log('[AUTH_CALLBACK] Profil incomplet, redirection vers complétion');
          navigate('/complete-profile', { replace: true });
        } else {
          // Profil complet, rediriger vers la page d'accueil
          console.log('[AUTH_CALLBACK] Profil complet, redirection vers accueil');

          // Vérifier s'il y a un état de redirection sauvegardé
          const savedRedirect = sessionStorage.getItem('oauth_redirect');
          if (savedRedirect) {
            sessionStorage.removeItem('oauth_redirect');
            navigate(savedRedirect, { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        }

      } catch (err) {
        console.error('[AUTH_CALLBACK] Erreur lors du traitement:', err);
        setError('Une erreur est survenue. Veuillez réessayer.');
        setStatus('error');

        // Rediriger vers la page de connexion après 3 secondes
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    handleOAuthCallback();
  }, [navigate]);

  const getStatusMessage = () => {
    switch (status) {
      case 'processing':
        return 'Connexion en cours...';
      case 'checking_profile':
        return 'Vérification de votre profil...';
      case 'redirecting':
        return 'Redirection...';
      case 'error':
        return 'Erreur de connexion';
      default:
        return 'Traitement...';
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        gap: 3,
        px: 2,
      }}
    >
      {status !== 'error' ? (
        <>
          <CircularProgress size={60} />
          <Typography variant="h6" align="center">
            {getStatusMessage()}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Veuillez patienter pendant que nous finalisons votre connexion...
          </Typography>
        </>
      ) : (
        <>
          <Alert severity="error" sx={{ maxWidth: 500 }}>
            {error || 'Une erreur est survenue lors de la connexion.'}
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Redirection vers la page de connexion...
          </Typography>
        </>
      )}
    </Box>
  );
};

export default AuthCallbackPage;
