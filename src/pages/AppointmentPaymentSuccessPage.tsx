// src/pages/AppointmentPaymentSuccessPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';

const AppointmentPaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [countdown, setCountdown] = useState(5);

  const appointmentId = searchParams.get('appointmentId');

  console.log('[SUCCESS-PAGE] Page de succès chargée');
  console.log('[SUCCESS-PAGE] Appointment ID:', appointmentId);
  console.log('[SUCCESS-PAGE] URL complète:', window.location.href);

  useEffect(() => {
    if (!appointmentId) {
      console.error('[SUCCESS-PAGE] ID de rendez-vous manquant dans l\'URL');
      setError('ID de rendez-vous manquant');
      setLoading(false);
      return;
    }

    console.log('[SUCCESS-PAGE] Vérification du statut du paiement...');

    const checkPaymentStatus = async () => {
      try {
        // Vérifier le statut du rendez-vous et de la transaction
        const { data: appointment, error: aptError } = await supabase
          .from('appointments')
          .select('status, payment_status')
          .eq('id', appointmentId)
          .single();

        if (aptError) throw aptError;

        // Vérifier que le paiement a bien été traité
        const { data: transaction, error: txError } = await supabase
          .from('transactions')
          .select('status')
          .eq('appointment_id', appointmentId)
          .single();

        if (txError && txError.code !== 'PGRST116') {
          // PGRST116 = pas de résultat, on ignore cette erreur pour l'instant
          throw txError;
        }

        console.log('[SUCCESS-PAGE] Statuts récupérés:', {
          appointmentStatus: appointment?.status,
          paymentStatus: appointment?.payment_status,
          transactionStatus: transaction?.status,
          retryCount
        });

        // Le paiement est confirmé si :
        // - Le rendez-vous est confirmé OU
        // - La transaction est en succeeded
        if (appointment?.status === 'confirmed' || transaction?.status === 'succeeded') {
          console.log('[SUCCESS-PAGE] ✅ Paiement vérifié avec succès !');
          setPaymentVerified(true);
          setLoading(false);
        } else if (retryCount < 10) {
          console.log('[SUCCESS-PAGE] ⏳ Paiement pas encore confirmé, nouvelle tentative...');
          // Réessayer après 1 seconde (max 10 fois = 10 secondes)
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 1000);
        } else {
          // Après 10 tentatives, afficher un avertissement
          setError('Le paiement est en cours de traitement. Veuillez vérifier vos rendez-vous dans quelques instants.');
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Erreur lors de la vérification du paiement:', err);
        if (retryCount < 10) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 1000);
        } else {
          setError('Impossible de vérifier le statut du paiement. Veuillez consulter vos rendez-vous.');
          setLoading(false);
        }
      }
    };

    checkPaymentStatus();
  }, [appointmentId, retryCount]);

  // Gérer le compte à rebours et la redirection automatique
  useEffect(() => {
    if (paymentVerified && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (paymentVerified && countdown === 0) {
      navigate('/mes-rendez-vous');
    }
  }, [paymentVerified, countdown, navigate]);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h5" color="text.secondary">
          Validation de votre paiement en cours...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Tentative {retryCount + 1}/10
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <WarningIcon sx={{ fontSize: 100, color: 'warning.main', mb: 3 }} />

          <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
            Paiement en cours de traitement
          </Typography>

          <Alert severity="warning" sx={{ mt: 3, mb: 3 }}>
            {error}
          </Alert>

          <Typography variant="body1" color="text.secondary" paragraph>
            Votre paiement a été effectué sur Stripe, mais la confirmation prend plus de temps que prévu.
            Cela peut arriver si le webhook Stripe n'est pas encore configuré.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/')}
            >
              Retour à l'accueil
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate('/mes-rendez-vous')}
            >
              Voir mes rendez-vous
            </Button>
            <Button
              variant="outlined"
              onClick={() => window.location.reload()}
            >
              Réessayer
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper
        sx={{
          p: 4,
          textAlign: 'center',
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(255, 255, 255, 1) 100%)'
        }}
      >
        <CheckCircleIcon sx={{ fontSize: 100, color: 'success.main', mb: 3 }} />

        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: 'success.main' }}>
          Paiement réussi !
        </Typography>

        <Typography variant="h6" color="text.secondary" paragraph>
          Votre rendez-vous est maintenant confirmé
        </Typography>

        <Alert severity="success" sx={{ mt: 3, mb: 3 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            ✅ Vous recevrez un email de confirmation avec tous les détails de votre rendez-vous.
          </Typography>
          <Typography variant="body2">
            <strong>Important :</strong> Pensez à valider que la séance s'est bien déroulée après votre rendez-vous pour que l'intervenant soit payé immédiatement !
          </Typography>
        </Alert>

        {/* Compte à rebours */}
        <Box
          sx={{
            mt: 4,
            mb: 3,
            p: 2,
            bgcolor: 'primary.light',
            borderRadius: 2,
            display: 'inline-block'
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
            Redirection automatique dans {countdown} seconde{countdown > 1 ? 's' : ''}...
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/mes-rendez-vous')}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 700
            }}
          >
            📅 Voir mes rendez-vous maintenant
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/')}
          >
            Retour à l'accueil
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default AppointmentPaymentSuccessPage;
