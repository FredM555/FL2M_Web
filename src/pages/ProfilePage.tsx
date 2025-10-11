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
  Tooltip
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

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
        phone: phone || null,
        email: email || user?.email,
        birth_date: birthDate || null
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
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Box display="flex" alignItems="center" mb={4}>
          <Avatar 
            sx={{ width: 80, height: 80, mr: 3, bgcolor: 'primary.main' }}
          >
            {profile?.first_name ? profile.first_name[0] : <AccountCircleIcon fontSize="large" />}
          </Avatar>
          <div>
            <Typography variant="h4" component="h1" gutterBottom>
              {profile?.first_name ? `${profile.first_name} ${profile.last_name}` : 'Mon profil'}
            </Typography>
            <Typography variant="body1" color="textSecondary">
              {pseudo ? `@${pseudo}` : ''}
            </Typography>
            <Typography variant="body1" color="textSecondary">
              {email || user?.email}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {profile?.user_type === 'admin' ? 'Administrateur' : 
               profile?.user_type === 'intervenant' ? 'Intervenant' : 'Client'}
            </Typography>
          </div>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Divider sx={{ mb: 4 }} />

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Informations de base */}
            <Grid item xs={12}>
              <Typography variant="h6" component="h2" gutterBottom>
                Informations de base
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Pseudo"
                fullWidth
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                required
                placeholder="Choisissez un pseudo pour vous identifier"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Email"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Téléphone"
                fullWidth
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Grid>

            {/* Informations pour la préparation des séances */}
            <Grid item xs={12} sx={{ mt: 3 }}>
              <Box display="flex" alignItems="center">
                <Typography variant="h6" component="h2" gutterBottom>
                  Informations nécessaires pour la préparation des séances
                </Typography>
                <Tooltip title="Les informations suivantes sont indispensables pour préparer la séance:
                  * tous nos prénoms
                  * le nom de famille complet
                  * date de naissance" arrow>
                  <IconButton size="small" sx={{ ml: 1 }}>
                    <HelpOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="pour les femmes mariées prendre toujours les informations de naissance" arrow>
                  <IconButton size="small" sx={{ ml: 1 }}>
                    <HelpOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Tous les prénoms"
                fullWidth
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                helperText="Veuillez indiquer tous vos prénoms dans l'ordre de l'état civil"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Nom de famille complet"
                fullWidth
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                helperText="Indiquez votre nom de famille complet tel qu'il apparaît sur vos documents officiels"
              />
            </Grid>
            <Grid item xs={12}>
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
              />
            </Grid>
            
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                disabled={loading}
              >
                {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={() => setSuccess(false)}
        message="Profil mis à jour avec succès"
      />
    </Container>
  );
};

export default ProfilePage;