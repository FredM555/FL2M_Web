import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Button,
  Tabs,
  Tab,
  Badge,
  TextField,
  InputAdornment,
  IconButton,
  Snackbar
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import PersonIcon from '@mui/icons-material/Person';
import PaymentIcon from '@mui/icons-material/Payment';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PreviewIcon from '@mui/icons-material/Preview';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import { useAuth } from '../context/AuthContext';
import { PractitionerProfileForm } from '../components/practitioner/PractitionerProfileForm';
import { UserRoleBadge } from '../components/profile/UserRoleBadge';
import {
  Practitioner,
  getMyPractitionerProfile,
  updateMyPractitionerProfile
} from '../services/supabase';
import SacredGeometryBackground from '../components/SacredGeometryBackground';
import SubscriptionManagement from '../components/practitioner/SubscriptionManagement';
import PractitionerTransactions from '../components/practitioner/PractitionerTransactions';
import PractitionerProfilePreview from '../components/practitioner/PractitionerProfilePreview';
import { StripeAccountStatus } from '../components/practitioner/StripeAccountStatus';
import { checkConnectStatus, StripeConnectStatus } from '../services/stripeConnect';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const PractitionerProfilePage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [practitioner, setPractitioner] = useState<Practitioner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus | null>(null);
  const [copySnackbarOpen, setCopySnackbarOpen] = useState(false);

  useEffect(() => {
    loadPractitionerProfile();
    loadStripeStatus();
  }, []);

  const loadStripeStatus = async () => {
    try {
      const status = await checkConnectStatus();
      setStripeStatus(status);
    } catch (err) {
      console.error('Erreur chargement statut Stripe:', err);
    }
  };

  const loadPractitionerProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await getMyPractitionerProfile();

      if (fetchError) {
        throw fetchError;
      }

      if (!data) {
        setError('Aucun profil intervenant trouvé. Contactez un administrateur.');
        return;
      }

      setPractitioner(data);
    } catch (err: any) {
      console.error('Erreur lors du chargement du profil:', err);
      setError(err.message || 'Erreur lors du chargement du profil intervenant');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updates: {
    bio?: string;
    display_name?: string;
    title?: string;
    summary?: string;
  }) => {
    const { data, error: updateError } = await updateMyPractitionerProfile(updates);

    if (updateError) {
      throw updateError;
    }

    if (data) {
      setPractitioner(data);
    }
  };

  const handleUpdateVisibility = async (visible: boolean) => {
    const { data, error: updateError } = await updateMyPractitionerProfile({ profile_visible: visible });

    if (updateError) {
      throw updateError;
    }

    if (data) {
      setPractitioner(data);
    }
  };

  // Générer le lien public de l'intervenant
  const getPublicLink = () => {
    if (!practitioner) return '';
    // Utiliser le slug si disponible, sinon l'ID
    const identifier = practitioner.slug || practitioner.id;
    return `https://www.fl2m.fr/consultants/${identifier}`;
  };

  // Copier le lien dans le presse-papier
  const handleCopyLink = async () => {
    const link = getPublicLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopySnackbarOpen(true);
    } catch (err) {
      console.error('Erreur lors de la copie du lien:', err);
    }
  };

  // Vérifier que l'utilisateur est bien un intervenant
  if (profile && profile.user_type !== 'intervenant' && profile.user_type !== 'admin') {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Cette page est réservée aux intervenants. Vous n'avez pas les permissions nécessaires.
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/profile')}
          sx={{ mt: 2 }}
        >
          Retour au profil
        </Button>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Chargement de votre profil intervenant...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/profile')}
        >
          Retour au profil
        </Button>
      </Container>
    );
  }

  if (!practitioner) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          Aucun profil intervenant trouvé.
        </Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ width: '100%', position: 'relative', minHeight: '100vh' }}>
      {/* Image de fond */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          backgroundImage: {
            xs: 'none',
            md: 'url(/images/MesRendezVous.jpg)'
          },
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.7,
          pointerEvents: 'none',
        }}
      />
      {/* Overlay */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          background: 'linear-gradient(180deg, rgba(248, 249, 250, 0.3) 0%, rgba(233, 236, 239, 0.35) 50%, rgba(222, 226, 230, 0.4) 100%)',
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          background: 'rgba(245, 247, 250, 0.6)',
          backdropFilter: 'blur(2px)',
          py: { xs: 2, md: 4 },
          mt: { xs: '80px', md: '40px' },
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Container maxWidth="lg">
          {/* En-tête */}
          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              mb: 3,
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
            }}
          >
            <Box
              sx={{
                background: 'linear-gradient(135deg, #345995 0%, #1D3461 100%)',
                color: 'white',
                p: 3,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <SacredGeometryBackground theme="particuliers" />
              <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography
                      variant="h2"
                      component="h1"
                      sx={{
                        fontWeight: 700,
                        fontSize: { xs: '1.5rem', md: '2.5rem' },
                        background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 2px 8px rgba(255, 215, 0, 0.3))',
                        mb: 1,
                      }}
                    >
                      Mon Profil Intervenant
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 400,
                        color: 'rgba(255, 255, 255, 0.9)',
                        lineHeight: 1.7,
                      }}
                    >
                      Gérez vos informations professionnelles
                    </Typography>
                  </Box>
                  {profile && (
                    <UserRoleBadge userType={profile.user_type} size="medium" />
                  )}
                </Box>
              </Container>
            </Box>
          </Box>

          {/* Bouton retour */}
          <Box sx={{ mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/profile')}
              sx={{
                borderColor: '#FFA500',
                color: '#FFA500',
                '&:hover': {
                  borderColor: '#FF8C00',
                  backgroundColor: 'rgba(255, 165, 0, 0.08)',
                },
              }}
            >
              Retour au profil
            </Button>
          </Box>

          {/* Onglets */}
          <Paper
            elevation={0}
            sx={{
              background: 'white',
              border: '2px solid rgba(255, 215, 0, 0.3)',
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
                background: 'linear-gradient(90deg, #FFD700, #FFA500)',
              },
              mb: 3,
            }}
          >
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                px: 2,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  minHeight: 64,
                  '&.Mui-selected': {
                    color: '#FFA500',
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#FFA500',
                  height: 3,
                },
              }}
            >
              <Tab icon={<PersonIcon />} label="Mon Profil" iconPosition="start" />
              <Tab icon={<PreviewIcon />} label="Aperçu" iconPosition="start" />
              <Tab icon={<PaymentIcon />} label="Mon Abonnement" iconPosition="start" />
              <Tab
                icon={
                  <Badge
                    variant="dot"
                    color={
                      stripeStatus?.status === 'complete' && stripeStatus?.canReceivePayments
                        ? 'success'
                        : stripeStatus?.status === 'not_created'
                        ? 'error'
                        : 'warning'
                    }
                  >
                    <AccountBalanceIcon />
                  </Badge>
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Compte bancaire
                    {stripeStatus?.status === 'complete' && stripeStatus?.canReceivePayments && (
                      <Box
                        component="span"
                        sx={{
                          fontSize: '0.7rem',
                          color: 'success.main',
                          fontWeight: 600
                        }}
                      >
                        ✓
                      </Box>
                    )}
                  </Box>
                }
                iconPosition="start"
              />
              <Tab icon={<ReceiptIcon />} label="Mes Transactions" iconPosition="start" />
            </Tabs>

            <Box sx={{ p: 3 }}>
              <TabPanel value={tabValue} index={0}>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Vous pouvez modifier votre nom d'affichage, titre, résumé et biographie. Les autres informations
                  (nom, prénom, email, statut) sont gérées par les administrateurs.
                </Alert>

                <PractitionerProfileForm
                  practitioner={practitioner}
                  onSave={handleSave}
                  loading={loading}
                />
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <PractitionerProfilePreview
                  practitioner={practitioner}
                  onUpdateVisibility={handleUpdateVisibility}
                  getPublicLink={getPublicLink}
                  onCopyLink={handleCopyLink}
                />
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <SubscriptionManagement practitionerId={practitioner.id} />
              </TabPanel>

              <TabPanel value={tabValue} index={3}>
                <StripeAccountStatus />
              </TabPanel>

              <TabPanel value={tabValue} index={4}>
                <PractitionerTransactions practitionerId={practitioner.id} />
              </TabPanel>
            </Box>
          </Paper>
        </Container>
      </Box>

      {/* Snackbar de confirmation de copie */}
      <Snackbar
        open={copySnackbarOpen}
        autoHideDuration={3000}
        onClose={() => setCopySnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message="Lien copié dans le presse-papier !"
      />
    </Box>
  );
};

export default PractitionerProfilePage;
