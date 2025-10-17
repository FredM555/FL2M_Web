// src/pages/ContactPage.tsx
import { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  Paper, 
  Snackbar, 
  Alert, 
  CircularProgress,
  MenuItem
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SendIcon from '@mui/icons-material/Send';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

// Interface pour le formulaire de contact
interface ContactFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

// Interface pour le message
interface ContactMessage extends ContactFormData {
  createdAt: string;
  status: 'new' | 'processing' | 'responded';
}

const ContactPage = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // État initial du formulaire
  const initialFormState: ContactFormData = {
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    email: profile?.email || user?.email || '',
    phone: profile?.phone || '',
    subject: '',
    message: ''
  };
  
  const [formData, setFormData] = useState<ContactFormData>(initialFormState);
  
  // Sujets prédéfinis
  const subjects = [
    'Question générale',
    'Prise de rendez-vous',
    'Informations sur les prestations',
    'Partenariat',
    'Autre'
  ];
  
  // Gestion des changements dans le formulaire
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Envoi du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Créer le message dans la base de données
      const newMessage: Omit<ContactMessage, 'createdAt'> = {
        ...formData,
        status: 'new'
      };
      
      // Insérer le message dans la table contact_messages
      const { error: insertError } = await supabase
        .from('contact_messages')
        .insert([newMessage]);
      
      if (insertError) throw insertError;
      
      // Récupérer tous les administrateurs
      const { data: admins, error: adminsError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('user_type', 'admin');
      
      if (adminsError) throw adminsError;
      
      if (admins && admins.length > 0) {
        // Envoyer une notification à chaque admin
        // Dans une vraie implémentation, cela pourrait être fait via une fonction Supabase Edge
        console.log('Administrateurs notifiés:', admins);
      }
      
      // Afficher le message de succès
      setSuccess(true);
      
      // Réinitialiser le formulaire
      setFormData(initialFormState);
    } catch (err: any) {
      console.error('Erreur lors de l\'envoi du message:', err);
      setError(err.message || 'Une erreur est survenue lors de l\'envoi du message');
    } finally {
      setLoading(false);
    }
  };
  
  // Fermeture du message de succès
  const handleCloseSnackbar = () => {
    setSuccess(false);
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Grid container spacing={6}>
        {/* Informations de contact */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 4, height: '100%' }}>
            <Typography variant="h4" component="h1" gutterBottom color="primary">
              Contactez-nous
            </Typography>
            
            <Typography paragraph sx={{ mb: 4 }}>
              Nous sommes à votre écoute. Utilisez ce formulaire pour nous envoyer votre message ou 
              contactez-nous directement via les coordonnées ci-dessous.
            </Typography>
            
            <Box sx={{ my: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <EmailIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography>
                  <strong>Email:</strong> contact@fl2m.com
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <PhoneIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography>
                  <strong>Téléphone:</strong> +33 (0)1 23 45 67 89
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LocationOnIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography>
                  <strong>Adresse:</strong><br />
                  123 Avenue des Essences<br />
                  75001 Paris, France
                </Typography>
              </Box>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
              Nos conseillers sont disponibles du lundi au vendredi, de 9h à 18h.
              Nous nous efforçons de répondre à toutes les demandes dans un délai de 24 heures ouvrées.
            </Typography>
          </Paper>
        </Grid>
        
        {/* Formulaire de contact */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Envoyez-nous un message
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            
            <form onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="first_name"
                    label="Prénom"
                    value={formData.first_name}
                    onChange={handleChange}
                    fullWidth
                    required
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="last_name"
                    label="Nom"
                    value={formData.last_name}
                    onChange={handleChange}
                    fullWidth
                    required
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="email"
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    fullWidth
                    required
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="phone"
                    label="Téléphone"
                    value={formData.phone}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="subject"
                    label="Sujet"
                    select
                    value={formData.subject}
                    onChange={handleChange}
                    fullWidth
                    required
                    margin="normal"
                  >
                    {subjects.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="message"
                    label="Message"
                    value={formData.message}
                    onChange={handleChange}
                    fullWidth
                    required
                    multiline
                    rows={6}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="large"
                    endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                    disabled={loading}
                    sx={{ mt: 2 }}
                  >
                    {loading ? 'Envoi en cours...' : 'Envoyer le message'}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Message de succès */}
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          Votre message a été envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ContactPage;