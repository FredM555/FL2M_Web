// src/components/practitioner/StripeAccountStatus.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import { useNavigate } from 'react-router-dom';
import { checkConnectStatus, StripeConnectStatus } from '../../services/stripeConnect';
import { logger } from '../../utils/logger';

export const StripeAccountStatus: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StripeConnectStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const connectStatus = await checkConnectStatus();
      setStatus(connectStatus);
    } catch (err: any) {
      logger.error('Erreur chargement statut Connect:', err);
      setError(err.message || 'Erreur lors de la vérification du statut');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  if (!status) {
    return null;
  }

  // Si le compte est complet et opérationnel
  if (status.status === 'complete' && status.canReceivePayments) {
    return (
      <Box>
        <Card
          sx={{
            mb: 3,
            background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
            border: '2px solid #4caf50',
            boxShadow: '0 4px 20px rgba(76, 175, 80, 0.2)'
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mr: 2 }} />
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.dark' }}>
                    Compte bancaire actif
                  </Typography>
                  <Chip
                    label="Opérationnel"
                    color="success"
                    size="small"
                    icon={<CheckCircleIcon />}
                  />
                </Box>
                <Typography variant="body1" color="text.secondary">
                  Votre compte Stripe Connect est configuré et vous pouvez recevoir des paiements
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Informations sur les paiements :
            </Typography>

            <List dense>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 30 }}>
                  <CheckCircleIcon color="success" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Les paiements sont transférés automatiquement sur votre compte bancaire"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 30 }}>
                  <CheckCircleIcon color="success" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Immédiatement si le client valide la séance"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 30 }}>
                  <CheckCircleIcon color="success" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="48h après le rendez-vous si pas de validation"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 30 }}>
                  <CheckCircleIcon color="success" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Vos transactions sont visibles dans l'onglet 'Mes Transactions'"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            </List>

            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button
                variant="outlined"
                color="success"
                onClick={() => navigate('/intervenant/stripe-connect')}
              >
                Gérer mon compte Stripe
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Alert severity="info" icon={<InfoIcon />}>
          <Typography variant="body2">
            <strong>Note :</strong> Vos informations bancaires sont sécurisées par Stripe et ne sont jamais stockées sur nos serveurs.
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Si le compte n'existe pas
  if (status.status === 'not_created') {
    return (
      <Box>
        <Card
          sx={{
            mb: 3,
            background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
            border: '2px solid #f44336',
            boxShadow: '0 4px 20px rgba(244, 67, 54, 0.2)'
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ErrorIcon sx={{ fontSize: 60, color: 'error.main', mr: 2 }} />
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.dark' }}>
                    Compte bancaire non configuré
                  </Typography>
                  <Chip
                    label="Action requise"
                    color="error"
                    size="small"
                    icon={<WarningIcon />}
                  />
                </Box>
                <Typography variant="body1" color="text.secondary">
                  Vous devez configurer votre compte bancaire pour recevoir vos paiements
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                ⚠️ Sans compte bancaire configuré :
              </Typography>
              <Typography variant="body2">
                Vous ne pouvez pas recevoir de paiements pour vos rendez-vous.
                Les clients ne pourront pas réserver avec vous.
              </Typography>
            </Alert>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Ce que vous devez préparer :
            </Typography>

            <List dense>
              <ListItem>
                <ListItemIcon>
                  <AccountBalanceIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Votre IBAN (RIB)"
                  secondary="Le compte bancaire où vous souhaitez recevoir vos paiements"
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AccountBalanceIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Pièce d'identité"
                  secondary="Carte d'identité, passeport ou permis de conduire"
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AccountBalanceIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Informations personnelles"
                  secondary="Adresse, date de naissance, numéro de téléphone"
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
              </ListItem>
            </List>

            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button
                variant="contained"
                color="error"
                size="large"
                startIcon={<AccountBalanceIcon />}
                onClick={() => navigate('/intervenant/stripe-connect')}
              >
                Configurer mon compte bancaire
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Alert severity="info" icon={<InfoIcon />}>
          <Typography variant="body2">
            <strong>🔒 Sécurité :</strong> Vos informations bancaires sont sécurisées par Stripe
            (certifié PCI-DSS niveau 1) et ne sont jamais stockées sur nos serveurs.
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Si le compte existe mais est incomplet
  if (status.status === 'incomplete' || (status.requiresAction && !status.canReceivePayments)) {
    return (
      <Box>
        <Card
          sx={{
            mb: 3,
            background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
            border: '2px solid #ff9800',
            boxShadow: '0 4px 20px rgba(255, 152, 0, 0.2)'
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <WarningIcon sx={{ fontSize: 60, color: 'warning.main', mr: 2 }} />
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'warning.dark' }}>
                    Configuration incomplète
                  </Typography>
                  <Chip
                    label="À compléter"
                    color="warning"
                    size="small"
                    icon={<WarningIcon />}
                  />
                </Box>
                <Typography variant="body1" color="text.secondary">
                  La configuration de votre compte Stripe Connect n'est pas terminée
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Complétez les informations manquantes pour commencer à recevoir des paiements.
              </Typography>
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button
                variant="contained"
                color="warning"
                size="large"
                startIcon={<AccountBalanceIcon />}
                onClick={() => navigate('/intervenant/stripe-connect')}
              >
                Compléter la configuration
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Alert severity="info" icon={<InfoIcon />}>
          <Typography variant="body2">
            Vous serez redirigé vers Stripe pour compléter les informations manquantes.
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Si le compte est en attente de vérification
  if (status.status === 'pending') {
    return (
      <Box>
        <Card
          sx={{
            mb: 3,
            background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
            border: '2px solid #2196f3',
            boxShadow: '0 4px 20px rgba(33, 150, 243, 0.2)'
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <InfoIcon sx={{ fontSize: 60, color: 'info.main', mr: 2 }} />
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'info.dark' }}>
                    Vérification en cours
                  </Typography>
                  <Chip
                    label="En attente"
                    color="info"
                    size="small"
                    icon={<InfoIcon />}
                  />
                </Box>
                <Typography variant="body1" color="text.secondary">
                  Votre compte est en cours de vérification par Stripe
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Alert severity="info">
              <Typography variant="body2">
                Vous recevrez un email une fois la vérification terminée. Cela peut prendre quelques heures.
              </Typography>
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button
                variant="outlined"
                color="info"
                onClick={loadStatus}
              >
                Actualiser le statut
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return null;
};
