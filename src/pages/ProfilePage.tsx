// src/pages/ProfilePage.tsx
import { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Container,
  Divider,
  Grid,
  Paper,
  TextField,
  Typography,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonIcon from '@mui/icons-material/Person';
import CakeIcon from '@mui/icons-material/Cake';
import SaveIcon from '@mui/icons-material/Save';

const ProfilePage = () => {
  const { user, profile, updateProfile } = useAuth();
  
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const { error } = await updateProfile({
        first_name: firstName,
        last_name: lastName,
        pseudo: pseudo,
        phone: phone || undefined,
        email: email || user?.email,
        birth_date: birthDate || undefined
      });
      
      if (error) throw error;
      
      setSuccess(true);
    } catch (error: any) {
      setError('Erreur lors de la mise à jour du profil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          py: 4,
          mt: { xs: '23px', md: '0px' },
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
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '300px',
                height: '300px',
                background: 'radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, transparent 70%)',
                transform: 'translate(30%, -30%)',
              },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2.5,
                position: 'relative',
                zIndex: 1,
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
                  <Chip
                    label={
                      profile?.user_type === 'admin' ? 'Administrateur' :
                      profile?.user_type === 'intervenant' ? 'Intervenant' : 'Client'
                    }
                    sx={{
                      background: profile?.user_type === 'admin'
                        ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                        : 'rgba(255, 255, 255, 0.2)',
                      color: profile?.user_type === 'admin' ? '#1D3461' : 'white',
                      fontWeight: 600,
                      border: profile?.user_type === 'admin'
                        ? 'none'
                        : '1px solid rgba(255, 255, 255, 0.3)',
                    }}
                  />
                </Box>
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
                  </Box>
                </CardContent>
              </Card>
            </Grid>

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
          </Grid>
        </form>
          </Container>
        </Box>
        </Container>
      </Box>

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
    </Box>
  );
};

export default ProfilePage;