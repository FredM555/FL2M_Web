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
import { useNavigate, useSearchParams } from 'react-router-dom';

const AppointmentPaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);

  const appointmentId = searchParams.get('appointmentId');

  useEffect(() => {
    // Attendre quelques secondes pour que le webhook Stripe traite le paiement
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h5" color="text.secondary">
          Validation de votre paiement en cours...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
        <CheckCircleIcon sx={{ fontSize: 100, color: 'success.main', mb: 3 }} />

        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
          Paiement réussi !
        </Typography>

        <Typography variant="h6" color="text.secondary" paragraph>
          Votre rendez-vous est maintenant confirmé
        </Typography>

        <Alert severity="success" sx={{ mt: 3, mb: 3 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Vous recevrez un email de confirmation avec tous les détails de votre rendez-vous.
          </Typography>
          <Typography variant="body2">
            <strong>Important :</strong> Pensez à valider que la séance s'est bien déroulée après votre rendez-vous pour que l'intervenant soit payé immédiatement !
          </Typography>
        </Alert>

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
        </Box>
      </Paper>
    </Container>
  );
};

export default AppointmentPaymentSuccessPage;
