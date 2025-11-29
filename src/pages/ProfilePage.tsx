// src/pages/ProfilePage.tsx
import { useState, useEffect } from 'react';
import {
  Avatar,
  Box,
  Button,
  Container,
  Grid,
  TextField,
  Typography,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonIcon from '@mui/icons-material/Person';
import CakeIcon from '@mui/icons-material/Cake';
import SaveIcon from '@mui/icons-material/Save';
import WorkIcon from '@mui/icons-material/Work';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SacredGeometryBackground from '../components/SacredGeometryBackground';
import { UserRoleBadge } from '../components/profile/UserRoleBadge';
import BecomePractitionerCard from '../components/practitioner/BecomePractitionerCard';
import { getUserBeneficiaries, createBeneficiary, updateBeneficiary } from '../services/beneficiaries';
import type { BeneficiaryWithAccess } from '../types/beneficiary';
import { getBeneficiaryDocuments, getSignedBeneficiaryDocumentUrl, DOCUMENT_TYPE_LABELS } from '../services/beneficiaryDocuments';
import type { BeneficiaryDocument } from '../services/beneficiaryDocuments';

const ProfilePage = () => {
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();

  // Informations de base
  const [email, setEmail] = useState(profile?.email || user?.email || '');
  const [pseudo, setPseudo] = useState(profile?.pseudo || '');
  const [phone, setPhone] = useState(profile?.phone || '');

  // Information pour la préparation des séances
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [birthDate, setBirthDate] = useState(profile?.birth_date || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Snackbar pour les messages de bénéficiaire
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Bénéficiaire "Moi"
  const [myBeneficiary, setMyBeneficiary] = useState<BeneficiaryWithAccess | null>(null);
  const [loadingBeneficiary, setLoadingBeneficiary] = useState(true);

  // Documents du bénéficiaire
  const [documents, setDocuments] = useState<BeneficiaryDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  // Charger le bénéficiaire "Moi" au chargement de la page
  useEffect(() => {
    loadMyBeneficiary();
  }, [user]);

  // Fonction pour charger le bénéficiaire "Moi"
  const loadMyBeneficiary = async () => {
    if (!user?.id) return;

    setLoadingBeneficiary(true);
    try {
      // Utiliser le service pour récupérer les bénéficiaires de l'utilisateur
      const { data: beneficiaries, error } = await getUserBeneficiaries(user.id);

      if (error) {
        console.error('Erreur lors du chargement des bénéficiaires:', error);
      } else if (beneficiaries && beneficiaries.length > 0) {
        // Trouver le bénéficiaire avec relationship = 'self'
        const selfBeneficiary = beneficiaries.find(b => b.relationship === 'self');

        if (selfBeneficiary) {
          setMyBeneficiary(selfBeneficiary);
          // Charger les documents du bénéficiaire
          loadDocuments(selfBeneficiary.id);
        }
      }
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoadingBeneficiary(false);
    }
  };

  // Fonction pour charger les documents du bénéficiaire
  const loadDocuments = async (beneficiaryId: string) => {
    setLoadingDocuments(true);
    try {
      const { data, error } = await getBeneficiaryDocuments(beneficiaryId);
      if (error) {
        console.error('Erreur lors du chargement des documents:', error);
      } else if (data) {
        setDocuments(data);
      }
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Fonction pour ouvrir un document PDF
  const handleOpenDocument = async (document: BeneficiaryDocument) => {
    try {
      const url = await getSignedBeneficiaryDocumentUrl(document.file_path);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Erreur lors de l\'ouverture du document:', err);
      setSnackbar({
        open: true,
        message: 'Impossible d\'ouvrir le document. Veuillez réessayer.',
        severity: 'error'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Mettre à jour le profil
      const { error: profileError } = await updateProfile({
        first_name: firstName,
        last_name: lastName,
        pseudo: pseudo,
        phone: phone || undefined,
        email: email || user?.email,
        birth_date: birthDate || undefined
      });

      if (profileError) throw profileError;

      // 2. Créer ou mettre à jour automatiquement le bénéficiaire "moi"
      if (firstName && lastName && birthDate && user?.id) {
        const beneficiaryData = {
          first_name: firstName,
          last_name: lastName,
          birth_date: birthDate,
          email: user.email,
          notifications_enabled: true
        };

        if (myBeneficiary) {
          // Mettre à jour le bénéficiaire existant
          const { error: beneficiaryError } = await updateBeneficiary(myBeneficiary.id, beneficiaryData, user.id);
          if (beneficiaryError) {
            console.error('Erreur lors de la mise à jour du bénéficiaire:', beneficiaryError);
          }
        } else {
          // Créer un nouveau bénéficiaire
          const { error: beneficiaryError } = await createBeneficiary(beneficiaryData, user.id);
          if (beneficiaryError) {
            console.error('Erreur lors de la création du bénéficiaire:', beneficiaryError);
          }
        }

        // Recharger le bénéficiaire pour mettre à jour l'affichage
        await loadMyBeneficiary();
      }

      setSuccess(true);
    } catch (error: any) {
      setError('Erreur lors de la mise à jour du profil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', position: 'relative', minHeight: '100vh' }}>
      {/* Image de fond - mon profil */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          backgroundImage: 'url(/images/MonProfil.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.7,
          pointerEvents: 'none',
        }}
      />
      {/* Overlay pour adoucir l'image */}
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
          py: 4,
          mt: { xs: '23px', md: '0px' },
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Container maxWidth="lg">
          {/* En-tête avec avatar et informations principales */}
          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              mb: 1,
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
            <Box
              sx={{
                display: 'flex',
                position: 'relative',
                zIndex: 2,
                alignItems: 'center',
                gap: 2.5,
              }}
            >
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                  color: '#1D3461',
                  fontWeight: 700,
                  fontSize: '2rem',
                  boxShadow: '0 8px 24px rgba(255, 215, 0, 0.4)',
                  border: '3px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                {profile?.first_name ? profile.first_name[0].toUpperCase() : <AccountCircleIcon sx={{ fontSize: '2.5rem' }} />}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    fontWeight: 700,
                    mb: 0.5,
                    fontSize: { xs: '1.5rem', md: '2rem' },
                  }}
                >
                  {profile?.first_name ? `${profile.first_name} ${profile.last_name}` : 'Mon profil'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  {pseudo && (
                    <Typography
                      variant="h6"
                      sx={{
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontWeight: 500,
                      }}
                    >
                      @{pseudo}
                    </Typography>
                  )}
                  {profile && <UserRoleBadge userType={profile.user_type} size="medium" />}
                </Box>
              </Box>
              {(profile?.user_type === 'intervenant' || profile?.user_type === 'admin') && (
                <Button
                  variant="contained"
                  startIcon={<WorkIcon />}
                  onClick={() => navigate('/practitioner-profile')}
                  sx={{
                    background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                    color: '#1D3461',
                    fontWeight: 600,
                    '&:hover': {
                      background: 'linear-gradient(45deg, #FFA500, #FFD700)',
                    },
                  }}
                >
                  Gérer ma Fiche Intervenant
                </Button>
              )}
            </Box>
            <Box sx={{ position: 'relative', zIndex: 2 }}>
              {/* Bouton caché pour équilibrer le layout */}
              <Box sx={{ opacity: 0, pointerEvents: 'none' }}>
                <Button>Hidden</Button>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    mt: 1,
                  }}
                >
                  {email || user?.email}
                </Typography>
              </Box>
            </Box>
          </Box>
          </Box>

        <Box
          sx={{
            py: 0
          }}
        >
          <Container maxWidth="lg">

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(211, 47, 47, 0.1)',
            }}
          >
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Informations de base */}
            <Grid item xs={12} md={6}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: '16px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                  height: '100%',
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                      }}
                    >
                      <PersonIcon sx={{ color: '#1D3461', fontSize: '1.5rem' }} />
                    </Box>
                    <Typography
                      variant="h5"
                      component="h2"
                      sx={{
                        fontWeight: 700,
                        color: '#1D3461',
                      }}
                    >
                      Informations de base
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                      label="Pseudo"
                      fullWidth
                      value={pseudo}
                      onChange={(e) => setPseudo(e.target.value)}
                      required
                      placeholder="Choisissez un pseudo pour vous identifier"
                      InputProps={{
                        startAdornment: (
                          <PersonIcon sx={{ mr: 1, color: '#345995' }} />
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                          '&:hover fieldset': {
                            borderColor: '#FFD700',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#FFA500',
                          },
                        },
                      }}
                    />
                    <TextField
                      label="Email"
                      fullWidth
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      type="email"
                      InputProps={{
                        startAdornment: (
                          <EmailIcon sx={{ mr: 1, color: '#345995' }} />
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                          '&:hover fieldset': {
                            borderColor: '#FFD700',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#FFA500',
                          },
                        },
                      }}
                    />
                    <TextField
                      label="Téléphone"
                      fullWidth
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Votre numéro de téléphone"
                      InputProps={{
                        startAdornment: (
                          <PhoneIcon sx={{ mr: 1, color: '#345995' }} />
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                          '&:hover fieldset': {
                            borderColor: '#FFD700',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#FFA500',
                          },
                        },
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Informations pour la préparation des séances */}
            <Grid item xs={12} md={6}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: '16px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                  height: '100%',
                  border: '2px solid rgba(255, 215, 0, 0.2)',
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #345995, #1D3461)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                      }}
                    >
                      <CakeIcon sx={{ color: '#FFD700', fontSize: '1.5rem' }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="h5"
                        component="h2"
                        sx={{
                          fontWeight: 700,
                          color: '#1D3461',
                          mb: 0.5,
                        }}
                      >
                        Préparation des séances
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <Tooltip
                          title="Les informations suivantes sont indispensables pour préparer la séance: tous vos prénoms, le nom de famille complet, date de naissance"
                          arrow
                          placement="top"
                        >
                          <IconButton
                            size="small"
                            sx={{
                              color: '#345995',
                              '&:hover': { color: '#FFA500' },
                            }}
                          >
                            <HelpOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          title="Pour les personnes (mariées, divorcées, adoptées, ...) prendre toujours les informations de naissance"
                          arrow
                          placement="top"
                        >
                          <IconButton
                            size="small"
                            sx={{
                              color: '#345995',
                              '&:hover': { color: '#FFA500' },
                            }}
                          >
                            <HelpOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Box>

                  <Alert
                    severity="info"
                    icon={false}
                    sx={{
                      mb: 3,
                      borderRadius: '12px',
                      background: 'rgba(255, 215, 0, 0.1)',
                      border: '1px solid rgba(255, 215, 0, 0.3)',
                      '& .MuiAlert-message': {
                        fontSize: '0.875rem',
                        color: '#1D3461',
                      },
                    }}
                  >
                    Ces informations sont essentielles pour la Numérologie Stratégique®
                  </Alert>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                      label="Tous les prénoms"
                      fullWidth
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      helperText="Veuillez indiquer tous vos prénoms dans l'ordre de l'état civil"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                          '&:hover fieldset': {
                            borderColor: '#FFD700',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#FFA500',
                          },
                        },
                      }}
                    />
                    <TextField
                      label="Nom de famille complet"
                      fullWidth
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      helperText="Indiquez votre nom de famille complet tel qu'il apparaît sur vos documents officiels"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                          '&:hover fieldset': {
                            borderColor: '#FFD700',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#FFA500',
                          },
                        },
                      }}
                    />
                    <TextField
                      label="Date de naissance"
                      type="date"
                      fullWidth
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      helperText="Date de naissance officielle"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                          '&:hover fieldset': {
                            borderColor: '#FFD700',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#FFA500',
                          },
                        },
                      }}
                    />

                    {/* Statut et boutons du bénéficiaire "Moi" */}
                    <Box
                      sx={{
                        mt: 2,
                        p: 2,
                        borderRadius: '12px',
                        background: myBeneficiary
                          ? 'rgba(76, 175, 80, 0.1)'
                          : 'rgba(33, 150, 243, 0.1)',
                        border: `2px solid ${myBeneficiary ? 'rgba(76, 175, 80, 0.3)' : 'rgba(33, 150, 243, 0.3)'}`,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1D3461' }}>
                            Bénéficiaire "Moi"
                          </Typography>
                          <Chip
                            label={myBeneficiary ? 'Créé' : 'Sera créé automatiquement'}
                            size="small"
                            sx={{
                              background: myBeneficiary ? '#4CAF50' : '#2196F3',
                              color: 'white',
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                      </Box>

                      <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
                        {myBeneficiary
                          ? 'Votre profil de bénéficiaire est synchronisé avec vos informations de profil.'
                          : 'Votre profil de bénéficiaire sera créé automatiquement lors de l\'enregistrement de vos modifications.'
                        }
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => navigate('/beneficiaries')}
                          sx={{
                            borderColor: '#345995',
                            color: '#345995',
                            '&:hover': {
                              borderColor: '#FFA500',
                              background: 'rgba(255, 165, 0, 0.1)',
                            },
                          }}
                        >
                          Voir tous mes bénéficiaires
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Documents du bénéficiaire "Moi" */}
            {myBeneficiary && (
              <Grid item xs={12}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                    border: '2px solid rgba(52, 89, 149, 0.2)',
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #345995, #1D3461)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2,
                        }}
                      >
                        <PictureAsPdfIcon sx={{ color: '#FFD700', fontSize: '1.5rem' }} />
                      </Box>
                      <Typography
                        variant="h5"
                        component="h2"
                        sx={{
                          fontWeight: 700,
                          color: '#1D3461',
                        }}
                      >
                        Mes documents
                      </Typography>
                    </Box>

                    {loadingDocuments ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : documents.length > 0 ? (
                      <List>
                        {documents.map((doc) => (
                          <ListItem
                            key={doc.id}
                            sx={{
                              borderRadius: '12px',
                              mb: 1,
                              background: 'rgba(52, 89, 149, 0.05)',
                              '&:hover': {
                                background: 'rgba(52, 89, 149, 0.1)',
                                cursor: 'pointer',
                              },
                            }}
                            onClick={() => handleOpenDocument(doc)}
                          >
                            <ListItemIcon>
                              <PictureAsPdfIcon sx={{ color: '#d32f2f' }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    {doc.file_name}
                                  </Typography>
                                  <Chip
                                    label={DOCUMENT_TYPE_LABELS[doc.document_type]}
                                    size="small"
                                    sx={{
                                      background: '#345995',
                                      color: 'white',
                                      fontSize: '0.75rem',
                                    }}
                                  />
                                </Box>
                              }
                              secondary={
                                doc.description ||
                                `Ajouté le ${new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}`
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Alert
                        severity="info"
                        sx={{
                          borderRadius: '12px',
                          background: 'rgba(52, 89, 149, 0.1)',
                          border: '1px solid rgba(52, 89, 149, 0.3)',
                        }}
                      >
                        Aucun document disponible pour le moment. Vos documents seront ajoutés par vos intervenants.
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Bouton d'enregistrement */}
            <Grid item xs={12}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  mt: 2,
                }}
              >
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  startIcon={<SaveIcon />}
                  sx={{
                    px: 6,
                    py: 1.5,
                    borderRadius: '50px',
                    background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                    color: '#1D3461',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    boxShadow: '0 8px 24px rgba(255, 165, 0, 0.3)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #FFA500, #FFD700)',
                      boxShadow: '0 12px 32px rgba(255, 165, 0, 0.4)',
                      transform: 'translateY(-2px)',
                    },
                    '&:disabled': {
                      background: 'rgba(0, 0, 0, 0.12)',
                      color: 'rgba(0, 0, 0, 0.26)',
                    },
                  }}
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </Button>
              </Box>
            </Grid>

            {/* Card pour devenir intervenant (uniquement pour les clients) */}
            {profile?.user_type === 'client' && (
              <Grid item xs={12} md={6}>
                <BecomePractitionerCard />
              </Grid>
            )}
          </Grid>
        </form>
          </Container>
        </Box>
        </Container>
      </Box>

      {/* Snackbar pour le profil */}
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSuccess(false)}
          severity="success"
          sx={{
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(120, 190, 32, 0.2)',
            fontWeight: 500,
          }}
        >
          Profil mis à jour avec succès
        </Alert>
      </Snackbar>

      {/* Snackbar pour le bénéficiaire */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.severity === 'success' ? 8000 : 6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(120, 190, 32, 0.2)',
            fontWeight: 500,
            maxWidth: '500px',
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProfilePage;