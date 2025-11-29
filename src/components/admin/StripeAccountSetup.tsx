// src/components/admin/StripeAccountSetup.tsx
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  Chip,
  Divider,
  Grid,
  CircularProgress,
  IconButton,
  Collapse
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import LinkIcon from '@mui/icons-material/Link';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface StripeAccountSetupProps {
  practitionerId: string;
  stripeAccountId?: string | null;
  onAccountLinked?: (accountId: string) => void;
  disabled?: boolean;
}

const StripeAccountSetup: React.FC<StripeAccountSetupProps> = ({
  practitionerId,
  stripeAccountId,
  onAccountLinked,
  disabled = false
}) => {
  const [loading, setLoading] = useState(false);
  const [manualAccountId, setManualAccountId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const isLinked = Boolean(stripeAccountId);

  const handleCreateStripeAccount = async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Appel API pour créer un compte Stripe Connect
      // Cette fonctionnalité nécessite une intégration backend avec Stripe

      // Simulation pour le moment
      await new Promise(resolve => setTimeout(resolve, 2000));

      // const response = await fetch('/api/stripe/create-connect-account', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ practitionerId })
      // });

      // if (!response.ok) throw new Error('Erreur lors de la création du compte');
      // const data = await response.json();

      setError('Fonctionnalité en cours de développement - Veuillez utiliser l\'ID de compte manuel');

    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du compte Stripe');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkAccount = async () => {
    if (!manualAccountId.trim()) {
      setError('Veuillez entrer un ID de compte Stripe');
      return;
    }

    // Validation basique de l'ID Stripe (commence par 'acct_')
    if (!manualAccountId.startsWith('acct_')) {
      setError('L\'ID de compte Stripe doit commencer par "acct_"');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // TODO: Appel API pour lier le compte
      // await linkStripeAccount(practitionerId, manualAccountId);

      // Simulation
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (onAccountLinked) {
        onAccountLinked(manualAccountId);
      }

      alert('Compte Stripe lié avec succès !');

    } catch (err: any) {
      setError(err.message || 'Erreur lors de la liaison du compte');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = () => {
    if (stripeAccountId) {
      navigator.clipboard.writeText(stripeAccountId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  if (isLinked) {
    return (
      <Card
        sx={{
          border: '2px solid',
          borderColor: 'success.main',
          backgroundColor: 'rgba(102, 187, 106, 0.05)'
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 32, color: 'success.main' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Compte Stripe Connect configuré
              </Typography>
              <Chip
                label="Actif"
                color="success"
                size="small"
                sx={{ mt: 0.5 }}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                ID du compte Stripe
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="body1"
                  sx={{
                    fontFamily: 'monospace',
                    backgroundColor: 'rgba(0,0,0,0.05)',
                    p: 1,
                    borderRadius: 1,
                    flex: 1
                  }}
                >
                  {stripeAccountId}
                </Typography>
                <IconButton
                  size="small"
                  onClick={handleCopyId}
                  color={copySuccess ? 'success' : 'default'}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
              {copySuccess && (
                <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                  Copié !
                </Typography>
              )}
            </Grid>
          </Grid>

          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Le praticien peut maintenant recevoir des paiements via Stripe
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        border: '2px dashed',
        borderColor: 'warning.main',
        backgroundColor: 'rgba(255, 167, 38, 0.05)'
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <WarningIcon sx={{ fontSize: 32, color: 'warning.main' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Configuration Stripe Connect requise
            </Typography>
            <Chip
              label="Non configuré"
              color="warning"
              size="small"
              sx={{ mt: 0.5 }}
            />
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Pour recevoir des paiements, le praticien doit avoir un compte Stripe Connect.
            {' '}Vous pouvez créer un nouveau compte ou lier un compte existant.
          </Typography>
        </Alert>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <PaymentIcon />}
            onClick={handleCreateStripeAccount}
            disabled={disabled || loading}
            fullWidth
            sx={{
              background: 'linear-gradient(45deg, #635BFF, #0A2540)',
              '&:hover': {
                background: 'linear-gradient(45deg, #0A2540, #635BFF)'
              }
            }}
          >
            {loading ? 'Création en cours...' : 'Créer un compte Stripe Connect'}
          </Button>

          <Button
            variant="text"
            onClick={() => setExpanded(!expanded)}
            endIcon={
              <ExpandMoreIcon
                sx={{
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform 0.3s'
                }}
              />
            }
          >
            Lier un compte existant
          </Button>

          <Collapse in={expanded}>
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" paragraph>
                Si le praticien possède déjà un compte Stripe Connect, vous pouvez entrer son ID ici :
              </Typography>

              <TextField
                label="ID de compte Stripe"
                placeholder="acct_XXXXXXXXXX"
                fullWidth
                value={manualAccountId}
                onChange={(e) => setManualAccountId(e.target.value)}
                disabled={disabled || loading}
                helperText="L'ID commence par 'acct_'"
                sx={{ mb: 2 }}
              />

              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <LinkIcon />}
                onClick={handleLinkAccount}
                disabled={disabled || loading || !manualAccountId.trim()}
                fullWidth
              >
                {loading ? 'Liaison en cours...' : 'Lier le compte'}
              </Button>
            </Box>
          </Collapse>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="caption" color="text.secondary" display="block">
          ℹ️ <strong>Note:</strong> La création automatique de compte Stripe Connect nécessite une configuration backend.
          En attendant, vous pouvez créer manuellement un compte sur{' '}
          <a
            href="https://dashboard.stripe.com/connect/accounts"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#635BFF' }}
          >
            le dashboard Stripe
          </a>
          {' '}et lier l'ID ici.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default StripeAccountSetup;
