// src/pages/PractitionerOnboardingPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ContractTypeSelector from '../components/admin/ContractTypeSelector';
import { ContractType } from '../types/payments';
import {
  getAllPractitionerRequests,
  completePractitionerOnboarding,
  PractitionerRequest
} from '../services/supabase';

const steps = ['Bienvenue', 'Choix du contrat', 'Confirmation'];

const PractitionerOnboardingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedContractType, setSelectedContractType] = useState<ContractType>('free');
  const [request, setRequest] = useState<PractitionerRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequest();
  }, [user]);

  const loadRequest = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await getAllPractitionerRequests();
      if (error) throw error;

      // Trouver la demande pre_approved de l'utilisateur
      const userRequest = data?.find(
        r => r.user_id === user.id && r.status === 'pre_approved'
      );

      if (!userRequest) {
        // Pas de demande pre_approved, rediriger vers dashboard
        setError("Aucune demande d'intervenant en cours de finalisation.");
        setTimeout(() => navigate('/'), 3000);
        return;
      }

      setRequest(userRequest);
    } catch (err: any) {
      console.error('Erreur lors du chargement de la demande:', err);
      setError(err.message || 'Erreur lors du chargement de la demande');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleFinalize = async () => {
    if (!request) return;

    setSubmitting(true);
    setError(null);

    try {
      const { data, error } = await completePractitionerOnboarding(
        request.id,
        selectedContractType
      );

      if (error) throw error;

      // Vérifier si un paiement est nécessaire
      if (selectedContractType !== 'free' && data && Array.isArray(data) && data.length > 0) {
        const result = data[0];

        // Si le contrat a été créé mais est en attente de paiement
        if (result.contract_id) {
          // Rediriger vers la page de paiement
          navigate(`/practitioner-payment?contractId=${result.contract_id}&contractType=${selectedContractType}`);
          return;
        }
      }

      // Succès! (pour FREE ou si le paiement n'est pas requis)
      // Le profil se mettra à jour automatiquement via le listener auth
      setActiveStep(steps.length);
      setTimeout(() => {
        navigate('/practitioner/profile');
      }, 3000);
    } catch (err: any) {
      console.error('Erreur lors de la finalisation:', err);
      setError(err.message || 'Erreur lors de la finalisation de l\'inscription');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <RocketLaunchIcon sx={{ fontSize: 80, color: 'primary.main', mb: 3 }} />
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
              Félicitations ! 🎉
            </Typography>
            <Typography variant="h6" color="text.secondary" paragraph>
              Votre demande a été validée par notre équipe
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Il ne vous reste plus qu'à choisir votre type de contrat pour finaliser votre inscription
              en tant qu'intervenant sur FLM Services.
            </Typography>

            {request && (
              <Card sx={{ mt: 4, maxWidth: 600, mx: 'auto', textAlign: 'left' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Votre profil proposé
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  {request.proposed_display_name && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Nom d'affichage
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {request.proposed_display_name}
                      </Typography>
                    </Box>
                  )}
                  {request.proposed_title && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Titre professionnel
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {request.proposed_title}
                      </Typography>
                    </Box>
                  )}
                  {request.specialties && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Spécialités
                      </Typography>
                      <Typography variant="body1">
                        {request.specialties}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            <Button
              variant="contained"
              size="large"
              onClick={handleNext}
              sx={{ mt: 4 }}
            >
              Continuer
            </Button>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ py: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}>
              Choisissez votre type de contrat
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
              Sélectionnez l'offre qui correspond le mieux à votre activité
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Vous avez le choix !</strong> Sélectionnez librement le contrat qui vous convient.
                Vous pourrez toujours changer de formule plus tard si nécessaire.
              </Typography>
            </Alert>

            <ContractTypeSelector
              value={selectedContractType}
              onChange={setSelectedContractType}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button onClick={handleBack}>
                Retour
              </Button>
              <Button
                variant="contained"
                onClick={handleNext}
              >
                Continuer
              </Button>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
              Confirmation
            </Typography>

            <Card sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Récapitulatif de votre inscription
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Box sx={{ textAlign: 'left', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Type de contrat sélectionné
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                    {selectedContractType === 'free' && '🎁 Sans Engagement'}
                    {selectedContractType === 'starter' && '💼 Starter'}
                    {selectedContractType === 'pro' && '⭐ Pro'}
                    {selectedContractType === 'premium' && '👑 Premium'}
                  </Typography>
                </Box>

                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Une fois validé, vous pourrez accéder à votre espace intervenant et :
                  </Typography>
                  <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                    <li>Configurer votre profil public</li>
                    <li>Connecter votre compte Stripe pour recevoir les paiements</li>
                    <li>Créer vos services et prestations</li>
                    <li>Définir vos disponibilités</li>
                    <li>Commencer à recevoir des rendez-vous</li>
                  </ul>
                </Alert>
              </CardContent>
            </Card>

            {error && (
              <Alert severity="error" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', maxWidth: 600, mx: 'auto' }}>
              <Button onClick={handleBack} disabled={submitting}>
                Retour
              </Button>
              <Button
                variant="contained"
                size="large"
                onClick={handleFinalize}
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={20} /> : <CheckCircleIcon />}
              >
                {submitting ? 'Finalisation...' : 'Finaliser mon inscription'}
              </Button>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          Chargement...
        </Typography>
      </Container>
    );
  }

  if (error && !request) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Redirection en cours...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        {activeStep === steps.length ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CheckCircleIcon sx={{ fontSize: 100, color: 'success.main', mb: 3 }} />
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
              Inscription finalisée avec succès ! 🎉
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Bienvenue dans la communauté FLM Services !
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Redirection vers votre espace intervenant...
            </Typography>
            <CircularProgress sx={{ mt: 3 }} />
          </Box>
        ) : (
          <>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {renderStepContent(activeStep)}
          </>
        )}
      </Paper>
    </Container>
  );
};

export default PractitionerOnboardingPage;
