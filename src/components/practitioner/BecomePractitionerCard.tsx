// src/components/practitioner/BecomePractitionerCard.tsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Alert,
  Chip,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Divider
} from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CancelIcon from '@mui/icons-material/Cancel';
import {
  createPractitionerRequest,
  getMyPractitionerRequest,
  updateMyPractitionerRequest,
  PractitionerRequest
} from '../../services/supabase';

interface BecomePractitionerCardProps {
  onRequestStatusChange?: () => void;
}

const BecomePractitionerCard: React.FC<BecomePractitionerCardProps> = ({ onRequestStatusChange }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingRequest, setLoadingRequest] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [existingRequest, setExistingRequest] = useState<PractitionerRequest | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  // Champs du formulaire
  const [motivation, setMotivation] = useState('');
  const [experience, setExperience] = useState('');
  const [certifications, setCertifications] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [summary, setSummary] = useState('');

  const steps = ['Motivation', 'Expérience', 'Profil Public'];

  useEffect(() => {
    loadExistingRequest();
  }, []);

  const loadExistingRequest = async () => {
    setLoadingRequest(true);
    try {
      const { data, error } = await getMyPractitionerRequest();
      if (error) throw error;

      if (data) {
        setExistingRequest(data);
        // Pré-remplir le formulaire si la demande est en attente
        if (data.status === 'pending') {
          setMotivation(data.motivation || '');
          setExperience(data.experience || '');
          setCertifications(data.certifications || '');
          setSpecialties(data.specialties || '');
          setDisplayName(data.proposed_display_name || '');
          setTitle(data.proposed_title || '');
          setBio(data.proposed_bio || '');
          setSummary(data.proposed_summary || '');
        }
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement de la demande:', err);
    } finally {
      setLoadingRequest(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    setOpen(false);
    setActiveStep(0);
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    if (!motivation.trim()) {
      setError('La motivation est requise');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const requestData = {
        motivation: motivation.trim(),
        experience: experience.trim() || undefined,
        certifications: certifications.trim() || undefined,
        specialties: specialties.trim() || undefined,
        proposed_display_name: displayName.trim() || undefined,
        proposed_title: title.trim() || undefined,
        proposed_bio: bio.trim() || undefined,
        proposed_summary: summary.trim() || undefined,
      };

      let result;
      if (existingRequest && existingRequest.status === 'pending') {
        // Mise à jour de la demande existante
        result = await updateMyPractitionerRequest(existingRequest.id, requestData);
      } else {
        // Nouvelle demande
        result = await createPractitionerRequest(requestData);
      }

      if (result.error) throw result.error;

      setSuccess(true);
      await loadExistingRequest();
      if (onRequestStatusChange) onRequestStatusChange();

      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la soumission de la demande');
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = () => {
    if (!existingRequest) return null;

    const statusConfig = {
      pending: {
        label: 'En attente',
        color: 'warning' as const,
        icon: <HourglassEmptyIcon />,
        message: 'Votre demande est en cours d\'examen par notre équipe.'
      },
      approved: {
        label: 'Approuvée',
        color: 'success' as const,
        icon: <CheckCircleIcon />,
        message: 'Félicitations ! Votre demande a été approuvée.'
      },
      rejected: {
        label: 'Refusée',
        color: 'error' as const,
        icon: <CancelIcon />,
        message: 'Votre demande a été refusée.'
      }
    };

    const config = statusConfig[existingRequest.status];

    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Chip
            icon={config.icon}
            label={config.label}
            color={config.color}
            size="small"
          />
        </Box>
        <Typography variant="body2" color="text.secondary">
          {config.message}
        </Typography>
        {existingRequest.admin_notes && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Note de l'administrateur :</Typography>
            <Typography variant="body2">{existingRequest.admin_notes}</Typography>
          </Alert>
        )}
      </Box>
    );
  };

  if (loadingRequest) {
    return (
      <Card
        elevation={0}
        sx={{
          background: 'white',
          border: '2px solid rgba(255, 215, 0, 0.3)',
          borderRadius: 3
        }}
      >
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </CardContent>
      </Card>
    );
  }

  // Masquer la carte si la demande a été approuvée (l'utilisateur est maintenant intervenant)
  if (existingRequest?.status === 'approved') {
    return null;
  }

  return (
    <>
      <Card
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, rgba(52, 89, 149, 0.05) 0%, rgba(29, 52, 97, 0.05) 100%)',
          border: '2px solid rgba(52, 89, 149, 0.2)',
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #345995, #1D3461)',
          },
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <WorkIcon sx={{ fontSize: 32, color: '#345995', mr: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1D3461' }}>
              Devenir Intervenant
            </Typography>
          </Box>

          {existingRequest ? (
            <>
              {getStatusDisplay()}
              {existingRequest.status === 'pending' && (
                <Button
                  variant="outlined"
                  onClick={handleOpen}
                  sx={{
                    mt: 2,
                    borderColor: '#345995',
                    color: '#345995',
                    '&:hover': {
                      borderColor: '#1D3461',
                      background: 'rgba(52, 89, 149, 0.05)',
                    },
                  }}
                >
                  Modifier ma demande
                </Button>
              )}
              {existingRequest.status === 'rejected' && (
                <Button
                  variant="contained"
                  onClick={handleOpen}
                  startIcon={<SendIcon />}
                  sx={{
                    mt: 2,
                    background: 'linear-gradient(45deg, #345995, #1D3461)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #1D3461, #345995)',
                    },
                  }}
                >
                  Soumettre une nouvelle demande
                </Button>
              )}
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" paragraph>
                Vous êtes thérapeute, coach ou consultant ? Rejoignez notre équipe d'intervenants professionnels.
              </Typography>
              <Button
                variant="contained"
                onClick={handleOpen}
                startIcon={<WorkIcon />}
                sx={{
                  background: 'linear-gradient(45deg, #345995, #1D3461)',
                  color: 'white',
                  fontWeight: 600,
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1D3461, #345995)',
                  },
                }}
              >
                Faire une demande
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog du formulaire */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #345995 0%, #1D3461 100%)', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <WorkIcon sx={{ mr: 1 }} />
            {existingRequest?.status === 'pending' ? 'Modifier ma demande' : 'Devenir Intervenant'}
          </Box>
        </DialogTitle>

        <DialogContent sx={{ mt: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }} icon={<CheckCircleIcon />}>
              Demande soumise avec succès ! Vous recevrez une réponse par email.
            </Alert>
          )}

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Étape 1: Motivation */}
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Parlez-nous de votre motivation
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <TextField
                label="Motivation *"
                multiline
                rows={4}
                fullWidth
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                placeholder="Pourquoi souhaitez-vous devenir intervenant chez nous ?"
                required
                sx={{ mb: 3 }}
              />

              <TextField
                label="Domaines d'expertise"
                multiline
                rows={3}
                fullWidth
                value={specialties}
                onChange={(e) => setSpecialties(e.target.value)}
                placeholder="Ex: Thérapie de couple, gestion du stress, coaching professionnel..."
                helperText="Les domaines dans lesquels vous intervenez"
              />
            </Box>
          )}

          {/* Étape 2: Expérience */}
          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Votre parcours professionnel
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <TextField
                label="Expérience professionnelle"
                multiline
                rows={4}
                fullWidth
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="Décrivez votre expérience professionnelle pertinente..."
                sx={{ mb: 3 }}
              />

              <TextField
                label="Certifications et diplômes"
                multiline
                rows={3}
                fullWidth
                value={certifications}
                onChange={(e) => setCertifications(e.target.value)}
                placeholder="Ex: Master en Psychologie, Certification PNL, Formation Gestalt..."
                helperText="Vos qualifications et certifications"
              />
            </Box>
          )}

          {/* Étape 3: Profil Public */}
          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Votre profil public
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Ces informations seront affichées sur votre fiche intervenant (vous pourrez les modifier plus tard)
              </Typography>

              <TextField
                label="Nom d'affichage"
                fullWidth
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Comment souhaitez-vous être appelé ?"
                sx={{ mb: 2 }}
              />

              <TextField
                label="Titre professionnel"
                fullWidth
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Psychothérapeute certifié, Coach de vie..."
                sx={{ mb: 2 }}
              />

              <TextField
                label="Résumé (pitch court)"
                multiline
                rows={2}
                fullWidth
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Une phrase d'accroche pour votre profil..."
                inputProps={{ maxLength: 250 }}
                helperText={`${summary.length}/250 caractères`}
                sx={{ mb: 2 }}
              />

              <TextField
                label="Biographie complète"
                multiline
                rows={4}
                fullWidth
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Présentez-vous de manière détaillée..."
                helperText="Votre parcours, votre approche, ce qui vous caractérise..."
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          {activeStep > 0 && (
            <Button onClick={handleBack} disabled={loading}>
              Retour
            </Button>
          )}
          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={activeStep === 0 && !motivation.trim()}
              sx={{
                background: 'linear-gradient(45deg, #345995, #1D3461)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1D3461, #345995)',
                },
              }}
            >
              Suivant
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading || !motivation.trim()}
              startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
              sx={{
                background: 'linear-gradient(45deg, #345995, #1D3461)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1D3461, #345995)',
                },
              }}
            >
              {loading ? 'Envoi...' : 'Soumettre'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BecomePractitionerCard;
