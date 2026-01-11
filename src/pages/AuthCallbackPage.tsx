// src/pages/AuthCallbackPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { supabase } from '../services/supabase';
import { logger } from '../utils/logger';

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
      logger.debug('[AUTH_CALLBACK] Début du traitement du callback OAuth');

      try {
        // Vérifier s'il y a un code d'erreur dans l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const errorCode = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (errorCode) {
          logger.error('[AUTH_CALLBACK] Erreur OAuth:', errorCode, errorDescription);
          setError(errorDescription || 'Une erreur est survenue lors de la connexion');
          setStatus('error');

          // Rediriger vers la page de connexion après 3 secondes
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
          return;
        }

        // Vérifier si l'URL contient des hash fragments OAuth (tokens)
        const hash = window.location.hash;
        const hasOAuthParams = hash.includes('access_token') || hash.includes('refresh_token') || hash.includes('code');

        logger.debug('[AUTH_CALLBACK] Hash fragments présents:', hasOAuthParams, 'Hash:', hash);

        // Sur mobile avec Capacitor, les tokens OAuth sont dans les hash fragments
        // Supabase les traite automatiquement, mais il faut attendre un peu
        if (hasOAuthParams) {
          logger.debug('[AUTH_CALLBACK] Tokens OAuth détectés, attente du traitement par Supabase...');
          // Attendre 1 seconde pour laisser à Supabase le temps de traiter les tokens
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Récupérer la session actuelle
        setStatus('processing');
        let { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          logger.error('[AUTH_CALLBACK] Erreur récupération session:', sessionError);
          throw sessionError;
        }

        if (!session) {
          // Si on a des paramètres OAuth mais pas de session, réessayer après un délai supplémentaire
          if (hasOAuthParams) {
            logger.debug('[AUTH_CALLBACK] Pas de session trouvée malgré les tokens OAuth, nouvelle tentative...');
            await new Promise(resolve => setTimeout(resolve, 1500));

            const retryResult = await supabase.auth.getSession();

            if (retryResult.error) {
              logger.error('[AUTH_CALLBACK] Erreur lors de la nouvelle tentative:', retryResult.error);
              throw retryResult.error;
            }

            if (retryResult.data.session) {
              logger.debug('[AUTH_CALLBACK] Session trouvée lors de la nouvelle tentative');
              // Continuer avec la session trouvée
              session = retryResult.data.session;
            }
          }

          // Si toujours pas de session
          if (!session) {
            logger.warn('[AUTH_CALLBACK] Aucune session trouvée');
            setError('Aucune session trouvée. Redirection vers la page de connexion...');
            setStatus('error');
            setTimeout(() => {
              navigate('/login', { replace: true });
            }, 2000);
            return;
          }
        }

        logger.debug('[AUTH_CALLBACK] Session OAuth récupérée:', session.user.id);

        // Vérifier si le profil existe et est complet
        setStatus('checking_profile');
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          logger.error('[AUTH_CALLBACK] Erreur récupération profil:', profileError);
          // Le profil n'existe peut-être pas encore, rediriger vers la complétion
          logger.debug('[AUTH_CALLBACK] Profil non trouvé, redirection vers complétion');
          setStatus('redirecting');
          navigate('/complete-profile', { replace: true });
          return;
        }

        // Vérifier si le profil est complet
        // Un profil est considéré comme complet s'il a au minimum un pseudo
        const isProfileComplete = profile && profile.pseudo;

        logger.debug('[AUTH_CALLBACK] Profil trouvé:', {
          id: profile?.id,
          pseudo: profile?.pseudo,
          isComplete: isProfileComplete
        });

        setStatus('redirecting');

        if (!isProfileComplete) {
          // Profil incomplet, rediriger vers la page de complétion
          logger.debug('[AUTH_CALLBACK] Profil incomplet, redirection vers complétion');
          navigate('/complete-profile', { replace: true });
        } else {
          // Profil complet, rediriger vers la page d'accueil
          logger.debug('[AUTH_CALLBACK] Profil complet, redirection vers accueil');

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
        logger.error('[AUTH_CALLBACK] Erreur lors du traitement:', err);
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
