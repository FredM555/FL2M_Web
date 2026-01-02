// src/pages/PractitionerPaymentSuccessPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  CircularProgress,
  Alert,
  Button,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { logger } from '../utils/logger';

const PractitionerPaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contractId = searchParams.get('contractId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!contractId) {
      setError('ID de contrat manquant');
      setLoading(false);
      return;
    }

    checkPaymentAndStripeConnect();
  }, [contractId]);

  const checkPaymentAndStripeConnect = async () => {
    try {
      setStep(0);
      logger.info('[Payment Success] Vérification du paiement...');

      // Polling intelligent pour attendre le webhook Stripe
      let contract = null;
      let attempts = 0;
      const maxAttempts = 10; // 10 tentatives max

      while (attempts < maxAttempts) {
        const { data, error } = await supabase
          .from('practitioner_contracts')
          .select('id, practitioner_id, status')
          .eq('id', contractId)
          .single();

        if (error && !data) {
          throw new Error('Contrat non trouvé');
        }

        contract = data;

        // Si le contrat est actif, on peut continuer
        if (contract.status === 'active') {
          logger.info('[Payment Success] Contrat activé !');
          break;
        }

        // Sinon, attendre 500ms avant de réessayer
        logger.info(`[Payment Success] Contrat en attente (${attempts + 1}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      if (!contract || contract.status !== 'active') {
        logger.warn('[Payment Success] Contrat non activé après timeout, on continue quand même');
      }

      setStep(1);
      setStep(2);
      logger.info('[Payment Success] Vérification du compte Stripe Connect...');

      if (!contract) {
        throw new Error('Contrat introuvable après activation');
      }

      // Vérifier si le compte Stripe Connect existe
      const { data: practitioner, error: practitionerError } = await supabase
        .from('practitioners')
        .select('id, stripe_account_id, stripe_account_status')
        .eq('id', contract.practitioner_id)
        .single();

      if (practitionerError || !practitioner) {
        throw new Error('Intervenant non trouvé');
      }

      setStep(3);

      // Si pas de compte Stripe Connect OU compte incomplet
      if (!practitioner.stripe_account_id || practitioner.stripe_account_status !== 'complete') {
        logger.info('[Payment Success] Configuration du compte Stripe Connect...');

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Session non trouvée');

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-create-connect-account`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors de la création du compte Stripe Connect');
        }

        const { onboardingUrl, status } = await response.json();

        if (onboardingUrl) {
          // Redirection vers l'onboarding Stripe Connect
          logger.info('[Payment Success] Redirection vers Stripe Connect onboarding');
          setStep(4);
          await new Promise(resolve => setTimeout(resolve, 800));
          window.location.href = onboardingUrl;
          return;
        } else if (status === 'complete') {
          // Compte déjà configuré
          logger.info('[Payment Success] Compte Stripe Connect déjà configuré');
          setStep(5);
          await new Promise(resolve => setTimeout(resolve, 500));
          navigate('/practitioner-profile?tab=subscription', {
            state: { paymentSuccess: true }
          });
          return;
        }
      } else {
        // Compte Stripe Connect déjà configuré
        logger.info('[Payment Success] Compte Stripe Connect OK, redirection');
        setStep(5);
        await new Promise(resolve => setTimeout(resolve, 500));
        navigate('/practitioner-profile?tab=subscription', {
          state: { paymentSuccess: true }
        });
      }

    } catch (err: any) {
      logger.error('[Payment Success] Erreur:', err);
      setError(err.message || 'Une erreur est survenue');
      setLoading(false);
    }
  };

  const steps = [
    'Vérification du paiement',
    'Activation du contrat',
    'Vérification du compte bancaire',
    'Configuration du compte',
    'Finalisation'
  ];

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button
            variant="contained"
            onClick={() => navigate('/practitioner-profile?tab=subscription')}
          >
            Retour à mon profil
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Paiement réussi ! 🎉
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Nous finalisons la configuration de votre compte...
          </Typography>
        </Box>

        <Stepper activeStep={step} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ textAlign: 'center', py: 3 }}>
          <CircularProgress size={60} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {step < steps.length ? steps[step] : 'Finalisation en cours...'}
          </Typography>
        </Box>

        {step === 4 && (
          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              Vous allez être redirigé vers Stripe pour configurer votre compte bancaire.
              Cela permettra de recevoir vos paiements.
            </Typography>
          </Alert>
        )}
      </Paper>
    </Container>
  );
};

export default PractitionerPaymentSuccessPage;
