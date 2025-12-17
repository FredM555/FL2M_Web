// src/components/practitioner/StripeConnectBanner.tsx
import React, { useEffect, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Button,
  Box,
  CircularProgress,
  Collapse
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { useNavigate } from 'react-router-dom';
import { checkConnectStatus, StripeConnectStatus } from '../../services/stripeConnect';
import { logger } from '../../utils/logger';

interface StripeConnectBannerProps {
  compact?: boolean;
}

export const StripeConnectBanner: React.FC<StripeConnectBannerProps> = ({ compact = false }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StripeConnectStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const connectStatus = await checkConnectStatus();
      setStatus(connectStatus);
    } catch (error) {
      logger.error('Erreur chargement statut Connect:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!status || dismissed) {
    return null;
  }

  // Si le compte est complet et peut recevoir des paiements
  if (status.status === 'complete' && status.canReceivePayments) {
    if (compact) return null; // Ne rien afficher en mode compact si tout est OK

    return (
      <Alert
        severity="success"
        icon={<CheckCircleIcon />}
        sx={{ mb: 3 }}
        onClose={() => setDismissed(true)}
      >
        <AlertTitle>Compte de paiement actif</AlertTitle>
        Votre compte Stripe Connect est configuré. Vous pouvez recevoir des paiements.
      </Alert>
    );
  }

  // Si le compte n'existe pas
  if (status.status === 'not_created') {
    return (
      <Collapse in={!dismissed}>
        <Alert
          severity="error"
          icon={<WarningIcon />}
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => navigate('/intervenant/stripe-connect')}
            >
              Configurer
            </Button>
          }
          onClose={() => setDismissed(true)}
        >
          <AlertTitle>Action requise : Configurez votre compte de paiement</AlertTitle>
          {compact ? (
            'Vous devez configurer votre compte bancaire pour recevoir vos paiements.'
          ) : (
            <>
              Vous ne pouvez pas encore recevoir de paiements. Configurez votre compte Stripe Connect
              pour que les paiements de vos rendez-vous soient transférés automatiquement sur votre compte bancaire.
            </>
          )}
        </Alert>
      </Collapse>
    );
  }

  // Si le compte existe mais est incomplet
  if (status.status === 'incomplete' || (status.requiresAction && !status.canReceivePayments)) {
    return (
      <Collapse in={!dismissed}>
        <Alert
          severity="warning"
          icon={<AccountBalanceIcon />}
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => navigate('/intervenant/stripe-connect')}
            >
              Compléter
            </Button>
          }
          onClose={() => setDismissed(true)}
        >
          <AlertTitle>Configuration incomplète</AlertTitle>
          {compact ? (
            'Complétez la configuration de votre compte de paiement.'
          ) : (
            <>
              La configuration de votre compte Stripe Connect n'est pas terminée.
              Complétez les informations manquantes pour commencer à recevoir des paiements.
            </>
          )}
        </Alert>
      </Collapse>
    );
  }

  // Si le compte est en attente de vérification
  if (status.status === 'pending') {
    if (compact) return null;

    return (
      <Alert
        severity="info"
        sx={{ mb: 3 }}
        onClose={() => setDismissed(true)}
      >
        <AlertTitle>Vérification en cours</AlertTitle>
        Votre compte est en cours de vérification par Stripe. Vous recevrez un email une fois la vérification terminée.
      </Alert>
    );
  }

  return null;
};
